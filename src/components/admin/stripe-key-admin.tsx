'use client';

/**
 * CargoBit Stripe Key Admin UI
 * Secure component for managing Stripe API keys
 * 
 * Security features:
 * - Password field (key not visible)
 * - credentials: "include" for auth
 * - Key cleared from state after sending
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, ArrowRight, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface KeyStatus {
  hasActiveKey: boolean;
  hasNextKey: boolean;
  activeKeyPreview: string | null;
  nextKeyPreview: string | null;
  lastRotatedAt: string | null;
}

export default function StripeKeyAdmin() {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch key status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const response = await fetch('/api/admin/stripe-key', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const saveKey = async () => {
    if (!key.trim()) {
      setMessage({ type: 'error', text: 'Bitte geben Sie einen gültigen Key ein.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/stripe-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Stripe Key erfolgreich gespeichert!' });
        setKey(''); // Clear key from state after sending
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler beim Speichern.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler. Bitte versuchen Sie es erneut.' });
    } finally {
      setLoading(false);
    }
  };

  const rotateKey = async () => {
    if (!key.trim()) {
      setMessage({ type: 'error', text: 'Bitte geben Sie einen neuen Key ein.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/stripe-key/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newKey: key }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Neuer Key als "next" gespeichert. Testen Sie ihn, dann promovieren Sie ihn.' });
        setKey('');
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler beim Rotieren.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler.' });
    } finally {
      setLoading(false);
    }
  };

  const promoteKey = async () => {
    if (!confirm('Möchten Sie den "next" Key zum aktiven Key machen? Dies ersetzt den aktuellen Key.')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/stripe-key/promote', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Key erfolgreich aktiviert! Backend nutzt jetzt den neuen Key.' });
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler beim Promoten.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Stripe Secret Key Verwaltung</CardTitle>
          </div>
          <CardDescription>
            Verwalten Sie Ihre Stripe API-Schlüssel sicher. Keys werden verschlüsselt gespeichert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          {statusLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Lade Status...</span>
            </div>
          ) : status && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground">Aktueller Status</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Active Key */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">Aktiver Key</span>
                    {status.hasActiveKey ? (
                      <Badge variant="default" className="bg-green-600">Aktiv</Badge>
                    ) : (
                      <Badge variant="destructive">Nicht gesetzt</Badge>
                    )}
                  </div>
                  {status.activeKeyPreview && (
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {status.activeKeyPreview}
                    </code>
                  )}
                </div>

                {/* Next Key */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">Next Key</span>
                    {status.hasNextKey ? (
                      <Badge variant="secondary">Bereit</Badge>
                    ) : (
                      <Badge variant="outline">Nicht gesetzt</Badge>
                    )}
                  </div>
                  {status.nextKeyPreview && (
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {status.nextKeyPreview}
                    </code>
                  )}
                </div>
              </div>

              {status.lastRotatedAt && (
                <p className="text-xs text-muted-foreground">
                  Zuletzt rotiert: {new Date(status.lastRotatedAt).toLocaleString('de-DE')}
                </p>
              )}
            </div>
          )}

          {/* Key Input */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground">Neuen Key eingeben</h3>
            
            <div className="relative">
              <Input
                type="password"
                placeholder="sk_live_... oder sk_test_..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="pr-4 font-mono"
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Der Key wird nicht angezeigt und nach dem Speichern aus dem Speicher gelöscht.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={saveKey} disabled={loading || !key.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Als aktiv speichern
              </Button>

              <Button variant="outline" onClick={rotateKey} disabled={loading || !key.trim()}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Als "next" speichern
              </Button>

              {status?.hasNextKey && (
                <Button 
                  variant="secondary" 
                  onClick={promoteKey} 
                  disabled={loading}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Next → Aktiv
                </Button>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>{message.type === 'success' ? 'Erfolg' : 'Fehler'}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Rotation Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key-Rotation ohne Downtime</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Neuen Key im Stripe Dashboard erstellen</li>
            <li>Key hier als "next" speichern (Backend akzeptiert beide Keys für Webhooks)</li>
            <li>Neuen Key in Staging/kleinen Requests testen</li>
            <li>"Next → Aktiv" klicken um den neuen Key zu aktivieren</li>
            <li>Nach Grace-Period: Alten Key in Stripe deaktivieren</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
