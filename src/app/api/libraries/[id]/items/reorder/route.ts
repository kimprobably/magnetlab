// API Route: Reorder Library Items
// POST /api/libraries/[id]/items/reorder - Batch update sort orders

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { ApiErrors, logApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id: libraryId } = await params;
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return ApiErrors.validationError('items array is required');
    }

    const supabase = createSupabaseAdminClient();

    // Verify library ownership
    const { data: library } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', libraryId)
      .eq('user_id', session.user.id)
      .single();

    if (!library) {
      return ApiErrors.notFound('Library');
    }

    // Update each item's sort_order
    const updates = items.map((item: { id: string; sortOrder: number }) =>
      supabase
        .from('library_items')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id)
        .eq('library_id', libraryId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      logApiError('libraries/items/reorder', errors[0].error, { userId: session.user.id, libraryId });
      return ApiErrors.databaseError('Failed to reorder some items');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('libraries/items/reorder', error);
    return ApiErrors.internalError('Failed to reorder items');
  }
}
