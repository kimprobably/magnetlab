// API Route: Single Library
// GET /api/libraries/[id] - Get library
// PUT /api/libraries/[id] - Update library
// DELETE /api/libraries/[id] - Delete library

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { libraryFromRow, type LibraryRow } from '@/lib/types/library';
import { ApiErrors, logApiError, isValidUUID } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single library
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    if (!isValidUUID(id)) {
      return ApiErrors.validationError('Invalid library ID');
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('libraries')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return ApiErrors.notFound('Library');
    }

    return NextResponse.json({ library: libraryFromRow(data as LibraryRow) });
  } catch (error) {
    logApiError('libraries/get', error);
    return ApiErrors.internalError('Failed to fetch library');
  }
}

// PUT - Update library
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    if (!isValidUUID(id)) {
      return ApiErrors.validationError('Invalid library ID');
    }

    const body = await request.json();
    const { name, description, icon, slug, autoFeatureDays } = body;

    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return ApiErrors.notFound('Library');
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (autoFeatureDays !== undefined) updateData.auto_feature_days = autoFeatureDays;

    // Handle slug change with collision check
    if (slug !== undefined) {
      const { data: slugExists } = await supabase
        .from('libraries')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (slugExists) {
        return ApiErrors.conflict('Slug already in use');
      }
      updateData.slug = slug;
    }

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validationError('No fields to update');
    }

    const { data, error } = await supabase
      .from('libraries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logApiError('libraries/update', error, { userId: session.user.id, libraryId: id });
      return ApiErrors.databaseError('Failed to update library');
    }

    return NextResponse.json({ library: libraryFromRow(data as LibraryRow) });
  } catch (error) {
    logApiError('libraries/update', error);
    return ApiErrors.internalError('Failed to update library');
  }
}

// DELETE - Delete library
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    if (!isValidUUID(id)) {
      return ApiErrors.validationError('Invalid library ID');
    }

    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('libraries')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return ApiErrors.notFound('Library');
    }

    const { error } = await supabase
      .from('libraries')
      .delete()
      .eq('id', id);

    if (error) {
      logApiError('libraries/delete', error, { userId: session.user.id, libraryId: id });
      return ApiErrors.databaseError('Failed to delete library');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('libraries/delete', error);
    return ApiErrors.internalError('Failed to delete library');
  }
}
