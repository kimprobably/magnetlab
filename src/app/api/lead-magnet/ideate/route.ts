// API Route: Generate Lead Magnet Ideas
// POST /api/lead-magnet/ideate

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateLeadMagnetIdeas } from '@/lib/ai/lead-magnet-generator';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { ApiErrors, logApiError } from '@/lib/api/errors';
import type { BusinessContext, CallTranscriptInsights, CompetitorAnalysis } from '@/lib/types/lead-magnet';

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

    // Generate ideas using AI
    const result = await generateLeadMagnetIdeas(context, sources);

    // Save ideation result to brand_kit for future use
    try {
      await supabase
        .from('brand_kits')
        .update({
          saved_ideation_result: result,
          ideation_generated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id);
    } catch (saveError) {
      logApiError('lead-magnet/ideate/save', saveError, { userId: session.user.id, note: 'Non-critical' });
      // Continue anyway - saving is not critical
    }

    return NextResponse.json(result);
  } catch (error) {
    logApiError('lead-magnet/ideate', error);
    return ApiErrors.aiError('Failed to generate ideas');
  }
}
