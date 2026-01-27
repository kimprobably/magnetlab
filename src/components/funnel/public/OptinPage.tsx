'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface OptinPageProps {
  funnelId: string;
  headline: string;
  subline: string | null;
  buttonText: string;
  socialProof: string | null;
  username: string;
  slug: string;
  theme?: 'dark' | 'light';
  primaryColor?: string;
  backgroundStyle?: 'solid' | 'gradient' | 'pattern';
  logoUrl?: string | null;
}

export function OptinPage({
  funnelId,
  headline,
  subline,
  buttonText,
  socialProof,
  username,
  slug,
  theme = 'dark',
  primaryColor = '#8b5cf6',
  backgroundStyle = 'solid',
  logoUrl,
}: OptinPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme-based colors
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#09090B' : '#FAFAFA';
  const textColor = isDark ? '#FAFAFA' : '#09090B';
  const mutedColor = isDark ? '#A1A1AA' : '#71717A';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';
  const inputBg = isDark ? '#09090B' : '#FFFFFF';
  const placeholderColor = isDark ? '#71717A' : '#A1A1AA';

  // Background style
  const getBackgroundStyle = () => {
    if (backgroundStyle === 'gradient') {
      return isDark
        ? `linear-gradient(135deg, ${bgColor} 0%, #18181B 50%, ${bgColor} 100%)`
        : `linear-gradient(135deg, ${bgColor} 0%, #FFFFFF 50%, ${bgColor} 100%)`;
    }
    if (backgroundStyle === 'pattern') {
      return isDark
        ? `radial-gradient(circle at 50% 50%, ${primaryColor}15 0%, transparent 50%), ${bgColor}`
        : `radial-gradient(circle at 50% 50%, ${primaryColor}15 0%, transparent 50%), ${bgColor}`;
    }
    return bgColor;
  };

  // Track page view on mount
  useEffect(() => {
    fetch('/api/public/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnelPageId: funnelId }),
    }).catch(() => {
      // Ignore tracking errors
    });
  }, [funnelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/public/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funnelPageId: funnelId,
          email,
          utmSource: searchParams.get('utm_source') || undefined,
          utmMedium: searchParams.get('utm_medium') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }

      const { leadId } = await response.json();

      // Redirect to thank-you page
      router.push(`/p/${username}/${slug}/thankyou?leadId=${leadId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: getBackgroundStyle() }}
    >
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-12 w-auto mx-auto"
          />
        )}

        {/* Headline */}
        <h1
          className="text-3xl md:text-4xl font-semibold leading-tight"
          style={{ color: textColor }}
        >
          {headline}
        </h1>

        {/* Subline */}
        {subline && (
          <p
            className="text-lg leading-relaxed"
            style={{ color: mutedColor }}
          >
            {subline}
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email..."
            required
            className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
            style={{
              background: inputBg,
              border: `1px solid ${borderColor}`,
              color: textColor,
            }}
          />

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !email}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors hover:opacity-90"
            style={{ background: primaryColor }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {buttonText}
          </button>
        </form>

        {/* Social Proof */}
        {socialProof && (
          <p
            className="text-sm"
            style={{ color: placeholderColor }}
          >
            {socialProof}
          </p>
        )}
      </div>

      {/* Powered by */}
      <div className="mt-12">
        <a
          href="https://magnetlab.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs transition-colors hover:opacity-80"
          style={{ color: placeholderColor }}
        >
          Powered by MagnetLab
        </a>
      </div>
    </div>
  );
}
