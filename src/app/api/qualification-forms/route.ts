// API Route: Qualification Forms
// GET /api/qualification-forms - List user's forms
// POST /api/qualification-forms - Create a new form

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import {
  qualificationFormFromRow,
  type QualificationFormRow,
} from '@/lib/types/funnel';
import { ApiErrors, logApiError } from '@/lib/api/errors';

// GET - List all qualification forms for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('qualification_forms')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logApiError('qualification-forms/list', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to fetch forms');
    }

    const forms = (data as QualificationFormRow[]).map(qualificationFormFromRow);
    return NextResponse.json({ forms });
  } catch (error) {
    logApiError('qualification-forms/list', error);
    return ApiErrors.internalError('Failed to fetch forms');
  }
}

// POST - Create a new qualification form
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return ApiErrors.validationError('name is required');
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('qualification_forms')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
      })
      .select()
      .single();

    if (error) {
      logApiError('qualification-forms/create', error, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to create form');
    }

    return NextResponse.json(
      { form: qualificationFormFromRow(data as QualificationFormRow) },
      { status: 201 }
    );
  } catch (error) {
    logApiError('qualification-forms/create', error);
    return ApiErrors.internalError('Failed to create form');
  }
}
