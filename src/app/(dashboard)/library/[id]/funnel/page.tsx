import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/utils/supabase-server';
import { FunnelEditor } from '@/components/funnel/FunnelEditor';
import {
  funnelPageFromRow,
  qualificationQuestionFromRow,
  type FunnelPageRow,
  type QualificationQuestionRow,
} from '@/lib/types/funnel';

export const metadata: Metadata = {
  title: 'Funnel Editor | MagnetLab',
  description: 'Create and edit your opt-in and thank-you pages',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FunnelEditorPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { id: leadMagnetId } = await params;
  const supabase = await createSupabaseServerClient();

  // Get the lead magnet
  const { data: leadMagnet, error: lmError } = await supabase
    .from('lead_magnets')
    .select('id, title')
    .eq('id', leadMagnetId)
    .eq('user_id', session.user.id)
    .single();

  if (lmError || !leadMagnet) {
    notFound();
  }

  // Get the user's username
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', session.user.id)
    .single();

  const username = user?.username || 'user';

  // Check if a funnel page already exists for this lead magnet
  const { data: existingFunnel } = await supabase
    .from('funnel_pages')
    .select(
      `
      *,
      qualification_questions (*)
    `
    )
    .eq('lead_magnet_id', leadMagnetId)
    .eq('user_id', session.user.id)
    .single();

  // Convert row data to interface format if exists
  let initialData = undefined;
  if (existingFunnel) {
    const funnel = funnelPageFromRow(existingFunnel as FunnelPageRow);
    const questions = (
      existingFunnel.qualification_questions as QualificationQuestionRow[]
    )
      .map(qualificationQuestionFromRow)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    initialData = {
      id: funnel.id,
      slug: funnel.slug,
      optinHeadline: funnel.optinHeadline,
      optinSubline: funnel.optinSubline,
      optinButtonText: funnel.optinButtonText,
      optinTrustText: funnel.optinTrustText,
      thankyouHeadline: funnel.thankyouHeadline,
      thankyouSubline: funnel.thankyouSubline,
      vslEmbedUrl: funnel.vslEmbedUrl,
      calendlyUrl: funnel.calendlyUrl,
      rejectionMessage: funnel.rejectionMessage,
      published: funnel.published,
      qualificationQuestions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        qualifyingAnswer: q.qualifyingAnswer,
        displayOrder: q.displayOrder,
      })),
    };
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <FunnelEditor
        leadMagnetId={leadMagnetId}
        leadMagnetTitle={leadMagnet.title}
        username={username}
        initialData={initialData}
      />
    </div>
  );
}
