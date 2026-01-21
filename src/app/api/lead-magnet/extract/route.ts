// API Route: Get Extraction Questions / Process Extraction
// GET /api/lead-magnet/extract?archetype=single-system
// POST /api/lead-magnet/extract - Process answers

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExtractionQuestions, processContentExtraction } from '@/lib/ai/lead-magnet-generator';
import type { LeadMagnetArchetype, LeadMagnetConcept } from '@/lib/types/lead-magnet';

// GET - Get extraction questions for an archetype
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const archetype = searchParams.get('archetype') as LeadMagnetArchetype;

    if (!archetype) {
      return NextResponse.json(
        { error: 'Missing archetype parameter' },
        { status: 400 }
      );
    }

    const questions = getExtractionQuestions(archetype);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Get extraction questions error:', error);
    return NextResponse.json(
      { error: 'Failed to get extraction questions' },
      { status: 500 }
    );
  }
}

// POST - Process extraction answers
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
        { error: 'Missing required fields: archetype, concept, answers' },
        { status: 400 }
      );
    }

    const extractedContent = await processContentExtraction(archetype, concept, answers);

    return NextResponse.json(extractedContent);
  } catch (error) {
    console.error('Process extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to process extraction' },
      { status: 500 }
    );
  }
}
