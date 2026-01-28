import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeCallTranscript } from '@/lib/ai/lead-magnet-generator';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Transcript is required and must be a string' },
        { status: 400 }
      );
    }

    if (transcript.length < 100) {
      return NextResponse.json(
        { error: 'Transcript too short. Please provide at least 100 characters.' },
        { status: 400 }
      );
    }

    if (transcript.length > 50000) {
      return NextResponse.json(
        { error: 'Transcript too long. Maximum 50,000 characters.' },
        { status: 400 }
      );
    }

    const insights = await analyzeCallTranscript(transcript);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze transcript' },
      { status: 500 }
    );
  }
}
