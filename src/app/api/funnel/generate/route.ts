import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import type { GenerateFunnelContentResponse } from '@/lib/types/funnel';
import { checkRateLimit } from '@/lib/utils/security';

const anthropic = new Anthropic();

// POST /api/funnel/generate - Generate funnel content from lead magnet
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for AI generation (5 requests per minute per user to control costs)
    const rateLimitKey = `funnel:generate:${session.user.id}`;
    const rateLimit = checkRateLimit(rateLimitKey, { windowMs: 60000, maxRequests: 5 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many generation requests. Please try again in a minute.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const { leadMagnetId } = body;

    if (!leadMagnetId) {
      return NextResponse.json(
        { error: 'leadMagnetId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Fetch the lead magnet
    const { data: leadMagnet, error: lmError } = await supabase
      .from('lead_magnets')
      .select('id, title, archetype, concept, extracted_content, generated_content')
      .eq('id', leadMagnetId)
      .eq('user_id', session.user.id)
      .single();

    if (lmError || !leadMagnet) {
      return NextResponse.json(
        { error: 'Lead magnet not found' },
        { status: 404 }
      );
    }

    // Extract relevant info from lead magnet
    const title = leadMagnet.title;
    const concept = leadMagnet.concept as {
      hook?: string;
      painPoint?: string;
      promise?: string;
      targetAudience?: string;
    } | null;
    const extractedContent = leadMagnet.extracted_content as {
      summary?: string;
      keyInsights?: string[];
    } | null;

    // Generate funnel content using Claude
    const prompt = `You are a conversion copywriting expert. Based on the following lead magnet information, generate compelling opt-in page copy and qualification questions.

Lead Magnet Title: ${title}
Hook: ${concept?.hook || 'Not specified'}
Pain Point: ${concept?.painPoint || 'Not specified'}
Promise: ${concept?.promise || 'Not specified'}
Target Audience: ${concept?.targetAudience || 'Not specified'}
Summary: ${extractedContent?.summary || 'Not specified'}

Generate:
1. A compelling headline for the opt-in page (max 80 chars, should grab attention and hint at the value)
2. A subline that expands on the headline (max 150 chars, should address the pain point or promise)
3. A CTA button text (max 30 chars, action-oriented)
4. A thank-you page headline (max 60 chars, confirms the value they're getting)
5. A thank-you page subline (max 120 chars, tells them what to do next)
6. 2-3 qualification questions that help determine if someone is a good fit for a sales call. Each question should be a yes/no question where "Yes" indicates they qualify.

Respond in JSON format:
{
  "optinHeadline": "...",
  "optinSubline": "...",
  "optinButtonText": "...",
  "thankyouHeadline": "...",
  "thankyouSubline": "...",
  "suggestedQuestions": [
    { "questionText": "...", "qualifyingAnswer": true },
    { "questionText": "...", "qualifyingAnswer": true }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let generatedContent: GenerateFunnelContentResponse;
    try {
      generatedContent = JSON.parse(jsonStr);
    } catch {
      // Fallback to sensible defaults if parsing fails
      generatedContent = {
        optinHeadline: `Get the ${title}`,
        optinSubline:
          concept?.painPoint ||
          'Download your free guide and start seeing results today.',
        optinButtonText: 'Get Instant Access',
        thankyouHeadline: "You're In! Check Your Email",
        thankyouSubline:
          'Your download is on its way. While you wait, watch this quick video.',
        suggestedQuestions: [
          {
            questionText: 'Do you currently run a business?',
            qualifyingAnswer: true,
          },
          {
            questionText: 'Are you looking to scale in the next 90 days?',
            qualifyingAnswer: true,
          },
        ],
      };
    }

    return NextResponse.json(generatedContent);
  } catch (error) {
    console.error('Error in POST /api/funnel/generate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
