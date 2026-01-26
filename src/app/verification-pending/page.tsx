'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Magnet, Mail, Loader2, CheckCircle, RefreshCw, LogOut } from 'lucide-react';

export default function VerificationPendingPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Magnet className="h-7 w-7 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="mt-6 text-3xl font-bold">Check your email</h1>
          <p className="mt-2 text-muted-foreground">
            We sent you a verification link
          </p>
        </div>

        <div className="mt-8 rounded-xl border bg-card p-8">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Please click the verification link in the email we sent you to access your dashboard.
            The link will expire in 24 hours.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-green-500/10 p-3 text-center text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Verification email sent! Check your inbox.
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {loading ? 'Sending...' : 'Resend verification email'}
            </button>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Wrong email?{' '}
          <button
            onClick={handleSignOut}
            className="underline hover:text-foreground"
          >
            Sign in with a different account
          </button>
        </p>
      </div>
    </div>
  );
}
