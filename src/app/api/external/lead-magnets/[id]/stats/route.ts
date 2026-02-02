// API Route: External Lead Magnet Stats
// GET /api/external/lead-magnets/[id]/stats
//
// Returns funnel performance data for a lead magnet.
// Authenticated with Bearer token (EXTERNAL_API_KEY).
// Used by gtm-system to sync performance data into magnetlab_deployments.

import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { ApiErrors, logApiError } from '@/lib/api/errors';

// ============================================
// AUTHENTICATION
// ============================================

function authenticateRequest(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  const expectedKey = process.env.EXTERNAL_API_KEY;

  if (!expectedKey) {
    logApiError('external/lead-magnets/stats/auth', new Error('EXTERNAL_API_KEY env var is not set'));
    return false;
  }

  return token === expectedKey;
}

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Step 1: Authenticate
    if (!authenticateRequest(request)) {
      return ApiErrors.unauthorized('Invalid or missing API key');
    }

    // Step 2: Extract lead magnet ID
    const { id: leadMagnetId } = await params;

    if (!leadMagnetId) {
      return ApiErrors.validationError('Lead magnet ID is required');
    }

    // Step 3: Initialize Supabase admin client
    const supabase = createSupabaseAdminClient();

    // Step 4: Verify the lead magnet exists
    const { data: leadMagnet, error: lmError } = await supabase
      .from('lead_magnets')
      .select('id, title, created_at, updated_at')
      .eq('id', leadMagnetId)
      .single();

    if (lmError || !leadMagnet) {
      return ApiErrors.notFound('Lead magnet');
    }

    // Step 5: Get the funnel page for this lead magnet
    const { data: funnelPage } = await supabase
      .from('funnel_pages')
      .select('id')
      .eq('lead_magnet_id', leadMagnetId)
      .single();

    // Step 6: Count total views from page_views table
    let views = 0;
    if (funnelPage) {
      const { count: viewCount } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('funnel_page_id', funnelPage.id);

      views = viewCount || 0;
    }

    // Step 7: Count leads from funnel_leads table
    const { count: leadCount } = await supabase
      .from('funnel_leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_magnet_id', leadMagnetId);

    const leads = leadCount || 0;

    // Step 8: Compute conversion rate
    const conversionRate = views > 0
      ? Math.round((leads / views) * 10000) / 100  // e.g. 12.34%
      : 0;

    // Step 9: Return stats
    return NextResponse.json({
      success: true,
      data: {
        leadMagnetId: leadMagnet.id,
        views,
        leads,
        conversionRate,
        createdAt: leadMagnet.created_at,
        updatedAt: leadMagnet.updated_at,
      },
    });
  } catch (error) {
    logApiError('external/lead-magnets/stats', error);
    return ApiErrors.internalError('An unexpected error occurred while fetching stats');
  }
}
