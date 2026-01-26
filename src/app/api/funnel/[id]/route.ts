import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { slugify } from '@/lib/utils';
import type { FunnelPageRow, QualificationQuestionRow } from '@/lib/types/funnel';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/funnel/[id] - Get a single funnel page
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('funnel_pages')
      .select(
        `
        *,
        qualification_questions (*),
        lead_magnets!inner (
          id,
          title,
          archetype,
          concept
        ),
        users!inner (
          id,
          username
        )
      `
      )
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Funnel page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/funnel/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/funnel/[id] - Update a funnel page
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      slug: customSlug,
      optinHeadline,
      optinSubline,
      optinButtonText,
      optinTrustText,
      optinEnabled,
      thankyouHeadline,
      thankyouSubline,
      vslEmbedUrl,
      calendlyUrl,
      rejectionMessage,
      thankyouEnabled,
      published,
      qualificationQuestions,
    } = body;

    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: existingFunnel, error: fetchError } = await supabase
      .from('funnel_pages')
      .select('id, slug')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingFunnel) {
      return NextResponse.json(
        { error: 'Funnel page not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Partial<FunnelPageRow> = {};

    if (customSlug !== undefined) {
      const newSlug = slugify(customSlug);
      // Check if new slug is unique for this user (excluding current page)
      const { data: slugConflict } = await supabase
        .from('funnel_pages')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('slug', newSlug)
        .neq('id', id)
        .single();

      if (slugConflict) {
        return NextResponse.json(
          { error: 'This URL slug is already in use' },
          { status: 409 }
        );
      }
      updateData.slug = newSlug;
    }

    if (optinHeadline !== undefined) updateData.optin_headline = optinHeadline;
    if (optinSubline !== undefined) updateData.optin_subline = optinSubline;
    if (optinButtonText !== undefined)
      updateData.optin_button_text = optinButtonText;
    if (optinTrustText !== undefined)
      updateData.optin_trust_text = optinTrustText;
    if (optinEnabled !== undefined) updateData.optin_enabled = optinEnabled;
    if (thankyouHeadline !== undefined)
      updateData.thankyou_headline = thankyouHeadline;
    if (thankyouSubline !== undefined)
      updateData.thankyou_subline = thankyouSubline;
    if (vslEmbedUrl !== undefined) updateData.vsl_embed_url = vslEmbedUrl;
    if (calendlyUrl !== undefined) updateData.calendly_url = calendlyUrl;
    if (rejectionMessage !== undefined)
      updateData.rejection_message = rejectionMessage;
    if (thankyouEnabled !== undefined)
      updateData.thankyou_enabled = thankyouEnabled;
    if (published !== undefined) updateData.published = published;

    // Update the funnel page
    const { error: updateError } = await supabase
      .from('funnel_pages')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating funnel page:', updateError);
      return NextResponse.json(
        { error: `Failed to update funnel page: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Handle qualification questions if provided
    if (qualificationQuestions !== undefined) {
      // Delete existing questions
      await supabase
        .from('qualification_questions')
        .delete()
        .eq('funnel_page_id', id);

      // Insert new questions
      if (qualificationQuestions.length > 0) {
        const questionsData: Partial<QualificationQuestionRow>[] =
          qualificationQuestions.map(
            (
              q: {
                questionText: string;
                qualifyingAnswer: boolean;
                displayOrder: number;
              },
              index: number
            ) => ({
              funnel_page_id: id,
              question_text: q.questionText,
              qualifying_answer: q.qualifyingAnswer,
              display_order: q.displayOrder ?? index,
            })
          );

        const { error: questionsError } = await supabase
          .from('qualification_questions')
          .insert(questionsData);

        if (questionsError) {
          console.error('Error updating qualification questions:', questionsError);
        }
      }
    }

    // Fetch updated funnel page
    const { data: updatedFunnel } = await supabase
      .from('funnel_pages')
      .select(
        `
        *,
        qualification_questions (*)
      `
      )
      .eq('id', id)
      .single();

    return NextResponse.json(updatedFunnel);
  } catch (error) {
    console.error('Error in PUT /api/funnel/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/funnel/[id] - Delete a funnel page
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: existingFunnel, error: fetchError } = await supabase
      .from('funnel_pages')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingFunnel) {
      return NextResponse.json(
        { error: 'Funnel page not found' },
        { status: 404 }
      );
    }

    // Delete the funnel page (cascades to questions and leads)
    const { error: deleteError } = await supabase
      .from('funnel_pages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting funnel page:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete funnel page: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/funnel/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
