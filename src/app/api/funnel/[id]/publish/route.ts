// API Route: Publish/Unpublish Funnel Page
// POST /api/funnel/[id]/publish

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { funnelPageFromRow, type FunnelPageRow } from '@/lib/types/funnel';
import { ApiErrors, logApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Toggle publish status
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { publish } = body;

    if (typeof publish !== 'boolean') {
      return ApiErrors.validationError('publish must be a boolean');
    }

    const supabase = createSupabaseAdminClient();

    // Get current funnel page
    const { data: funnel, error: fetchError } = await supabase
      .from('funnel_pages')
      .select('*, lead_magnets!inner(id)')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !funnel) {
      return ApiErrors.notFound('Funnel page');
    }

    // Check if user has username set (required for publishing)
    if (publish) {
      const { data: user } = await supabase
        .from('users')
        .select('username')
        .eq('id', session.user.id)
        .single();

      if (!user?.username) {
        return ApiErrors.validationError('You must set a username before publishing. Go to Settings to set your username.');
      }

      // Validate funnel has required fields
      if (!funnel.optin_headline) {
        return ApiErrors.validationError('Opt-in headline is required before publishing');
      }
    }

    // Update publish status
    const updateData: Record<string, unknown> = {
      is_published: publish,
    };

    if (publish && !funnel.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('funnel_pages')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      logApiError('funnel/publish', error, { userId: session.user.id, funnelId: id });
      return ApiErrors.databaseError('Failed to update publish status');
    }

    // Get username for URL
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('id', session.user.id)
      .single();

    const publicUrl = publish && user?.username
      ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${user.username}/${funnel.slug}`
      : null;

    return NextResponse.json({
      funnel: funnelPageFromRow(data as FunnelPageRow),
      publicUrl,
    });
  } catch (error) {
    logApiError('funnel/publish', error);
    return ApiErrors.internalError('Failed to update publish status');
  }
}
