// API Route: Generate Content from Extraction
// POST /api/lead-magnet/generate

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { processContentExtraction } from '@/lib/ai/lead-magnet-generator';
import type { LeadMagnetArchetype, LeadMagnetConcept } from '@/lib/types/lead-magnet';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { archetype, concept, answers } = body as {
      archetype: LeadMagnetArchetype;
      concept: LeadMagnetConcept;
      answers: Record<string, string>;
    };

    if (!archetype || !concept || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const extractedContent = await processContentExtraction(archetype, concept, answers);

    return NextResponse.json(extractedContent);
  } catch (error) {
    console.error('Generate content error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
