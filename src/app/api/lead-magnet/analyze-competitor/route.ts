import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeCompetitorContent } from '@/lib/ai/lead-magnet-generator';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import type { BusinessContext } from '@/lib/types/lead-magnet';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    if (content.length < 50) {
      return NextResponse.json(
        { error: 'Content too short. Please provide at least 50 characters.' },
        { status: 400 }
      );
    }

    if (content.length > 20000) {
      return NextResponse.json(
        { error: 'Content too long. Maximum 20,000 characters.' },
        { status: 400 }
      );
    }

    // Optionally fetch user's brand kit for context
    let businessContext: BusinessContext | undefined;
    try {
      const supabase = createSupabaseAdminClient();
      const { data: brandKit } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (brandKit) {
        businessContext = {
          businessDescription: brandKit.business_description || '',
          businessType: brandKit.business_type || 'coach-consultant',
          credibilityMarkers: brandKit.credibility_markers || [],
          urgentPains: brandKit.urgent_pains || [],
          templates: brandKit.templates || [],
          processes: brandKit.processes || [],
          tools: brandKit.tools || [],
          frequentQuestions: brandKit.frequent_questions || [],
          results: brandKit.results || [],
          successExample: brandKit.success_example,
        };
      }
    } catch {
      // Continue without business context
    }

    const analysis = await analyzeCompetitorContent(content, businessContext);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error analyzing competitor content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze content' },
      { status: 500 }
    );
  }
}
