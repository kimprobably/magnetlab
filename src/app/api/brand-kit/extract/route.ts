// API Route: Extract Business Context from unstructured content
// POST /api/brand-kit/extract

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extractBusinessContext } from '@/lib/ai';
import type { ContentType } from '@/lib/types/lead-magnet';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'content is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content is too short for meaningful extraction. Please provide more text (at least 50 characters).' },
        { status: 400 }
      );
    }

    // Validate contentType if provided
    const validContentTypes: ContentType[] = ['offer-doc', 'linkedin', 'sales-page', 'other'];
    const contentType: ContentType | undefined =
      body.contentType && validContentTypes.includes(body.contentType)
        ? body.contentType
        : undefined;

    const result = await extractBusinessContext(body.content, contentType);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error extracting business context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract business context' },
      { status: 500 }
    );
  }
}
