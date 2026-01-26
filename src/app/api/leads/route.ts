import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import type { LeadRow, LeadWebhookPayload } from '@/lib/types/funnel';

// GET /api/leads - List all leads for the current user
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const funnelPageId = searchParams.get('funnelPageId');
    const qualified = searchParams.get('qualified');

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from('leads')
      .select(
        `
        *,
        funnel_pages!inner (
          id,
          slug,
          optin_headline,
          lead_magnets!inner (
            id,
            title
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (funnelPageId) {
      query = query.eq('funnel_page_id', funnelPageId);
    }

    if (qualified === 'true') {
      query = query.eq('qualified', true);
    } else if (qualified === 'false') {
      query = query.eq('qualified', false);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leads - Capture a new lead (public endpoint, no auth required)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { funnelPageId, email, name } = body;

    if (!funnelPageId || !email) {
      return NextResponse.json(
        { error: 'funnelPageId and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Get the funnel page and verify it's published
    const { data: funnelPage, error: fpError } = await supabase
      .from('funnel_pages')
      .select(
        `
        id,
        slug,
        user_id,
        published,
        lead_magnets!inner (
          id,
          title
        )
      `
      )
      .eq('id', funnelPageId)
      .single();

    if (fpError || !funnelPage) {
      return NextResponse.json(
        { error: 'Funnel page not found' },
        { status: 404 }
      );
    }

    if (!funnelPage.published) {
      return NextResponse.json(
        { error: 'This page is not available' },
        { status: 403 }
      );
    }

    // Get request metadata
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');

    // Create the lead
    const leadData: Partial<LeadRow> = {
      funnel_page_id: funnelPageId,
      user_id: funnelPage.user_id,
      email: email.toLowerCase().trim(),
      name: name?.trim() || null,
      source_url: referer || null,
      ip_address: ipAddress,
      user_agent: userAgent || null,
    };

    const { data: lead, error: createError } = await supabase
      .from('leads')
      .upsert(leadData, {
        onConflict: 'funnel_page_id,email',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating lead:', createError);
      // Check for duplicate
      if (createError.code === '23505') {
        // Return success for duplicate - they're already subscribed
        return NextResponse.json({ success: true, duplicate: true });
      }
      return NextResponse.json(
        { error: 'Failed to capture lead' },
        { status: 500 }
      );
    }

    // Trigger webhooks
    await triggerWebhooks(
      supabase,
      funnelPage.user_id,
      'lead.captured',
      lead,
      funnelPage
    );

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to trigger webhooks
async function triggerWebhooks(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  event: LeadWebhookPayload['event'],
  lead: LeadRow,
  funnelPage: {
    id: string;
    slug: string;
    lead_magnets: { id: string; title: string }[];
  }
) {
  try {
    // Get user's active webhooks
    const { data: webhooks } = await supabase
      .from('lead_webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (!webhooks || webhooks.length === 0) return;

    const leadMagnet = funnelPage.lead_magnets[0];
    const payload: LeadWebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      lead: {
        email: lead.email,
        name: lead.name,
        qualified: lead.qualified,
        qualificationAnswers: lead.qualification_answers,
      },
      funnelPage: {
        id: funnelPage.id,
        slug: funnelPage.slug,
      },
      leadMagnet: {
        id: leadMagnet?.id || '',
        title: leadMagnet?.title || '',
      },
    };

    // Fire webhooks in parallel (fire-and-forget)
    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        const response = await fetch(webhook.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        // Update last triggered timestamp
        await supabase
          .from('lead_webhooks')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', webhook.id);

        return { webhookId: webhook.id, success: response.ok };
      } catch (error) {
        console.error(`Webhook ${webhook.id} failed:`, error);
        return { webhookId: webhook.id, success: false };
      }
    });

    // Don't await - fire and forget
    Promise.all(webhookPromises).catch(console.error);
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}
