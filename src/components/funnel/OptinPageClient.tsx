'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OptinPageClientProps {
  funnelPageId: string;
  headline: string;
  subline: string | null;
  buttonText: string;
  trustText: string;
  username: string;
  slug: string;
}

export function OptinPageClient({
  funnelPageId,
  headline,
  subline,
  buttonText,
  trustText,
  username,
  slug,
}: OptinPageClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          funnelPageId,
          email,
          name: name || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      // Redirect to thank-you page with leadId
      const thanksUrl = `/p/${username}/${slug}/thanks${data.leadId ? `?leadId=${data.leadId}` : ''}`;
      router.push(thanksUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Headline */}
        <h1 className="text-2xl font-semibold text-white text-center mb-3">
          {headline}
        </h1>

        {/* Subline */}
        {subline && (
          <p className="text-zinc-400 text-center mb-8">{subline}</p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Optional name field */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg
                       text-white placeholder:text-zinc-500
                       focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                       outline-none transition-colors"
            placeholder="Your name (optional)"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg
                       text-white placeholder:text-zinc-500
                       focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                       outline-none transition-colors"
            placeholder="Enter your email"
            required
          />

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-violet-500 hover:bg-violet-600 text-white
                       font-medium rounded-lg transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : buttonText}
          </button>
        </form>

        {/* Trust text */}
        <p className="text-xs text-zinc-500 text-center mt-4">{trustText}</p>
      </div>
    </div>
  );
}
