// User Integrations API
// GET /api/integrations - List user's integrations
// POST /api/integrations - Save/update an integration

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

// GET - List all integrations for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('user_integrations')
      .select('service, is_active, last_verified_at, metadata, created_at, updated_at')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching integrations:', error);
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }

    // Return integrations without exposing API keys
    return NextResponse.json({
      integrations: data || [],
    });
  } catch (error) {
    console.error('Error in integrations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save or update an integration
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { service, api_key, webhook_secret } = body;

    if (!service) {
      return NextResponse.json({ error: 'Service is required' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Upsert the integration
    const { data, error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: session.user.id,
        service,
        api_key: api_key || null,
        webhook_secret: webhook_secret || null,
        is_active: !!api_key,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,service',
      })
      .select('service, is_active, last_verified_at, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error saving integration:', error);
      return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
    }

    return NextResponse.json({
      integration: data,
      message: 'Integration saved successfully',
    });
  } catch (error) {
    console.error('Error in integrations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
