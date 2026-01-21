// LeadShark Scheduled Post by ID API
// GET /api/leadshark/scheduled-posts/[id] - Get scheduled post
// PUT /api/leadshark/scheduled-posts/[id] - Update scheduled post
// DELETE /api/leadshark/scheduled-posts/[id] - Delete scheduled post

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserLeadSharkClient } from '@/lib/integrations/leadshark';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a specific scheduled post
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
    const result = await client.getScheduledPost(id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ post: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scheduled post' },
      { status: 500 }
    );
  }
}

// PUT - Update a scheduled post
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
    const result = await client.updateScheduledPost(id, body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ post: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update scheduled post' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a scheduled post
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
    const result = await client.deleteScheduledPost(id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete scheduled post' },
      { status: 500 }
    );
  }
}
