'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Globe, ExternalLink, Edit, Plus, Loader2, Eye, EyeOff, Users, Upload } from 'lucide-react';

interface FunnelPage {
  id: string;
  slug: string;
  optin_headline: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  lead_magnet_id: string;
  lead_magnets?: {
    title: string;
  };
}

interface User {
  username: string | null;
}

interface FunnelStats {
  [funnelId: string]: {
    total: number;
    qualified: number;
    unqualified: number;
  };
}

export default function PagesPage() {
  const [pages, setPages] = useState<FunnelPage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<FunnelStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch funnel pages
        const pagesRes = await fetch('/api/funnel/all');
        if (!pagesRes.ok) throw new Error('Failed to fetch pages');
        const pagesData = await pagesRes.json();
        setPages(pagesData.funnels || []);

        // Fetch user for username
        const userRes = await fetch('/api/user/username');
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }

        // Fetch funnel stats
        const statsRes = await fetch('/api/funnel/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats || {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pages');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Funnel Pages</h1>
          <p className="text-muted-foreground">
            Manage your opt-in and thank-you pages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pages/import"
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import Existing
          </Link>
          <Link
            href="/create"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create New
          </Link>
        </div>
      </div>

      {!user?.username && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Set a username</strong> to enable public page URLs.{' '}
            <Link href="/settings" className="underline hover:no-underline">
              Go to Settings
            </Link>
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No funnel pages yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Create a capture page to start collecting leads. Already have a lead magnet? Import it directly.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/pages/import"
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
            >
              <Upload className="h-4 w-4" />
              Import Existing
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create New
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{page.optin_headline}</h3>
                  <p className="text-sm text-muted-foreground">
                    {page.lead_magnets?.title || 'Lead Magnet'} · /{page.slug}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Lead Count */}
                {stats[page.id] && stats[page.id].total > 0 && (
                  <Link
                    href={`/leads?funnelId=${page.id}`}
                    className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800"
                  >
                    <Users className="h-3 w-3" />
                    {stats[page.id].total} leads
                  </Link>
                )}

                {page.is_published ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                    <Eye className="h-3 w-3" />
                    Published
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <EyeOff className="h-3 w-3" />
                    Draft
                  </span>
                )}

                <Link
                  href={`/library/${page.lead_magnet_id}/funnel`}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>

                {page.is_published && user?.username && (
                  <a
                    href={`/p/${user.username}/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
