import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { slugify } from '@/lib/utils';
import type { FunnelPageRow, QualificationQuestionRow } from '@/lib/types/funnel';

// GET /api/funnel - List all funnel pages for the current user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const leadMagnetId = searchParams.get('leadMagnetId');

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from('funnel_pages')
      .select(
        `
        *,
        lead_magnets!inner (
          id,
          title,
          archetype
        ),
        users!inner (
          id,
          username
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (leadMagnetId) {
      query = query.eq('lead_magnet_id', leadMagnetId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching funnel pages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch funnel pages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/funnel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/funnel - Create a new funnel page
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      leadMagnetId,
      slug: customSlug,
      optinHeadline,
      optinSubline,
      optinButtonText,
      optinTrustText,
      thankyouHeadline,
      thankyouSubline,
      vslEmbedUrl,
      calendlyUrl,
      rejectionMessage,
      qualificationQuestions,
    } = body;

    if (!leadMagnetId || !optinHeadline) {
      return NextResponse.json(
        { error: 'leadMagnetId and optinHeadline are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Verify the lead magnet exists and belongs to the user
    const { data: leadMagnet, error: lmError } = await supabase
      .from('lead_magnets')
      .select('id, title')
      .eq('id', leadMagnetId)
      .eq('user_id', session.user.id)
      .single();

    if (lmError || !leadMagnet) {
      return NextResponse.json(
        { error: 'Lead magnet not found or access denied' },
        { status: 404 }
      );
    }

    // Check if a funnel page already exists for this lead magnet
    const { data: existingFunnel } = await supabase
      .from('funnel_pages')
      .select('id')
      .eq('lead_magnet_id', leadMagnetId)
      .single();

    if (existingFunnel) {
      return NextResponse.json(
        { error: 'A funnel page already exists for this lead magnet' },
        { status: 409 }
      );
    }

    // Generate or validate slug
    let slug = customSlug ? slugify(customSlug) : slugify(leadMagnet.title);

    // Ensure slug is unique for this user
    const { data: existingSlug } = await supabase
      .from('funnel_pages')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      // Add a random suffix to make it unique
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create the funnel page
    const funnelPageData: Partial<FunnelPageRow> = {
      lead_magnet_id: leadMagnetId,
      user_id: session.user.id,
      slug,
      optin_headline: optinHeadline,
      optin_subline: optinSubline || null,
      optin_button_text: optinButtonText || 'Get Instant Access',
      optin_trust_text: optinTrustText || 'No spam. Unsubscribe anytime.',
      thankyou_headline: thankyouHeadline || "You're In! Check Your Email",
      thankyou_subline: thankyouSubline || null,
      vsl_embed_url: vslEmbedUrl || null,
      calendly_url: calendlyUrl || null,
      rejection_message:
        rejectionMessage ||
        'Thanks for your interest! Our 1:1 calls are best suited for established businesses. Check out our free resources to get started.',
      published: false,
    };

    const { data: funnelPage, error: createError } = await supabase
      .from('funnel_pages')
      .insert(funnelPageData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating funnel page:', createError);
      return NextResponse.json(
        { error: `Failed to create funnel page: ${createError.message}` },
        { status: 500 }
      );
    }

    // Create qualification questions if provided
    if (qualificationQuestions && qualificationQuestions.length > 0) {
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
            funnel_page_id: funnelPage.id,
            question_text: q.questionText,
            qualifying_answer: q.qualifyingAnswer,
            display_order: q.displayOrder ?? index,
          })
        );

      const { error: questionsError } = await supabase
        .from('qualification_questions')
        .insert(questionsData);

      if (questionsError) {
        console.error('Error creating qualification questions:', questionsError);
        // Don't fail the whole request, questions can be added later
      }
    }

    // Fetch the complete funnel page with relations
    const { data: completeFunnel } = await supabase
      .from('funnel_pages')
      .select(
        `
        *,
        qualification_questions (*)
      `
      )
      .eq('id', funnelPage.id)
      .single();

    return NextResponse.json(completeFunnel, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/funnel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
