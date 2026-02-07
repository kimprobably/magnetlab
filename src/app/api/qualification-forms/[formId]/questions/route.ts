// API Route: Form Questions
// GET, POST, PATCH /api/qualification-forms/[formId]/questions

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
  params: Promise<{ formId: string }>;
}

// GET - List all questions for a form
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { formId } = await params;
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

    const { data, error } = await supabase
      .from('qualification_questions')
      .select('id, funnel_page_id, form_id, question_text, question_order, answer_type, qualifying_answer, options, placeholder, is_qualifying, is_required, created_at')
      .eq('form_id', formId)
      .order('question_order', { ascending: true });

    if (error) {
      logApiError('qualification-forms/questions/list', error, { formId });
      return ApiErrors.databaseError('Failed to fetch questions');
    }

    const questions = (data as QualificationQuestionRow[]).map(qualificationQuestionFromRow);
    return NextResponse.json({ questions });
  } catch (error) {
    logApiError('qualification-forms/questions/list', error);
    return ApiErrors.internalError('Failed to fetch questions');
  }
}

// POST - Create a new question on a form
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { formId } = await params;
    const body = await request.json();
    const supabase = createSupabaseAdminClient();

    if (!body.questionText) {
      return ApiErrors.validationError('questionText is required');
    }

    const answerType: AnswerType = body.answerType || 'yes_no';
    if (!VALID_ANSWER_TYPES.includes(answerType)) {
      return ApiErrors.validationError('answerType must be one of: yes_no, text, textarea, multiple_choice');
    }

    if (answerType === 'multiple_choice') {
      if (!body.options || !Array.isArray(body.options) || body.options.length < 2) {
        return ApiErrors.validationError('multiple_choice questions require at least 2 options');
      }
    }

    const isQualifying = body.isQualifying ?? (answerType === 'yes_no');
    let qualifyingAnswer = null;

    if (isQualifying) {
      if (answerType === 'yes_no') {
        qualifyingAnswer = body.qualifyingAnswer || 'yes';
        if (qualifyingAnswer !== 'yes' && qualifyingAnswer !== 'no') {
          return ApiErrors.validationError('qualifyingAnswer must be "yes" or "no" for yes_no questions');
        }
      } else if (answerType === 'multiple_choice') {
        qualifyingAnswer = body.qualifyingAnswer || null;
        if (qualifyingAnswer && !Array.isArray(qualifyingAnswer)) {
          return ApiErrors.validationError('qualifyingAnswer must be an array for multiple_choice questions');
        }
      }
    }

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

    // Get max order for this form
    const { data: maxOrderResult } = await supabase
      .from('qualification_questions')
      .select('question_order')
      .eq('form_id', formId)
      .order('question_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = body.questionOrder ?? ((maxOrderResult?.question_order ?? -1) + 1);

    const { data, error } = await supabase
      .from('qualification_questions')
      .insert({
        form_id: formId,
        funnel_page_id: null,
        question_text: body.questionText,
        question_order: nextOrder,
        answer_type: answerType,
        qualifying_answer: qualifyingAnswer,
        options: answerType === 'multiple_choice' ? body.options : null,
        placeholder: body.placeholder || null,
        is_qualifying: isQualifying,
        is_required: body.isRequired ?? true,
      })
      .select()
      .single();

    if (error) {
      logApiError('qualification-forms/questions/create', error, { formId });
      return ApiErrors.databaseError('Failed to create question');
    }

    return NextResponse.json(
      { question: qualificationQuestionFromRow(data as QualificationQuestionRow) },
      { status: 201 }
    );
  } catch (error) {
    logApiError('qualification-forms/questions/create', error);
    return ApiErrors.internalError('Failed to create question');
  }
}

// PATCH - Reorder questions (bulk update)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { formId } = await params;
    const body = await request.json();
    const supabase = createSupabaseAdminClient();

    if (!body.questionIds || !Array.isArray(body.questionIds)) {
      return ApiErrors.validationError('questionIds array is required');
    }

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

    const updates = body.questionIds.map((questionId: string, index: number) =>
      supabase
        .from('qualification_questions')
        .update({ question_order: index })
        .eq('id', questionId)
        .eq('form_id', formId)
    );

    const results = await Promise.all(updates);

    const failedUpdate = results.find(r => r.error);
    if (failedUpdate?.error) {
      logApiError('qualification-forms/questions/reorder', failedUpdate.error, { formId });
      return ApiErrors.databaseError('Failed to reorder questions');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('qualification-forms/questions/reorder', error);
    return ApiErrors.internalError('Failed to reorder questions');
  }
}
