import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Eye } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/utils/supabase-server';
import { ARCHETYPE_NAMES } from '@/lib/types/lead-magnet';
import { formatDate } from '@/lib/utils';

export const metadata = {
  title: 'Library | MagnetLab',
  description: 'Your lead magnet library',
};

function LibrarySkeleton() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-5"
          >
            <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mb-2 h-6 w-full animate-pulse rounded bg-muted" />
            <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function LibraryContent() {
  const session = await auth();
  const supabase = await createSupabaseServerClient();

  const { data: leadMagnets } = await supabase
    .from('lead_magnets')
    .select('id, user_id, title, archetype, concept, extracted_content, generated_content, linkedin_post, post_variations, dm_template, cta_word, thumbnail_url, leadshark_post_id, leadshark_automation_id, scheduled_time, polished_content, polished_at, status, published_at, created_at, updated_at')
    .eq('user_id', session?.user?.id)
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Library</h1>
          <p className="mt-1 text-muted-foreground">
            {leadMagnets?.length || 0} lead magnets created
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Create New
        </Link>
      </div>

      {leadMagnets && leadMagnets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leadMagnets.map((lm) => (
            <Link
              key={lm.id}
              href={`/library/${lm.id}`}
              className="group rounded-xl border bg-card p-5 transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {ARCHETYPE_NAMES[lm.archetype as keyof typeof ARCHETYPE_NAMES]}
              </div>

              <h3 className="mb-2 font-semibold group-hover:text-primary">
                {lm.title}
              </h3>

              <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    lm.status === 'published'
                      ? 'bg-green-500/10 text-green-600'
                      : lm.status === 'scheduled'
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {lm.status}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(lm.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {lm.thumbnail_url && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    Thumbnail
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">No lead magnets yet</h3>
          <p className="mb-6 text-muted-foreground">
            Create your first lead magnet to start capturing leads.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Create Your First Lead Magnet
          </Link>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <LibraryContent />
    </Suspense>
  );
}
