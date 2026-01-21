// API Route: Generate Lead Magnet Ideas
// POST /api/lead-magnet/ideate

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateLeadMagnetIdeas } from '@/lib/ai/lead-magnet-generator';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import type { BusinessContext } from '@/lib/types/lead-magnet';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const context = body as BusinessContext;

    // Validate required fields
    if (!context.businessDescription || !context.businessType) {
      return NextResponse.json(
        { error: 'Missing required fields: businessDescription and businessType' },
        { status: 400 }
      );
    }

    // Check usage limits
    const supabase = createSupabaseAdminClient();
    const { data: canCreate } = await supabase.rpc('check_usage_limit', {
      p_user_id: session.user.id,
      p_limit_type: 'lead_magnets',
    });

    if (!canCreate) {
      return NextResponse.json(
        { error: 'Monthly lead magnet limit reached. Upgrade your plan for more.' },
        { status: 403 }
      );
    }

    // Generate ideas using AI
    const result = await generateLeadMagnetIdeas(context);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ideation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}
