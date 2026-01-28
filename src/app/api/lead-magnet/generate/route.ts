// API Route: Generate Content from Extraction
// POST /api/lead-magnet/generate

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { processContentExtraction } from '@/lib/ai/lead-magnet-generator';
import { ApiErrors, logApiError } from '@/lib/api/errors';
import type { LeadMagnetArchetype, LeadMagnetConcept } from '@/lib/types/lead-magnet';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { archetype, concept, answers } = body as {
      archetype: LeadMagnetArchetype;
      concept: LeadMagnetConcept;
      answers: Record<string, string>;
    };

    if (!archetype || !concept || !answers) {
      return ApiErrors.validationError('Missing required fields: archetype, concept, and answers');
    }

    const extractedContent = await processContentExtraction(archetype, concept, answers);

    return NextResponse.json(extractedContent);
  } catch (error) {
    logApiError('lead-magnet/generate', error);
    return ApiErrors.aiError('Failed to generate content');
  }
}
