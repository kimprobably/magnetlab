// API Route: Generate LinkedIn Post Variations
// POST /api/lead-magnet/write-post

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generatePostVariations } from '@/lib/ai/lead-magnet-generator';
import { ApiErrors, logApiError } from '@/lib/api/errors';
import type { PostWriterInput } from '@/lib/types/lead-magnet';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const input = body as PostWriterInput;

    // Validate required fields
    if (!input.leadMagnetTitle || !input.contents || !input.problemSolved) {
      return ApiErrors.validationError('Missing required fields: leadMagnetTitle, contents, problemSolved');
    }

    const result = await generatePostVariations(input);

    return NextResponse.json(result);
  } catch (error) {
    logApiError('lead-magnet/write-post', error);
    return ApiErrors.aiError('Failed to generate post variations');
  }
}
