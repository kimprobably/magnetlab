import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { OptinPageClient } from '@/components/funnel/OptinPageClient';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

async function getFunnelPage(username: string, slug: string) {
  const supabase = createSupabaseAdminClient();

  // Get the user by username
  const { data: user } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .single();

  if (!user) return null;

  // Get the funnel page
  const { data: funnelPage } = await supabase
    .from('funnel_pages')
    .select(
      `
      id,
      slug,
      optin_headline,
      optin_subline,
      optin_button_text,
      optin_trust_text,
      optin_enabled,
      published,
      lead_magnets!inner (
        id,
        title
      )
    `
    )
    .eq('user_id', user.id)
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (!funnelPage || !funnelPage.optin_enabled) return null;

  return {
    ...funnelPage,
    username: user.username,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const funnelPage = await getFunnelPage(username, slug);

  if (!funnelPage) {
    return {
      title: 'Page Not Found',
    };
  }

  return {
    title: funnelPage.optin_headline,
    description: funnelPage.optin_subline || undefined,
    openGraph: {
      title: funnelPage.optin_headline,
      description: funnelPage.optin_subline || undefined,
      type: 'website',
    },
  };
}

export default async function OptinPage({ params }: PageProps) {
  const { username, slug } = await params;
  const funnelPage = await getFunnelPage(username, slug);

  if (!funnelPage) {
    notFound();
  }

  return (
    <OptinPageClient
      funnelPageId={funnelPage.id}
      headline={funnelPage.optin_headline}
      subline={funnelPage.optin_subline}
      buttonText={funnelPage.optin_button_text}
      trustText={funnelPage.optin_trust_text}
      username={funnelPage.username}
      slug={funnelPage.slug}
    />
  );
}
