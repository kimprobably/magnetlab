// API Route: Single External Resource
// GET /api/external-resources/[id] - Get external resource
// PUT /api/external-resources/[id] - Update external resource
// DELETE /api/external-resources/[id] - Delete external resource

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { externalResourceFromRow, type ExternalResourceRow } from '@/lib/types/library';
import { ApiErrors, logApiError, isValidUUID } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    if (!isValidUUID(id)) {
      return ApiErrors.validationError('Invalid resource ID');
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('external_resources')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return ApiErrors.notFound('External resource');
    }

    return NextResponse.json({ resource: externalResourceFromRow(data as ExternalResourceRow) });
  } catch (error) {
    logApiError('external-resources/get', error);
    return ApiErrors.internalError('Failed to fetch external resource');
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    if (!isValidUUID(id)) {
      return ApiErrors.validationError('Invalid resource ID');
    }

    const body = await request.json();
    const { title, url, icon } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (icon !== undefined) updateData.icon = icon;

    // Validate URL if provided
    if (url !== undefined) {
      try {
        new URL(url);
        updateData.url = url;
      } catch {
        return ApiErrors.validationError('url must be a valid URL');
      }
    }

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validationError('No fields to update');
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('external_resources')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error || !data) {
      if (!data) return ApiErrors.notFound('External resource');
      logApiError('external-resources/update', error, { userId: session.user.id, resourceId: id });
      return ApiErrors.databaseError('Failed to update external resource');
    }

    return NextResponse.json({ resource: externalResourceFromRow(data as ExternalResourceRow) });
  } catch (error) {
    logApiError('external-resources/update', error);
    return ApiErrors.internalError('Failed to update external resource');
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    if (!isValidUUID(id)) {
      return ApiErrors.validationError('Invalid resource ID');
    }

    const supabase = createSupabaseAdminClient();

    // Verify existence first (consistent with other routes)
    const { data: existing } = await supabase
      .from('external_resources')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return ApiErrors.notFound('External resource');
    }

    const { error } = await supabase
      .from('external_resources')
      .delete()
      .eq('id', id);

    if (error) {
      logApiError('external-resources/delete', error, { userId: session.user.id, resourceId: id });
      return ApiErrors.databaseError('Failed to delete external resource');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('external-resources/delete', error);
    return ApiErrors.internalError('Failed to delete external resource');
  }
}
