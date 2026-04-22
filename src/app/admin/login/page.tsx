'use client';

/**
 * CargoBit Admin Login Page
 * 
 * Two-step login with optional 2FA:
 * 1. Email + Password → Check if 2FA required
 * 2. If 2FA enabled → Enter 2FA code
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LoginStep = 'credentials' | '2fa' | 'success';

export default function AdminLoginPage() {
  const router = useRouter();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  
  // UI state
  const [step, setStep] = useState<LoginStep>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle step 1: Email + Password
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const res = await fetch('/api/admin/auth/login-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Anmeldung fehlgeschlagen');
        return;
      }
      
      if (data.requires2fa) {
        setStep('2fa');
      } else {
        // No 2FA required - login directly
        await handleFinalLogin();
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle step 2: 2FA Code
  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const res = await fetch('/api/admin/auth/login-step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Ungültiger 2FA-Code');
        return;
      }
      
      // Success - redirect to dashboard
      setStep('success');
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 1000);
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle login without 2FA (fallback)
  const handleFinalLogin = async () => {
    const res = await fetch('/api/admin/auth/login-step2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: '' }),
    });
    
    if (res.ok) {
      setStep('success');
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 1000);
    } else {
      setError('Anmeldung fehlgeschlagen');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CargoBit</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Admin Portal</p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {/* Success State */}
          {step === 'success' ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Anmeldung erfolgreich!</h2>
              <p className="text-gray-500 mt-2">Weiterleitung zum Dashboard...</p>
            </div>
          ) : null}
          
          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit}>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Admin-Anmeldung
              </h2>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-Mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="admin@cargobit.eu"
                    required
                    autoFocus
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Passwort
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wird überprüft...' : 'Anmelden'}
                </button>
              </div>
            </form>
          )}
          
          {/* Step 2: 2FA */}
          {step === '2fa' && (
            <form onSubmit={handle2faSubmit}>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setError(null);
                }}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
              
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                2-Faktor-Authentifizierung
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
              </p>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    6-stelliger Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wird überprüft...' : 'Bestätigen'}
                </button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                Oder verwenden Sie einen Backup-Code
              </p>
            </form>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Geschützt durch 2-Faktor-Authentifizierung</p>
          <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Zurück zur Hauptseite
          </Link>
        </div>
      </div>
    </div>
  );
}
