// API Route: Brand Kit CRUD
// GET /api/brand-kit - Get current user's brand kit
// POST /api/brand-kit - Create/update brand kit

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

// GET - Get brand kit
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('brand_kits')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Get brand kit error:', error);
      return NextResponse.json({ error: 'Failed to fetch brand kit' }, { status: 500 });
    }

    // Return both brand kit and saved ideation
    return NextResponse.json({
      brandKit: data || null,
      savedIdeation: data?.saved_ideation_result || null,
      ideationGeneratedAt: data?.ideation_generated_at || null,
    });
  } catch (error) {
    console.error('Get brand kit error:', error);
    return NextResponse.json({ error: 'Failed to fetch brand kit' }, { status: 500 });
  }
}

// POST - Create or update brand kit
export async function POST(request: Request) {
  console.log('[Brand Kit API] POST request received');

  try {
    const session = await auth();
    console.log('[Brand Kit API] Session:', session?.user?.id ? 'authenticated' : 'not authenticated');

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[Brand Kit API] Body keys:', Object.keys(body));

    const supabase = createSupabaseAdminClient();

    const brandKitData = {
      user_id: session.user.id,
      business_description: body.businessDescription,
      business_type: body.businessType,
      credibility_markers: body.credibilityMarkers || [],
      urgent_pains: body.urgentPains || [],
      templates: body.templates || [],
      processes: body.processes || [],
      tools: body.tools || [],
      frequent_questions: body.frequentQuestions || [],
      results: body.results || [],
      success_example: body.successExample,
      audience_tools: body.audienceTools || [],
      preferred_tone: body.preferredTone || 'conversational',
      style_profile: body.styleProfile,
    };

    console.log('[Brand Kit API] Upserting brand kit for user:', session.user.id);

    const { data, error } = await supabase
      .from('brand_kits')
      .upsert(brandKitData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[Brand Kit API] Supabase error:', error.message, error.code, error.details);
      return NextResponse.json({ error: `Failed to save brand kit: ${error.message}` }, { status: 500 });
    }

    console.log('[Brand Kit API] Successfully saved brand kit');
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Brand Kit API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save brand kit: ${errorMessage}` }, { status: 500 });
  }
}
