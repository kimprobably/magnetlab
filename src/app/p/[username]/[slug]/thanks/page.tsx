import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { ThankYouPageClient } from '@/components/funnel/ThankYouPageClient';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
  searchParams: Promise<{
    leadId?: string;
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

  // Get the funnel page with qualification questions
  const { data: funnelPage } = await supabase
    .from('funnel_pages')
    .select(
      `
      id,
      slug,
      thankyou_headline,
      thankyou_subline,
      vsl_embed_url,
      calendly_url,
      rejection_message,
      thankyou_enabled,
      published,
      qualification_questions (
        id,
        question_text,
        qualifying_answer,
        display_order
      ),
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

  if (!funnelPage || !funnelPage.thankyou_enabled) return null;

  // Sort questions by display_order
  const questions = (
    funnelPage.qualification_questions as Array<{
      id: string;
      question_text: string;
      qualifying_answer: boolean;
      display_order: number;
    }>
  ).sort((a, b) => a.display_order - b.display_order);

  return {
    ...funnelPage,
    qualification_questions: questions,
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
    title: funnelPage.thankyou_headline,
    description: funnelPage.thankyou_subline || undefined,
    openGraph: {
      title: funnelPage.thankyou_headline,
      description: funnelPage.thankyou_subline || undefined,
      type: 'website',
    },
  };
}

export default async function ThankYouPage({ params, searchParams }: PageProps) {
  const { username, slug } = await params;
  const { leadId } = await searchParams;
  const funnelPage = await getFunnelPage(username, slug);

  if (!funnelPage) {
    notFound();
  }

  return (
    <ThankYouPageClient
      funnelPageId={funnelPage.id}
      leadId={leadId}
      headline={funnelPage.thankyou_headline}
      subline={funnelPage.thankyou_subline}
      vslEmbedUrl={funnelPage.vsl_embed_url}
      calendlyUrl={funnelPage.calendly_url}
      rejectionMessage={funnelPage.rejection_message}
      qualificationQuestions={funnelPage.qualification_questions}
    />
  );
}
