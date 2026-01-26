import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

// POST /api/leads/qualify - Submit qualification answers (public endpoint)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, funnelPageId, answers } = body;

    if (!leadId || !funnelPageId || !answers) {
      return NextResponse.json(
        { error: 'leadId, funnelPageId, and answers are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Get the funnel page and its qualification questions
    const { data: funnelPage, error: fpError } = await supabase
      .from('funnel_pages')
      .select(
        `
        id,
        published,
        calendly_url,
        rejection_message,
        qualification_questions (
          id,
          question_text,
          qualifying_answer
        )
      `
      )
      .eq('id', funnelPageId)
      .single();

    if (fpError || !funnelPage) {
      return NextResponse.json(
        { error: 'Funnel page not found' },
        { status: 404 }
      );
    }

    if (!funnelPage.published) {
      return NextResponse.json(
        { error: 'This page is not available' },
        { status: 403 }
      );
    }

    // Verify the lead exists
    const { data: existingLead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('funnel_page_id', funnelPageId)
      .single();

    if (leadError || !existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const questions = funnelPage.qualification_questions as Array<{
      id: string;
      question_text: string;
      qualifying_answer: boolean;
    }>;

    // Determine if the lead qualifies
    let qualified = true;
    if (questions && questions.length > 0) {
      for (const question of questions) {
        const answer = answers[question.id];
        if (answer !== undefined && answer !== question.qualifying_answer) {
          qualified = false;
          break;
        }
      }
    }

    // Update the lead with qualification data
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        qualified,
        qualification_answers: answers,
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead qualification:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit answers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      qualified,
      calendlyUrl: qualified ? funnelPage.calendly_url : null,
      rejectionMessage: qualified ? null : funnelPage.rejection_message,
    });
  } catch (error) {
    console.error('Error in POST /api/leads/qualify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
