// LeadShark Automation by ID API
// GET /api/leadshark/automations/[id] - Get automation
// PUT /api/leadshark/automations/[id] - Update automation
// DELETE /api/leadshark/automations/[id] - Delete automation

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserLeadSharkClient } from '@/lib/integrations/leadshark';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a specific automation
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const result = await client.getAutomation(id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ automation: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch automation' },
      { status: 500 }
    );
  }
}

// PUT - Update an automation
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();
    const result = await client.updateAutomation(id, body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ automation: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update automation' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an automation
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const result = await client.deleteAutomation(id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete automation' },
      { status: 500 }
    );
  }
}
