// API Route: Libraries List and Create
// GET /api/libraries - List all libraries
// POST /api/libraries - Create new library

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { libraryFromRow, type LibraryRow } from '@/lib/types/library';
import { ApiErrors, logApiError } from '@/lib/api/errors';

// GET - List all libraries for current user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('libraries')
      .select('id, user_id, name, description, icon, slug, auto_feature_days, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logApiError('libraries/list', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to fetch libraries');
    }

    const libraries = (data as LibraryRow[]).map(libraryFromRow);

    const response = NextResponse.json({ libraries });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    logApiError('libraries/list', error);
    return ApiErrors.internalError('Failed to fetch libraries');
  }
}

// POST - Create a new library
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { name, description, icon, slug: requestedSlug, autoFeatureDays } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validationError('name is required');
    }

    const supabase = createSupabaseAdminClient();

    // Generate slug from name if not provided
    const baseSlug = requestedSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let finalSlug = baseSlug;

    // Check for slug collision and auto-increment if needed (max 100 attempts)
    for (let attempt = 0; attempt < 100; attempt++) {
      const { data: slugExists } = await supabase
        .from('libraries')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('slug', finalSlug)
        .single();

      if (!slugExists) break;

      finalSlug = `${baseSlug}-${attempt + 1}`;

      if (attempt === 99) {
        return ApiErrors.conflict('Unable to generate unique slug');
      }
    }

    const insertData = {
      user_id: session.user.id,
      name: name.trim(),
      description: description || null,
      icon: icon || '📚',
      slug: finalSlug,
      auto_feature_days: autoFeatureDays || 14,
    };

    const { data, error } = await supabase
      .from('libraries')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logApiError('libraries/create', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to create library');
    }

    return NextResponse.json(
      { library: libraryFromRow(data as LibraryRow) },
      { status: 201 }
    );
  } catch (error) {
    logApiError('libraries/create', error);
    return ApiErrors.internalError('Failed to create library');
  }
}
