'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Globe, ExternalLink, Edit, Plus, Loader2, Eye, EyeOff, Users, Upload, Library, Link2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AssetTab = 'funnels' | 'libraries' | 'external';

interface FunnelPage {
  id: string;
  slug: string;
  optin_headline: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  lead_magnet_id: string;
  target_type?: string;
  lead_magnets?: {
    title: string;
  };
}

interface LibraryItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  slug: string;
  created_at: string;
}

interface ExternalResource {
  id: string;
  title: string;
  url: string;
  icon: string;
  clickCount: number;
  createdAt: string;
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

const TAB_CONFIG = [
  { id: 'funnels' as const, label: 'Funnels', icon: Globe },
  { id: 'libraries' as const, label: 'Libraries', icon: Library },
  { id: 'external' as const, label: 'External Resources', icon: Link2 },
] as const;

function StatusBadge({ isPublished }: { isPublished: boolean }): JSX.Element {
  if (isPublished) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
        <Eye className="h-3 w-3" />
        Published
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      <EyeOff className="h-3 w-3" />
      Draft
    </span>
  );
}

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<AssetTab>('funnels');
  const [pages, setPages] = useState<FunnelPage[]>([]);
  const [libraries, setLibraries] = useState<LibraryItem[]>([]);
  const [externalResources, setExternalResources] = useState<ExternalResource[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<FunnelStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        const [pagesRes, librariesRes, resourcesRes, userRes, statsRes] = await Promise.all([
          fetch('/api/funnel/all'),
          fetch('/api/libraries'),
          fetch('/api/external-resources'),
          fetch('/api/user/username'),
          fetch('/api/funnel/stats'),
        ]);

        if (pagesRes.ok) {
          const data = await pagesRes.json();
          setPages(data.funnels || []);
        }
        if (librariesRes.ok) {
          const data = await librariesRes.json();
          setLibraries(data.libraries || []);
        }
        if (resourcesRes.ok) {
          const data = await resourcesRes.json();
          setExternalResources(data.resources || []);
        }
        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats || {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assets');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  async function handleDelete(
    id: string,
    endpoint: string,
    confirmMessage: string,
    onSuccess: () => void
  ): Promise<void> {
    if (!confirm(confirmMessage)) return;

    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) onSuccess();
    } catch {
      // Ignore errors silently
    }
  }

  function handleDeleteResource(id: string): void {
    handleDelete(
      id,
      `/api/external-resources/${id}`,
      'Are you sure you want to delete this external resource?',
      () => setExternalResources((prev) => prev.filter((r) => r.id !== id))
    );
  }

  function handleDeleteLibrary(id: string): void {
    handleDelete(
      id,
      `/api/libraries/${id}`,
      'Are you sure you want to delete this library? This will remove all items from the library.',
      () => setLibraries((prev) => prev.filter((l) => l.id !== id))
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const tabCounts: Record<AssetTab, number> = {
    funnels: pages.length,
    libraries: libraries.length,
    external: externalResources.length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assets</h1>
          <p className="text-muted-foreground">
            Manage your funnels, libraries, and external resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'funnels' && (
            <>
              <Link
                href="/assets/import"
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import
              </Link>
              <Link
                href="/create"
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create
              </Link>
            </>
          )}
          {activeTab === 'libraries' && (
            <Link
              href="/assets/libraries/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Library
            </Link>
          )}
          {activeTab === 'external' && (
            <Link
              href="/assets/external/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Resource
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs',
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {!user?.username && activeTab === 'funnels' && (
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

      {/* Funnels Tab */}
      {activeTab === 'funnels' && (
        pages.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No funnel pages yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Create a capture page to start collecting leads.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href="/assets/import"
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import
              </Link>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {pages.map((page) => {
              const pageStats = stats[page.id];
              const hasLeads = pageStats && pageStats.total > 0;

              return (
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
                    {hasLeads && (
                      <Link
                        href={`/leads?funnelId=${page.id}`}
                        className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800"
                      >
                        <Users className="h-3 w-3" />
                        {pageStats.total} leads
                      </Link>
                    )}

                    <StatusBadge isPublished={page.is_published} />

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
              );
            })}
          </div>
        )
      )}

      {/* Libraries Tab */}
      {activeTab === 'libraries' && (
        libraries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Library className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No libraries yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Create a library to organize your lead magnets and external resources into collections.
            </p>
            <Link
              href="/assets/libraries/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Library
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {libraries.map((library) => (
              <div
                key={library.id}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{library.icon}</span>
                    <div>
                      <h3 className="font-medium">{library.name}</h3>
                      <p className="text-sm text-muted-foreground">/{library.slug}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLibrary(library.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {library.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{library.description}</p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/assets/libraries/${library.id}`}
                    className="flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Manage Items
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* External Resources Tab */}
      {activeTab === 'external' && (
        externalResources.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Link2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No external resources yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Add external links to track clicks and include them in your libraries.
            </p>
            <Link
              href="/assets/external/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add External Resource
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {externalResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{resource.icon}</span>
                  <div>
                    <h3 className="font-medium">{resource.title}</h3>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary truncate block max-w-md"
                    >
                      {resource.url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                    {resource.clickCount} clicks
                  </span>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visit
                  </a>
                  <button
                    onClick={() => handleDeleteResource(resource.id)}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
