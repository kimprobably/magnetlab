// API Route: Generate Lead Magnet Ideas (Background Job)
// POST /api/lead-magnet/ideate - Creates job, returns jobId

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { ApiErrors, logApiError } from '@/lib/api/errors';
import { ideateLeadMagnet } from '@/trigger/ideate-lead-magnet';
import type { BusinessContext, CallTranscriptInsights, CompetitorAnalysis } from '@/lib/types/lead-magnet';
import type { IdeationJobInput, CreateJobResponse } from '@/lib/types/background-jobs';

interface IdeateRequestBody extends BusinessContext {
  sources?: {
    callTranscriptInsights?: CallTranscriptInsights;
    competitorAnalysis?: CompetitorAnalysis;
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json() as IdeateRequestBody;
    const { sources, ...context } = body;

    // Validate required fields
    if (!context.businessDescription || !context.businessType) {
      return ApiErrors.validationError('Missing required fields: businessDescription and businessType');
    }

    // Check usage limits
    const supabase = createSupabaseAdminClient();
    try {
      const { data: canCreate, error: rpcError } = await supabase.rpc('check_usage_limit', {
        p_user_id: session.user.id,
        p_limit_type: 'lead_magnets',
      });

      if (rpcError) {
        logApiError('lead-magnet/ideate/usage-check', rpcError, { userId: session.user.id });
      } else if (canCreate === false) {
        return ApiErrors.usageLimitExceeded('Monthly lead magnet limit reached. Upgrade your plan for more.');
      }
    } catch (err) {
      logApiError('lead-magnet/ideate/usage-check', err, { userId: session.user.id, note: 'RPC unavailable' });
    }

    // Save business context to brand_kit
    try {
      await supabase
        .from('brand_kits')
        .upsert({
          user_id: session.user.id,
          business_description: context.businessDescription,
          business_type: context.businessType,
          credibility_markers: context.credibilityMarkers,
          urgent_pains: context.urgentPains,
          templates: context.templates,
          processes: context.processes,
          tools: context.tools,
          frequent_questions: context.frequentQuestions,
          results: context.results,
          success_example: context.successExample,
        }, { onConflict: 'user_id' });
    } catch (saveError) {
      logApiError('lead-magnet/ideate/save-brand-kit', saveError, { userId: session.user.id });
      // Non-critical, continue
    }

    // Create job record
    const jobInput: IdeationJobInput = {
      businessContext: {
        businessDescription: context.businessDescription,
        businessType: context.businessType,
        credibilityMarkers: context.credibilityMarkers || [],
        urgentPains: context.urgentPains || [],
        templates: context.templates || [],
        processes: context.processes || [],
        tools: context.tools || [],
        frequentQuestions: context.frequentQuestions || [],
        results: context.results || [],
        successExample: context.successExample,
      },
      sources: sources ? {
        callTranscriptInsights: sources.callTranscriptInsights,
        competitorAnalysis: sources.competitorAnalysis,
      } : undefined,
    };

    const { data: job, error: jobError } = await supabase
      .from('background_jobs')
      .insert({
        user_id: session.user.id,
        job_type: 'ideation',
        status: 'pending',
        input: jobInput,
      })
      .select('id')
      .single();

    if (jobError || !job) {
      logApiError('lead-magnet/ideate/create-job', jobError, { userId: session.user.id });
      return ApiErrors.databaseError('Failed to create job');
    }

    // Trigger background task
    const handle = await ideateLeadMagnet.trigger({
      jobId: job.id,
      userId: session.user.id,
      input: jobInput,
    });

    // Update job with trigger task ID
    await supabase
      .from('background_jobs')
      .update({ trigger_task_id: handle.id })
      .eq('id', job.id);

    const response: CreateJobResponse = {
      jobId: job.id,
      status: 'pending',
    };

    return NextResponse.json(response);
  } catch (error) {
    logApiError('lead-magnet/ideate', error);
    return ApiErrors.internalError('Failed to start ideation');
  }
}
