// API Route: Generate LinkedIn Post Variations
// POST /api/lead-magnet/write-post

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generatePostVariations } from '@/lib/ai/lead-magnet-generator';
import type { PostWriterInput } from '@/lib/types/lead-magnet';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const input = body as PostWriterInput;

    // Validate required fields
    if (!input.leadMagnetTitle || !input.contents || !input.problemSolved) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await generatePostVariations(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Write post error:', error);
    return NextResponse.json(
      { error: 'Failed to generate post variations' },
      { status: 500 }
    );
  }
}
