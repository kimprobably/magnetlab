// API Route: Single Form Question
// PUT, DELETE /api/qualification-forms/[formId]/questions/[qid]

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import {
  qualificationQuestionFromRow,
  type QualificationQuestionRow,
  type AnswerType,
} from '@/lib/types/funnel';
import { ApiErrors, logApiError } from '@/lib/api/errors';

const VALID_ANSWER_TYPES: AnswerType[] = ['yes_no', 'text', 'textarea', 'multiple_choice'];

interface RouteParams {
  params: Promise<{ formId: string; qid: string }>;
}

// PUT - Update a question
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { formId, qid } = await params;
    const body = await request.json();
    const supabase = createSupabaseAdminClient();

    // Verify form ownership
    const { data: form, error: formError } = await supabase
      .from('qualification_forms')
      .select('id')
      .eq('id', formId)
      .eq('user_id', session.user.id)
      .single();

    if (formError || !form) {
      return ApiErrors.notFound('Qualification form');
    }

    const updateData: Record<string, unknown> = {};

    if (body.questionText !== undefined) {
      updateData.question_text = body.questionText;
    }
    if (body.questionOrder !== undefined) {
      updateData.question_order = body.questionOrder;
    }
    if (body.answerType !== undefined) {
      if (!VALID_ANSWER_TYPES.includes(body.answerType)) {
        return ApiErrors.validationError('answerType must be one of: yes_no, text, textarea, multiple_choice');
      }
      updateData.answer_type = body.answerType;
    }
    if (body.qualifyingAnswer !== undefined) {
      updateData.qualifying_answer = body.qualifyingAnswer;
    }
    if (body.options !== undefined) {
      updateData.options = body.options;
    }
    if (body.placeholder !== undefined) {
      updateData.placeholder = body.placeholder;
    }
    if (body.isQualifying !== undefined) {
      updateData.is_qualifying = body.isQualifying;
    }
    if (body.isRequired !== undefined) {
      updateData.is_required = body.isRequired;
    }

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validationError('No valid fields to update');
    }

    const { data, error } = await supabase
      .from('qualification_questions')
      .update(updateData)
      .eq('id', qid)
      .eq('form_id', formId)
      .select()
      .single();

    if (error) {
      logApiError('qualification-forms/questions/update', error, { formId, questionId: qid });
      return ApiErrors.databaseError('Failed to update question');
    }

    if (!data) {
      return ApiErrors.notFound('Question');
    }

    return NextResponse.json({ question: qualificationQuestionFromRow(data as QualificationQuestionRow) });
  } catch (error) {
    logApiError('qualification-forms/questions/update', error);
    return ApiErrors.internalError('Failed to update question');
  }
}

// DELETE - Delete a question
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { formId, qid } = await params;
    const supabase = createSupabaseAdminClient();

    // Verify form ownership
    const { data: form, error: formError } = await supabase
      .from('qualification_forms')
      .select('id')
      .eq('id', formId)
      .eq('user_id', session.user.id)
      .single();

    if (formError || !form) {
      return ApiErrors.notFound('Qualification form');
    }

    const { error } = await supabase
      .from('qualification_questions')
      .delete()
      .eq('id', qid)
      .eq('form_id', formId);

    if (error) {
      logApiError('qualification-forms/questions/delete', error, { formId, questionId: qid });
      return ApiErrors.databaseError('Failed to delete question');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('qualification-forms/questions/delete', error);
    return ApiErrors.internalError('Failed to delete question');
  }
}
