'use client';

/**
 * CargoBit Admin Login
 * 2-Step Authentication with TOTP (2FA)
 * 
 * Flow:
 * 1. Email + Password → Step 1
 * 2. If 2FA enabled → TOTP Code → Step 2
 * 3. Redirect to Admin Dashboard
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Lock, Loader2, KeyRound } from 'lucide-react';

type Step = 'credentials' | '2fa' | 'success';

export default function AdminLogin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Anmeldung fehlgeschlagen');
        return;
      }

      if (data.requires2fa) {
        setTempToken(data.tempToken);
        setStep('2fa');
      } else {
        // No 2FA required, proceed to success
        setStep('success');
        setTimeout(() => router.push('/admin/dashboard'), 1000);
      }
    } catch (err) {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login-step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          totpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '2FA-Code ungültig');
        return;
      }

      setStep('success');
      setTimeout(() => router.push('/admin/dashboard'), 1000);
    } catch (err) {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            {step === 'credentials' && 'Melden Sie sich mit Ihren Admin-Zugangsdaten an'}
            {step === '2fa' && 'Geben Sie Ihren 6-stelligen Authentifizierungscode ein'}
            {step === 'success' && 'Anmeldung erfolgreich!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Email + Password */}
          {step === 'credentials' && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  E-Mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@cargobit.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Passwort
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Anmelden
              </Button>
            </form>
          )}

          {/* Step 2: TOTP Code */}
          {step === '2fa' && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="totp" className="text-sm font-medium">
                  6-stelliger Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="totp"
                    type="text"
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Öffnen Sie Ihre Authenticator-App (Google Authenticator, Authy, etc.)
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Verifizieren
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('credentials');
                  setTempToken(null);
                  setError(null);
                }}
              >
                Zurück
              </Button>
            </form>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-muted-foreground">Sie werden weitergeleitet...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
