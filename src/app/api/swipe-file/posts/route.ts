// Swipe File Posts API
// GET /api/swipe-file/posts - List approved posts with filters

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);

    // Filters
    const niche = searchParams.get('niche');
    const postType = searchParams.get('type');
    const featured = searchParams.get('featured') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('swipe_file_posts')
      .select('*', { count: 'exact' })
      .in('status', ['approved', 'featured'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (niche) {
      query = query.eq('niche', niche);
    }

    if (postType) {
      query = query.eq('post_type', postType);
    }

    if (featured) {
      query = query.eq('status', 'featured');
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching swipe file posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({
      posts: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in swipe-file posts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
