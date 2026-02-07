// API Route: Single Qualification Form
// GET, PUT, DELETE /api/qualification-forms/[formId]

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import {
  qualificationFormFromRow,
  type QualificationFormRow,
} from '@/lib/types/funnel';
import { ApiErrors, logApiError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ formId: string }>;
}

// GET - Get a single form
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { formId } = await params;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('qualification_forms')
      .select('id, user_id, name, created_at, updated_at')
      .eq('id', formId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return ApiErrors.notFound('Qualification form');
    }

    return NextResponse.json({ form: qualificationFormFromRow(data as QualificationFormRow) });
  } catch (error) {
    logApiError('qualification-forms/get', error);
    return ApiErrors.internalError('Failed to get form');
  }
}

// PUT - Update a form
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { formId } = await params;
    const body = await request.json();
    const supabase = createSupabaseAdminClient();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return ApiErrors.validationError('name must be a non-empty string');
      }
      updateData.name = body.name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validationError('No valid fields to update');
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('qualification_forms')
      .update(updateData)
      .eq('id', formId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      logApiError('qualification-forms/update', error, { formId });
      return ApiErrors.databaseError('Failed to update form');
    }

    if (!data) {
      return ApiErrors.notFound('Qualification form');
    }

    return NextResponse.json({ form: qualificationFormFromRow(data as QualificationFormRow) });
  } catch (error) {
    logApiError('qualification-forms/update', error);
    return ApiErrors.internalError('Failed to update form');
  }
}

// DELETE - Delete a form (cascades questions; funnels get SET NULL)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { formId } = await params;
    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: form, error: findError } = await supabase
      .from('qualification_forms')
      .select('id')
      .eq('id', formId)
      .eq('user_id', session.user.id)
      .single();

    if (findError || !form) {
      return ApiErrors.notFound('Qualification form');
    }

    const { error } = await supabase
      .from('qualification_forms')
      .delete()
      .eq('id', formId)
      .eq('user_id', session.user.id);

    if (error) {
      logApiError('qualification-forms/delete', error, { formId });
      return ApiErrors.databaseError('Failed to delete form');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('qualification-forms/delete', error);
    return ApiErrors.internalError('Failed to delete form');
  }
}
