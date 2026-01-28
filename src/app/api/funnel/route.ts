// API Route: Funnel Pages List and Create
// GET /api/funnel?leadMagnetId=xxx - Get funnel for lead magnet
// POST /api/funnel - Create new funnel page

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { funnelPageFromRow, type FunnelPageRow } from '@/lib/types/funnel';
import { ApiErrors, logApiError } from '@/lib/api/errors';

// GET - Get funnel page for a lead magnet
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const leadMagnetId = searchParams.get('leadMagnetId');

    if (!leadMagnetId) {
      return ApiErrors.validationError('leadMagnetId is required');
    }

    const supabase = createSupabaseAdminClient();

    // Verify lead magnet ownership
    const { data: leadMagnet, error: lmError } = await supabase
      .from('lead_magnets')
      .select('id')
      .eq('id', leadMagnetId)
      .eq('user_id', session.user.id)
      .single();

    if (lmError || !leadMagnet) {
      return ApiErrors.notFound('Lead magnet');
    }

    // Get funnel page
    const { data, error } = await supabase
      .from('funnel_pages')
      .select('*')
      .eq('lead_magnet_id', leadMagnetId)
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      logApiError('funnel/get', error, { userId: session.user.id, leadMagnetId });
      return ApiErrors.databaseError('Failed to fetch funnel page');
    }

    if (!data) {
      return NextResponse.json({ funnel: null });
    }

    return NextResponse.json({ funnel: funnelPageFromRow(data as FunnelPageRow) });
  } catch (error) {
    logApiError('funnel/get', error);
    return ApiErrors.internalError('Failed to fetch funnel page');
  }
}

// POST - Create a new funnel page
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { leadMagnetId, slug, ...funnelData } = body;

    if (!leadMagnetId || !slug) {
      return ApiErrors.validationError('leadMagnetId and slug are required');
    }

    const supabase = createSupabaseAdminClient();

    // Verify lead magnet ownership
    const { data: leadMagnet, error: lmError } = await supabase
      .from('lead_magnets')
      .select('id, title')
      .eq('id', leadMagnetId)
      .eq('user_id', session.user.id)
      .single();

    if (lmError || !leadMagnet) {
      return ApiErrors.notFound('Lead magnet');
    }

    // Check if funnel already exists for this lead magnet
    const { data: existing } = await supabase
      .from('funnel_pages')
      .select('id')
      .eq('lead_magnet_id', leadMagnetId)
      .single();

    if (existing) {
      return ApiErrors.conflict('Funnel page already exists for this lead magnet');
    }

    // Check for slug collision and auto-increment if needed
    let finalSlug = slug;
    let slugSuffix = 0;

    while (true) {
      const { data: slugExists } = await supabase
        .from('funnel_pages')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('slug', finalSlug)
        .single();

      if (!slugExists) break;

      slugSuffix++;
      finalSlug = `${slug}-${slugSuffix}`;
    }

    // Create funnel page
    const { data, error } = await supabase
      .from('funnel_pages')
      .insert({
        lead_magnet_id: leadMagnetId,
        user_id: session.user.id,
        slug: finalSlug,
        optin_headline: funnelData.optinHeadline || leadMagnet.title,
        optin_subline: funnelData.optinSubline || null,
        optin_button_text: funnelData.optinButtonText || 'Get Free Access',
        optin_social_proof: funnelData.optinSocialProof || null,
        thankyou_headline: funnelData.thankyouHeadline || 'Thanks! Check your email.',
        thankyou_subline: funnelData.thankyouSubline || null,
        vsl_url: funnelData.vslUrl || null,
        calendly_url: funnelData.calendlyUrl || null,
        qualification_pass_message: funnelData.qualificationPassMessage || 'Great! Book a call below.',
        qualification_fail_message: funnelData.qualificationFailMessage || 'Thanks for your interest!',
        theme: funnelData.theme || 'dark',
        primary_color: funnelData.primaryColor || '#8b5cf6',
        background_style: funnelData.backgroundStyle || 'solid',
        logo_url: funnelData.logoUrl || null,
      })
      .select()
      .single();

    if (error) {
      logApiError('funnel/create', error, { userId: session.user.id, leadMagnetId });
      if (error.code === '23505') {
        return ApiErrors.conflict('A funnel with this slug already exists');
      }
      return ApiErrors.databaseError('Failed to create funnel page');
    }

    return NextResponse.json(
      { funnel: funnelPageFromRow(data as FunnelPageRow) },
      { status: 201 }
    );
  } catch (error) {
    logApiError('funnel/create', error);
    return ApiErrors.internalError('Failed to create funnel page');
  }
}
