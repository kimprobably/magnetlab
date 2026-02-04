// API Route: Single Library Item
// PUT /api/libraries/[id]/items/[itemId] - Update item
// DELETE /api/libraries/[id]/items/[itemId] - Remove item

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { libraryItemFromRow, type LibraryItemRow } from '@/lib/types/library';
import { ApiErrors, logApiError, isValidUUID } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// PUT - Update library item
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id: libraryId, itemId } = await params;
    if (!isValidUUID(libraryId) || !isValidUUID(itemId)) {
      return ApiErrors.validationError('Invalid ID format');
    }

    const body = await request.json();
    const { iconOverride, sortOrder, isFeatured } = body;

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

    // Verify item exists in library
    const { data: existing } = await supabase
      .from('library_items')
      .select('id')
      .eq('id', itemId)
      .eq('library_id', libraryId)
      .single();

    if (!existing) {
      return ApiErrors.notFound('Library item');
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (iconOverride !== undefined) updateData.icon_override = iconOverride;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isFeatured !== undefined) updateData.is_featured = isFeatured;

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validationError('No fields to update');
    }

    const { data, error } = await supabase
      .from('library_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      logApiError('libraries/items/update', error, { userId: session.user.id, libraryId, itemId });
      return ApiErrors.databaseError('Failed to update library item');
    }

    return NextResponse.json({ item: libraryItemFromRow(data as LibraryItemRow) });
  } catch (error) {
    logApiError('libraries/items/update', error);
    return ApiErrors.internalError('Failed to update library item');
  }
}

// DELETE - Remove item from library
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id: libraryId, itemId } = await params;
    if (!isValidUUID(libraryId) || !isValidUUID(itemId)) {
      return ApiErrors.validationError('Invalid ID format');
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

    const { error } = await supabase
      .from('library_items')
      .delete()
      .eq('id', itemId)
      .eq('library_id', libraryId);

    if (error) {
      logApiError('libraries/items/delete', error, { userId: session.user.id, libraryId, itemId });
      return ApiErrors.databaseError('Failed to remove item from library');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('libraries/items/delete', error);
    return ApiErrors.internalError('Failed to remove item from library');
  }
}
