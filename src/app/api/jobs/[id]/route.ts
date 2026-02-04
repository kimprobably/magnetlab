// API Route: Get Background Job Status
// GET /api/jobs/[id]

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { ApiErrors, logApiError } from '@/lib/api/errors';
import type { JobStatusResponse } from '@/lib/types/background-jobs';

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
    const supabase = createSupabaseAdminClient();

    const { data: job, error } = await supabase
      .from('background_jobs')
      .select('id, status, result, error, created_at, completed_at')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !job) {
      return ApiErrors.notFound('Job');
    }

    const response: JobStatusResponse = {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    logApiError('jobs/status', error);
    return ApiErrors.internalError('Failed to get job status');
  }
}
