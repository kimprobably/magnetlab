// LeadShark Automations API
// GET /api/leadshark/automations - List all automations
// POST /api/leadshark/automations - Create a new automation

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserLeadSharkClient } from '@/lib/integrations/leadshark';

// GET - List all automations
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await getUserLeadSharkClient(session.user.id);
    if (!client) {
      return NextResponse.json(
        { error: 'LeadShark not connected. Add your API key in Settings.' },
        { status: 400 }
      );
    }

    const result = await client.listAutomations();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      automations: result.data || [],
    });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch automations' },
      { status: 500 }
    );
  }
}

// POST - Create a new automation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await getUserLeadSharkClient(session.user.id);
    if (!client) {
      return NextResponse.json(
        { error: 'LeadShark not connected. Add your API key in Settings.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = await client.createAutomation(body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      automation: result.data,
    });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create automation' },
      { status: 500 }
    );
  }
}
