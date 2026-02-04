// API Route: External Resources List and Create
// GET /api/external-resources - List all external resources
// POST /api/external-resources - Create new external resource

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { externalResourceFromRow, type ExternalResourceRow } from '@/lib/types/library';
import { ApiErrors, logApiError } from '@/lib/api/errors';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('external_resources')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logApiError('external-resources/list', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to fetch external resources');
    }

    return NextResponse.json({
      resources: (data as ExternalResourceRow[]).map(externalResourceFromRow),
    });
  } catch (error) {
    logApiError('external-resources/list', error);
    return ApiErrors.internalError('Failed to fetch external resources');
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { title, url, icon } = body;

    if (!title?.trim()) {
      return ApiErrors.validationError('title is required');
    }

    if (!url?.trim()) {
      return ApiErrors.validationError('url is required');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return ApiErrors.validationError('url must be a valid URL');
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('external_resources')
      .insert({
        user_id: session.user.id,
        title: title.trim(),
        url: url.trim(),
        icon: icon || '🔗',
      })
      .select()
      .single();

    if (error) {
      logApiError('external-resources/create', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to create external resource');
    }

    return NextResponse.json(
      { resource: externalResourceFromRow(data as ExternalResourceRow) },
      { status: 201 }
    );
  } catch (error) {
    logApiError('external-resources/create', error);
    return ApiErrors.internalError('Failed to create external resource');
  }
}
