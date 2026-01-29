import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { OptinPage } from '@/components/funnel/public';
import { funnelPageSectionFromRow, type FunnelPageSectionRow } from '@/lib/types/funnel';
import type { Metadata } from 'next';

// Revalidate published pages every 5 minutes for ISR caching
export const revalidate = 300;

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const supabase = createSupabaseAdminClient();

  // Find user by username
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (!user) {
    return { title: 'Page Not Found' };
  }

  // Find funnel page
  const { data: funnel } = await supabase
    .from('funnel_pages')
    .select('optin_headline, optin_subline, lead_magnet_id')
    .eq('user_id', user.id)
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!funnel) {
    return { title: 'Page Not Found' };
  }

  return {
    title: funnel.optin_headline,
    description: funnel.optin_subline || undefined,
    openGraph: {
      title: funnel.optin_headline,
      description: funnel.optin_subline || undefined,
      type: 'website',
    },
  };
}

export default async function PublicOptinPage({ params }: PageProps) {
  const { username, slug } = await params;
  const supabase = createSupabaseAdminClient();

  // Find user by username
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .single();

  if (userError || !user) {
    notFound();
  }

  // Find published funnel page
  const { data: funnel, error: funnelError } = await supabase
    .from('funnel_pages')
    .select(`
      id,
      slug,
      optin_headline,
      optin_subline,
      optin_button_text,
      optin_social_proof,
      is_published,
      theme,
      primary_color,
      background_style,
      logo_url
    `)
    .eq('user_id', user.id)
    .eq('slug', slug)
    .single();

  if (funnelError || !funnel || !funnel.is_published) {
    notFound();
  }

  // Fetch page sections for optin
  const { data: sectionRows } = await supabase
    .from('funnel_page_sections')
    .select('*')
    .eq('funnel_page_id', funnel.id)
    .eq('page_location', 'optin')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  const sections = (sectionRows as FunnelPageSectionRow[] || []).map(funnelPageSectionFromRow);

  return (
    <OptinPage
      funnelId={funnel.id}
      headline={funnel.optin_headline}
      subline={funnel.optin_subline}
      buttonText={funnel.optin_button_text}
      socialProof={funnel.optin_social_proof}
      username={user.username}
      slug={funnel.slug}
      theme={(funnel.theme as 'dark' | 'light') || 'dark'}
      primaryColor={funnel.primary_color || '#8b5cf6'}
      backgroundStyle={(funnel.background_style as 'solid' | 'gradient' | 'pattern') || 'solid'}
      logoUrl={funnel.logo_url}
      sections={sections}
    />
  );
}
