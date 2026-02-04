// API Route: Track External Resource Clicks
// POST /api/public/resource-click - Log a click on an external resource

import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { logApiError, isValidUUID } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resourceId, funnelPageId, leadId } = body;

    if (!resourceId || !isValidUUID(resourceId)) {
      return NextResponse.json({ error: 'Invalid resourceId' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Insert click record
    const insertData: Record<string, string | null> = {
      external_resource_id: resourceId,
      funnel_page_id: funnelPageId && isValidUUID(funnelPageId) ? funnelPageId : null,
    };

    // Optionally link to library if we can determine it
    if (funnelPageId && isValidUUID(funnelPageId)) {
      const { data: funnel } = await supabase
        .from('funnel_pages')
        .select('library_id')
        .eq('id', funnelPageId)
        .single();

      if (funnel?.library_id) {
        insertData.library_id = funnel.library_id;
      }
    }

    const { error } = await supabase.from('external_resource_clicks').insert(insertData);

    if (error) {
      logApiError('public/resource-click', error, { resourceId, funnelPageId });
      // Don't return error - this is analytics, fail silently
    }

    // Note: click_count on external_resources is computed from external_resource_clicks table
    // The insert above is sufficient for tracking

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('public/resource-click', error);
    // Return success anyway - don't block user navigation
    return NextResponse.json({ success: true });
  }
}
