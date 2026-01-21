// API Route: Lead Magnets List and Create
// GET /api/lead-magnet - List all
// POST /api/lead-magnet - Create new

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

// GET - List all lead magnets for current user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Use admin client to bypass RLS (we validate user via NextAuth)
    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from('lead_magnets')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('List error:', error);
      return NextResponse.json({ error: 'Failed to fetch lead magnets' }, { status: 500 });
    }

    return NextResponse.json({
      leadMagnets: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List lead magnets error:', error);
    return NextResponse.json({ error: 'Failed to fetch lead magnets' }, { status: 500 });
  }
}

// POST - Create a new lead magnet
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Use admin client to bypass RLS (we validate user via NextAuth)
    const supabase = createSupabaseAdminClient();

    // Check usage limits (gracefully handle if RPC doesn't exist)
    try {
      const { data: canCreate, error: rpcError } = await supabase.rpc('check_usage_limit', {
        p_user_id: session.user.id,
        p_limit_type: 'lead_magnets',
      });

      if (!rpcError && canCreate === false) {
        return NextResponse.json(
          { error: 'Monthly lead magnet limit reached. Upgrade your plan for more.' },
          { status: 403 }
        );
      }
    } catch {
      // RPC doesn't exist, continue without limit check
      console.log('Usage limit check skipped - RPC not available');
    }

    // Create the lead magnet
    const { data, error } = await supabase
      .from('lead_magnets')
      .insert({
        user_id: session.user.id,
        title: body.title,
        archetype: body.archetype,
        concept: body.concept,
        extracted_content: body.extractedContent,
        linkedin_post: body.linkedinPost,
        post_variations: body.postVariations,
        dm_template: body.dmTemplate,
        cta_word: body.ctaWord,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Create error:', error);
      return NextResponse.json({ error: `Failed to create lead magnet: ${error.message}` }, { status: 500 });
    }

    // Increment usage (gracefully handle if RPC doesn't exist)
    try {
      await supabase.rpc('increment_usage', {
        p_user_id: session.user.id,
        p_limit_type: 'lead_magnets',
      });
    } catch {
      // RPC doesn't exist, continue
      console.log('Usage increment skipped - RPC not available');
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create lead magnet error:', error);
    return NextResponse.json({ error: 'Failed to create lead magnet' }, { status: 500 });
  }
}
