'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Magnet, Loader2, CheckCircle, XCircle } from 'lucide-react';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setError('No verification token provided');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify email');
        }

        setStatus('success');

        // Update the session to reflect verified status
        await update();

        // Redirect to library after 2 seconds
        setTimeout(() => {
          router.push('/library');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    };

    verifyEmail();
  }, [token, router, update]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Magnet className="h-7 w-7 text-primary-foreground" />
            </div>
          </Link>
        </div>

        <div className="mt-8 rounded-xl border bg-card p-8">
          {status === 'loading' && (
            <>
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </div>
              <h2 className="mt-6 text-center text-xl font-semibold">
                Verifying your email...
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <h2 className="mt-6 text-center text-xl font-semibold">
                Email verified!
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Your email has been verified. Redirecting you to your dashboard...
              </p>
              <div className="mt-6">
                <Link
                  href="/library"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Go to Dashboard
                </Link>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <h2 className="mt-6 text-center text-xl font-semibold">
                Verification failed
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {error}
              </p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/verification-pending"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 font-medium transition-colors hover:bg-muted"
                >
                  Request a new verification link
                </Link>
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
