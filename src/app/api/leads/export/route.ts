import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

// GET /api/leads/export - Export leads as CSV
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const funnelPageId = searchParams.get('funnelPageId');
    const format = searchParams.get('format') || 'csv';

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from('leads')
      .select(
        `
        email,
        name,
        qualified,
        qualification_answers,
        created_at,
        funnel_pages!inner (
          slug,
          optin_headline,
          lead_magnets!inner (
            title
          )
        )
      `
      )
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (funnelPageId) {
      query = query.eq('funnel_page_id', funnelPageId);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads for export:', error);
      return NextResponse.json(
        { error: 'Failed to export leads' },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads to export' }, { status: 404 });
    }

    // Type the funnel_pages properly - Supabase returns arrays for joined tables
    type FunnelPageJoin = {
      slug: string;
      optin_headline: string;
      lead_magnets: { title: string }[];
    }[];

    if (format === 'json') {
      // Return JSON format
      const jsonData = leads.map((lead) => {
        const funnelPages = lead.funnel_pages as FunnelPageJoin;
        const funnelPage = funnelPages[0];
        return {
          email: lead.email,
          name: lead.name || '',
          qualified: lead.qualified ?? 'N/A',
          qualificationAnswers: lead.qualification_answers || {},
          leadMagnet: funnelPage?.lead_magnets?.[0]?.title || '',
          funnelSlug: funnelPage?.slug || '',
          capturedAt: lead.created_at,
        };
      });

      return NextResponse.json(jsonData);
    }

    // Generate CSV
    const csvRows: string[] = [];

    // Header row
    csvRows.push('Email,Name,Qualified,Lead Magnet,Funnel Slug,Captured At');

    // Data rows
    for (const lead of leads) {
      const funnelPages = lead.funnel_pages as FunnelPageJoin;
      const funnelPage = funnelPages[0];
      const row = [
        escapeCSV(lead.email),
        escapeCSV(lead.name || ''),
        lead.qualified === null ? 'N/A' : lead.qualified ? 'Yes' : 'No',
        escapeCSV(funnelPage?.lead_magnets?.[0]?.title || ''),
        escapeCSV(funnelPage?.slug || ''),
        new Date(lead.created_at).toISOString(),
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/leads/export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to escape CSV values
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
