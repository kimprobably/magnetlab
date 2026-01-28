import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeCallTranscript } from '@/lib/ai/lead-magnet-generator';
import { ApiErrors, logApiError } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return ApiErrors.validationError('Transcript is required and must be a string');
    }

    if (transcript.length < 100) {
      return ApiErrors.validationError('Transcript too short. Please provide at least 100 characters.');
    }

    if (transcript.length > 50000) {
      return ApiErrors.validationError('Transcript too long. Maximum 50,000 characters.');
    }

    const insights = await analyzeCallTranscript(transcript);

    return NextResponse.json({ insights });
  } catch (error) {
    logApiError('lead-magnet/analyze-transcript', error);
    return ApiErrors.aiError('Failed to analyze transcript');
  }
}
