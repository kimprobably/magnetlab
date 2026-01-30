// API Route: External Lead Magnet Creation Pipeline
// POST /api/external/create-lead-magnet
//
// Allows external systems (e.g., gtm-system) to programmatically create
// a complete lead magnet + funnel without manual user interaction.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import {
  generateLeadMagnetIdeas,
  getExtractionQuestions,
  processContentExtraction,
  generatePostVariations,
  polishLeadMagnetContent,
} from '@/lib/ai/lead-magnet-generator';
import { generateEmailSequence, generateDefaultEmailSequence } from '@/lib/ai/email-sequence-generator';
import { ApiErrors, logApiError } from '@/lib/api/errors';
import { fireGtmLeadMagnetDeployedWebhook } from '@/lib/webhooks/gtm-system';
import type {
  LeadMagnetArchetype,
  LeadMagnetConcept,
  BusinessContext,
  BusinessType,
  ExtractedContent,
  PostWriterInput,
  PostWriterResult,
} from '@/lib/types/lead-magnet';
import type { EmailGenerationContext } from '@/lib/types/email';

// ============================================
// VALIDATION SCHEMA
// ============================================

const VALID_ARCHETYPES: LeadMagnetArchetype[] = [
  'single-breakdown',
  'single-system',
  'focused-toolkit',
  'single-calculator',
  'focused-directory',
  'mini-training',
  'one-story',
  'prompt',
  'assessment',
  'workflow',
];

const requestSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  archetype: z.enum(VALID_ARCHETYPES as [string, ...string[]], {
    errorMap: () => ({ message: `archetype must be one of: ${VALID_ARCHETYPES.join(', ')}` }),
  }),
  businessContext: z.object({
    businessDescription: z.string().min(1, 'businessDescription is required'),
    credibilityMarkers: z.array(z.string()).optional().default([]),
    urgentPains: z.array(z.string()).optional().default([]),
    processes: z.array(z.string()).optional().default([]),
    tools: z.array(z.string()).optional().default([]),
    results: z.array(z.string()).optional().default([]),
    frequentQuestions: z.array(z.string()).optional().default([]),
    successExample: z.string().optional(),
  }),
  topic: z.string().optional(),
  autoPublishFunnel: z.boolean().optional().default(true),
  autoSchedulePost: z.boolean().optional().default(false),
  scheduledTime: z.string().optional(),
});

type CreateLeadMagnetRequest = z.infer<typeof requestSchema>;

// ============================================
// AUTHENTICATION
// ============================================

function authenticateRequest(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  const expectedKey = process.env.EXTERNAL_API_KEY;

  if (!expectedKey) {
    logApiError('external/create-lead-magnet/auth', new Error('EXTERNAL_API_KEY env var is not set'));
    return false;
  }

  return token === expectedKey;
}

// ============================================
// HELPER: Generate extraction answers from business context via AI
// ============================================

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
  }
  return new Anthropic({ apiKey });
}

async function generateExtractionAnswers(
  archetype: LeadMagnetArchetype,
  concept: LeadMagnetConcept,
  businessContext: CreateLeadMagnetRequest['businessContext']
): Promise<Record<string, string>> {
  const questions = getExtractionQuestions(archetype);

  if (!questions || questions.length === 0) {
    throw new Error(`No extraction questions found for archetype: ${archetype}`);
  }

  const questionsFormatted = questions
    .map((q) => `- id: "${q.id}"\n  question: "${q.question}"\n  required: ${q.required}`)
    .join('\n\n');

  const prompt = `You are an expert content strategist. Given the business context below and a lead magnet concept, generate detailed, authentic-sounding answers to the content extraction questions. These answers should be substantive (3-8 sentences each for required questions) and draw directly from the business context provided.

BUSINESS CONTEXT:
- Business Description: ${businessContext.businessDescription}
- Credibility Markers: ${businessContext.credibilityMarkers?.join(', ') || 'None specified'}
- Urgent Pains: ${businessContext.urgentPains?.join('; ') || 'None specified'}
- Processes: ${businessContext.processes?.join(', ') || 'None specified'}
- Tools: ${businessContext.tools?.join(', ') || 'None specified'}
- Results: ${businessContext.results?.join('; ') || 'None specified'}
- Frequent Questions: ${businessContext.frequentQuestions?.join('; ') || 'None specified'}
- Success Example: ${businessContext.successExample || 'None specified'}

LEAD MAGNET CONCEPT:
- Title: ${concept.title}
- Archetype: ${concept.archetypeName}
- Pain Solved: ${concept.painSolved}
- Contents: ${concept.contents}
- Delivery Format: ${concept.deliveryFormat}

EXTRACTION QUESTIONS TO ANSWER:
${questionsFormatted}

Generate answers that:
1. Are specific and detailed, not generic
2. Include real-sounding numbers, examples, and specifics from the business context
3. Sound like a knowledgeable practitioner sharing their expertise
4. Address each question thoroughly (3-8 sentences for required questions, 2-4 for optional)

Return ONLY valid JSON as an object where keys are the question IDs and values are the answer strings:
{
  "${questions[0]?.id || 'example'}": "Detailed answer here...",
  ...
}`;

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude for extraction answers');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse extraction answers response');
  }

  return JSON.parse(jsonMatch[0]) as Record<string, string>;
}

