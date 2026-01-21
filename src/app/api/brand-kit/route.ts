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

    return NextResponse.json(data || null);
  } catch (error) {
    console.error('Get brand kit error:', error);
    return NextResponse.json({ error: 'Failed to fetch brand kit' }, { status: 500 });
  }
}

// POST - Create or update brand kit
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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

    const { data, error } = await supabase
      .from('brand_kits')
      .upsert(brandKitData)
      .select()
      .single();

    if (error) {
      console.error('Save brand kit error:', error);
      return NextResponse.json({ error: 'Failed to save brand kit' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Save brand kit error:', error);
    return NextResponse.json({ error: 'Failed to save brand kit' }, { status: 500 });
  }
}
