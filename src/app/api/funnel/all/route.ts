import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('funnel_pages')
      .select(`
        id,
        slug,
        optin_headline,
        is_published,
        published_at,
        created_at,
        lead_magnet_id,
        lead_magnets (
          title
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching funnel pages:', error);
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
    }

    return NextResponse.json({ funnels: data });
  } catch (error) {
    console.error('Error in funnel/all:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
