// API Route: Update User Username
// PUT /api/user/username

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { ApiErrors, logApiError } from '@/lib/api/errors';

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string') {
      return ApiErrors.validationError('Username is required');
    }

    // Validate username format
    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      return ApiErrors.validationError('Username must be 3-30 characters, lowercase letters, numbers, hyphens, and underscores only');
    }

    const supabase = createSupabaseAdminClient();

    // Check if username is already taken by another user
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', session.user.id)
      .single();

    if (existing) {
      return ApiErrors.validationError('Username is already taken');
    }

    // Update username
    const { data, error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', session.user.id)
      .select('username')
      .single();

    if (error) {
      logApiError('user/username/update', error, { userId: session.user.id });

      // Check for constraint violations
      if (error.code === '23514') {
        // Check constraint violation
        if (error.message.includes('check_username_not_reserved')) {
          return ApiErrors.validationError('This username is reserved and cannot be used');
        }
        if (error.message.includes('check_username_format')) {
          return ApiErrors.validationError('Invalid username format');
        }
      }

      return ApiErrors.databaseError('Failed to update username');
    }

    return NextResponse.json({ username: data.username });
  } catch (error) {
    logApiError('user/username/update', error);
    return ApiErrors.internalError('Failed to update username');
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('id', session.user.id)
      .single();

    if (error) {
      logApiError('user/username/get', error);
      return ApiErrors.databaseError('Failed to fetch username');
    }

    return NextResponse.json({ username: data.username });
  } catch (error) {
    logApiError('user/username/get', error);
    return ApiErrors.internalError('Failed to fetch username');
  }
}