// ============================================
// HELPER: Select best concept for a topic
// ============================================

function selectBestConcept(
  concepts: LeadMagnetConcept[],
  targetArchetype: LeadMagnetArchetype,
  topic?: string
): LeadMagnetConcept {
  // First, find the concept matching the requested archetype
  const archetypeMatch = concepts.find((c) => c.archetype === targetArchetype);

  if (archetypeMatch) {
    return archetypeMatch;
  }

  // If no exact archetype match (shouldn't happen since ideation generates all 10),
  // fall back to topic matching or first concept
  if (topic) {
    const topicLower = topic.toLowerCase();
    const topicMatch = concepts.find(
      (c) =>
        c.title.toLowerCase().includes(topicLower) ||
        c.painSolved.toLowerCase().includes(topicLower) ||
        c.contents.toLowerCase().includes(topicLower)
    );
    if (topicMatch) return topicMatch;
  }

  return concepts[0];
}

// ============================================
// HELPER: Generate slug from title
// ============================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Step 1: Authenticate
    if (!authenticateRequest(request)) {
      return ApiErrors.unauthorized('Invalid or missing API key');
    }

    // Step 2: Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return ApiErrors.validationError('Invalid JSON in request body');
    }

    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return ApiErrors.validationError('Validation failed', errors);
    }

    const input = parseResult.data;
    const archetype = input.archetype as LeadMagnetArchetype;

    // Step 3: Verify user exists
    const supabase = createSupabaseAdminClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, username')
      .eq('id', input.userId)
      .single();

    if (userError || !user) {
      return ApiErrors.notFound('User');
    }

    // Step 4: Build BusinessContext for ideation
    const businessContext: BusinessContext = {
      businessDescription: input.businessContext.businessDescription,
      credibilityMarkers: input.businessContext.credibilityMarkers || [],
      urgentPains: input.businessContext.urgentPains || [],
      templates: [],
      processes: input.businessContext.processes || [],
      tools: input.businessContext.tools || [],
      frequentQuestions: input.businessContext.frequentQuestions || [],
      results: input.businessContext.results || [],
      successExample: input.businessContext.successExample,
      businessType: 'coach-consultant' as BusinessType, // Default; external callers focus on archetype
    };

    // ==========================================
    // PIPELINE STEP A: Ideation
    // ==========================================
    let ideationResult;
    try {
      ideationResult = await generateLeadMagnetIdeas(businessContext);
    } catch (error) {
      logApiError('external/create-lead-magnet/ideation', error, { userId: input.userId });
      return ApiErrors.aiError('Failed to generate lead magnet ideas');
    }

    if (!ideationResult?.concepts?.length) {
      return ApiErrors.aiError('Ideation returned no concepts');
    }

    // ==========================================
    // PIPELINE STEP B: Select concept
    // ==========================================
    const selectedConcept = selectBestConcept(ideationResult.concepts, archetype, input.topic);

    // ==========================================
    // PIPELINE STEP C: Generate extraction answers from business context
    // ==========================================
    let extractionAnswers: Record<string, string>;
    try {
      extractionAnswers = await generateExtractionAnswers(
        archetype,
        selectedConcept,
        input.businessContext
      );
    } catch (error) {
      logApiError('external/create-lead-magnet/extraction-answers', error, { userId: input.userId });
      return ApiErrors.aiError('Failed to generate extraction answers');
    }

    // ==========================================
    // PIPELINE STEP D: Generate content
    // ==========================================
    let extractedContent: ExtractedContent;
    try {
      extractedContent = await processContentExtraction(archetype, selectedConcept, extractionAnswers);
    } catch (error) {
      logApiError('external/create-lead-magnet/content-generation', error, { userId: input.userId });
      return ApiErrors.aiError('Failed to generate lead magnet content');
    }

    // ==========================================
    // PIPELINE STEP E: Generate post variations
    // ==========================================
    let postResult: PostWriterResult;
    try {
      const postInput: PostWriterInput = {
        leadMagnetTitle: selectedConcept.title,
        format: selectedConcept.deliveryFormat,
        contents: selectedConcept.contents,
        problemSolved: selectedConcept.painSolved,
        credibility: businessContext.credibilityMarkers.join(', ') || 'Industry expert',
        audience: businessContext.businessDescription,
        audienceStyle: 'casual-direct',
        proof: businessContext.results.join('; ') || 'Proven results with clients',
        ctaWord: 'MAGNET',
        urgencyAngle: selectedConcept.whyNowHook,
      };

      postResult = await generatePostVariations(postInput);
    } catch (error) {
      logApiError('external/create-lead-magnet/post-writing', error, { userId: input.userId });
      return ApiErrors.aiError('Failed to generate post variations');
    }

    // ==========================================
    // PIPELINE STEP F: Create lead magnet record in database
    // ==========================================
    const { data: leadMagnet, error: createError } = await supabase
      .from('lead_magnets')
      .insert({
        user_id: input.userId,
        title: selectedConcept.title,
        archetype: archetype,
        concept: selectedConcept,
        extracted_content: extractedContent,
        linkedin_post: postResult.variations[0]?.post || null,
        post_variations: postResult.variations,
        dm_template: postResult.dmTemplate,
        cta_word: postResult.ctaWord,
        scheduled_time: input.scheduledTime || null,
        status: 'draft',
      })
      .select('id, title, archetype, status, created_at')
      .single();

    if (createError || !leadMagnet) {
      logApiError('external/create-lead-magnet/db-create', createError, { userId: input.userId });
      return ApiErrors.databaseError('Failed to create lead magnet record');
    }

    // ==========================================
    // PIPELINE STEP G: Auto-publish funnel (if enabled)
    // ==========================================
    let funnelResult: { id: string; slug: string; url: string | null } | null = null;

    if (input.autoPublishFunnel) {
      try {
        const slug = slugify(selectedConcept.title);

        // Check for slug collision
        let finalSlug = slug;
        let slugSuffix = 0;
        while (true) {
          const { data: slugExists } = await supabase
            .from('funnel_pages')
            .select('id')
            .eq('user_id', input.userId)
            .eq('slug', finalSlug)
            .single();

          if (!slugExists) break;
          slugSuffix++;
          finalSlug = `${slug}-${slugSuffix}`;
        }

        // Create funnel page
        const { data: funnel, error: funnelError } = await supabase
          .from('funnel_pages')
          .insert({
            lead_magnet_id: leadMagnet.id,
            user_id: input.userId,
            slug: finalSlug,
            optin_headline: selectedConcept.title,
            optin_subline: `Solve "${selectedConcept.painSolved}" with this free ${selectedConcept.deliveryFormat}.`,
            optin_button_text: 'Get Free Access',
            optin_social_proof: null,
            thankyou_headline: 'Thanks! Check your email.',
            thankyou_subline: 'Your download is on the way.',
            theme: 'dark',
            primary_color: '#8b5cf6',
            background_style: 'solid',
          })
          .select()
          .single();

        if (funnelError || !funnel) {
          logApiError('external/create-lead-magnet/funnel-create', funnelError, {
            userId: input.userId,
            leadMagnetId: leadMagnet.id,
          });
        } else {
          // Auto-polish content before publishing
          try {
            const polished = await polishLeadMagnetContent(extractedContent, selectedConcept);
            await supabase
              .from('lead_magnets')
              .update({
                polished_content: polished,
                polished_at: new Date().toISOString(),
              })
              .eq('id', leadMagnet.id);
          } catch (polishError) {
            logApiError('external/create-lead-magnet/polish', polishError, {
              userId: input.userId,
              leadMagnetId: leadMagnet.id,
              note: 'Non-critical, continuing with publish',
            });
          }

          // Publish the funnel if user has a username
          if (user.username) {
            const { error: publishError } = await supabase
              .from('funnel_pages')
              .update({
                is_published: true,
                published_at: new Date().toISOString(),
              })
              .eq('id', funnel.id);

            if (publishError) {
              logApiError('external/create-lead-magnet/funnel-publish', publishError, {
                userId: input.userId,
                funnelId: funnel.id,
              });
            }

            const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${user.username}/${finalSlug}`;

            funnelResult = {
              id: funnel.id,
              slug: finalSlug,
              url: publicUrl,
            };
          } else {
            // No username set -- funnel created but not published
            funnelResult = {
              id: funnel.id,
              slug: finalSlug,
              url: null,
            };

            logApiError('external/create-lead-magnet/funnel-publish', new Error('User has no username set'), {
              userId: input.userId,
              funnelId: funnel.id,
              note: 'Funnel created but not published - user must set a username first',
            });
          }
        }
      } catch (funnelErr) {
        logApiError('external/create-lead-magnet/funnel', funnelErr, {
          userId: input.userId,
          leadMagnetId: leadMagnet.id,
          note: 'Non-critical, lead magnet created successfully',
        });
      }
    }

    // ==========================================
    // PIPELINE STEP H: Generate email sequence
    // ==========================================
    let emailSequenceStatus = 'skipped';
    try {
      // Get brand kit for sender name
      const { data: brandKit } = await supabase
        .from('brand_kits')
        .select('business_description, sender_name, best_video_url, best_video_title, content_links, community_url')
        .eq('user_id', input.userId)
        .single();

      const senderName = brandKit?.sender_name || user.name || 'Your Friend';

      const emailContext: EmailGenerationContext = {
        leadMagnetTitle: selectedConcept.title,
        leadMagnetFormat: selectedConcept.deliveryFormat,
        leadMagnetContents: selectedConcept.contents,
        senderName,
        businessDescription: brandKit?.business_description || input.businessContext.businessDescription,
        bestVideoUrl: brandKit?.best_video_url || undefined,
        bestVideoTitle: brandKit?.best_video_title || undefined,
        contentLinks: brandKit?.content_links as Array<{ title: string; url: string }> | undefined,
        communityUrl: brandKit?.community_url || undefined,
        audienceStyle: 'casual-direct',
      };

      let emails;
      try {
        emails = await generateEmailSequence({ context: emailContext });
      } catch (aiError) {
        logApiError('external/create-lead-magnet/email-ai', aiError, {
          leadMagnetId: leadMagnet.id,
          note: 'Falling back to default sequence',
        });
        emails = generateDefaultEmailSequence(selectedConcept.title, senderName);
      }

      const { error: emailUpsertError } = await supabase
        .from('email_sequences')
        .upsert(
          {
            lead_magnet_id: leadMagnet.id,
            user_id: input.userId,
            emails,
            status: 'draft',
          },
          {
            onConflict: 'lead_magnet_id',
          }
        );

      if (emailUpsertError) {
        logApiError('external/create-lead-magnet/email-save', emailUpsertError, {
          leadMagnetId: leadMagnet.id,
        });
        emailSequenceStatus = 'save_failed';
      } else {
        emailSequenceStatus = 'generated';
      }
    } catch (emailErr) {
      logApiError('external/create-lead-magnet/email', emailErr, {
        userId: input.userId,
        leadMagnetId: leadMagnet.id,
        note: 'Non-critical',
      });
      emailSequenceStatus = 'failed';
    }

    // ==========================================
    // PIPELINE STEP I: Fire GTM deployment webhook (fire-and-forget)
    // ==========================================
    fireGtmLeadMagnetDeployedWebhook({
      leadMagnetId: leadMagnet.id,
      leadMagnetTitle: selectedConcept.title,
      archetype: archetype,
      funnelPageUrl: funnelResult?.url ?? null,
      funnelPageSlug: funnelResult?.slug ?? null,
      scheduledPostId: null,
      postVariations: postResult.variations.map((v) => ({
        hookType: v.hookType,
        post: v.post,
        whyThisAngle: v.whyThisAngle,
      })),
    }).catch(() => {
      // Already logged inside the webhook function — swallow here
    });

    // ==========================================
    // RESPONSE
    // ==========================================
    const elapsed = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        leadMagnetId: leadMagnet.id,
        title: selectedConcept.title,
        archetype: archetype,
        funnelPage: funnelResult,
        postVariations: postResult.variations.map((v) => ({
          hookType: v.hookType,
          post: v.post,
          whyThisAngle: v.whyThisAngle,
        })),
        emailSequence: { status: emailSequenceStatus },
        status: 'created',
        meta: {
          pipelineDurationMs: elapsed,
          conceptSelected: selectedConcept.title,
          topicProvided: input.topic || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logApiError('external/create-lead-magnet', error);
    return ApiErrors.internalError('An unexpected error occurred during lead magnet creation');
  }
}
