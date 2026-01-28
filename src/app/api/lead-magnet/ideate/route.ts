// API Route: Generate Lead Magnet Ideas
// POST /api/lead-magnet/ideate

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateLeadMagnetIdeas } from '@/lib/ai/lead-magnet-generator';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import type { BusinessContext, CallTranscriptInsights, CompetitorAnalysis } from '@/lib/types/lead-magnet';

interface IdeateRequestBody extends BusinessContext {
  sources?: {
    callTranscriptInsights?: CallTranscriptInsights;
    competitorAnalysis?: CompetitorAnalysis;
  };
}

export async function POST(request: Request) {
  console.log('[Ideate API] POST request received');

  try {
    const session = await auth();
    console.log('[Ideate API] Session:', session?.user?.id ? 'authenticated' : 'not authenticated');

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as IdeateRequestBody;
    const { sources, ...context } = body;
    console.log('[Ideate API] Context received:', { businessType: context.businessType, hasDescription: !!context.businessDescription, hasSources: !!sources });

    // Validate required fields
    if (!context.businessDescription || !context.businessType) {
      return NextResponse.json(
        { error: 'Missing required fields: businessDescription and businessType' },
        { status: 400 }
      );
    }

    // Check usage limits - DISABLED FOR TESTING
    // const supabase = createSupabaseAdminClient();
    // const { data: canCreate } = await supabase.rpc('check_usage_limit', {
    //   p_user_id: session.user.id,
    //   p_limit_type: 'lead_magnets',
    // });

    // if (!canCreate) {
    //   return NextResponse.json(
    //     { error: 'Monthly lead magnet limit reached. Upgrade your plan for more.' },
    //     { status: 403 }
    //   );
    // }

    // Generate ideas using AI
    console.log('[Ideate API] Calling generateLeadMagnetIdeas...');
    const result = await generateLeadMagnetIdeas(context, sources);
    console.log('[Ideate API] Successfully generated ideas');

    // Save ideation result to brand_kit for future use
    try {
      const supabase = createSupabaseAdminClient();
      await supabase
        .from('brand_kits')
        .update({
          saved_ideation_result: result,
          ideation_generated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id);
    } catch (saveError) {
      console.warn('[Ideate API] Failed to save ideation result:', saveError);
      // Continue anyway - saving is not critical
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Ideate API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate ideas: ${errorMessage}` },
      { status: 500 }
    );
  }
}
