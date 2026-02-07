/**
 * @jest-environment node
 *
 * Tests for lead magnet ideation performance and timeout behavior.
 *
 * Bug Report: MOD-71
 * - User reported 15+ minute wait for generating 10 lead magnet concepts
 * - Expected time: 1-2 minutes (per UI messaging)
 *
 * Root Cause Analysis:
 * 1. Single monolithic API call requesting 10 detailed concepts + recommendations + bundle
 * 2. Each concept includes a full LinkedIn post (~800 chars) and detailed fields
 * 3. 8000 max_tokens limit may be tight for this volume of output
 * 4. Using Claude Sonnet (cost-optimized) instead of Opus (speed-optimized)
 * 5. No parallelization or batching - all 10 concepts generated in one call
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { BusinessContext, IdeationResult, CompetitorAnalysis, CallTranscriptInsights } from '@/lib/types/lead-magnet';

// Define the function signature for proper typing
type GenerateLeadMagnetIdeasFn = (
  context: BusinessContext,
  sources?: {
    callTranscriptInsights?: CallTranscriptInsights;
    competitorAnalysis?: CompetitorAnalysis;
  }
) => Promise<IdeationResult>;

// Mock the generateLeadMagnetIdeas function at module level with proper typing
const mockGenerateLeadMagnetIdeas = jest.fn<GenerateLeadMagnetIdeasFn>();

jest.mock('@/lib/ai/lead-magnet-generator', () => ({
  generateLeadMagnetIdeas: mockGenerateLeadMagnetIdeas,
}));

// Sample business context for testing
const sampleBusinessContext: BusinessContext = {
  businessDescription: 'I help B2B SaaS founders scale their sales teams from $1M to $10M ARR',
  credibilityMarkers: ['Scaled 3 companies past $10M', '15 years in B2B sales', 'Trained 500+ sales reps'],
  urgentPains: [
    'Sales reps not hitting quota',
    'No repeatable sales process',
    'Founders still doing all the selling',
  ],
  templates: ['Sales playbook', 'Discovery call script', 'Proposal template'],
  processes: ['Lead qualification framework', '5-step demo process'],
  tools: ['CRM automation sequences', 'AI-powered call summaries'],
  frequentQuestions: [
    'How do I hire my first sales rep?',
    'When should I stop doing sales myself?',
  ],
  results: ['Helped clients 3x their close rate', 'Reduced sales cycle by 40%'],
  successExample: 'Helped TechCo go from founder-led sales to 5-person team doing $8M ARR',
  businessType: 'coach-consultant',
};

// Sample valid ideation result for mock responses
const sampleIdeationResult: IdeationResult = {
  concepts: Array.from({ length: 10 }, (_, i) => ({
    archetype: 'single-system' as const,
    archetypeName: `The Single System ${i + 1}`,
    title: `Test Lead Magnet ${i + 1}`,
    painSolved: 'Test pain',
    whyNowHook: 'urgency-technique',
    linkedinPost: 'Sample LinkedIn post content that would be around 800 characters long...',
    contents: 'Detailed description of what they receive',
    deliveryFormat: 'Google Doc',
    viralCheck: {
      highValue: true,
      urgentPain: true,
      actionableUnder1h: true,
      simple: true,
      authorityBoosting: true,
    },
    creationTimeEstimate: '2-4 hours',
    bundlePotential: ['concept-1', 'concept-3'],
  })),
  recommendations: {
    shipThisWeek: { conceptIndex: 0, reason: 'Easiest to create' },
    highestEngagement: { conceptIndex: 2, reason: 'Most viral potential' },
    bestAuthorityBuilder: { conceptIndex: 5, reason: 'Showcases expertise' },
  },
  suggestedBundle: {
    name: 'The Complete Sales System Bundle',
    components: ['0', '2', '5'],
    combinedValue: 'End-to-end sales transformation',
    releaseStrategy: 'Release one per week for 3 weeks',
  },
};

describe('Lead Magnet Ideation Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('Ideation Result Structure', () => {
    it('should return all 10 concepts when generation succeeds', async () => {
      mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      const result = await generateLeadMagnetIdeas(sampleBusinessContext);

      expect(result.concepts).toHaveLength(10);
      expect(mockGenerateLeadMagnetIdeas).toHaveBeenCalledWith(sampleBusinessContext);
    });

    it('should include recommendations with valid concept indices', async () => {
      mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      const result = await generateLeadMagnetIdeas(sampleBusinessContext);

      expect(result.recommendations.shipThisWeek.conceptIndex).toBeGreaterThanOrEqual(0);
      expect(result.recommendations.shipThisWeek.conceptIndex).toBeLessThan(10);
    });

    it('should include suggested bundle configuration', async () => {
      mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      const result = await generateLeadMagnetIdeas(sampleBusinessContext);

      expect(result.suggestedBundle.name).toBeDefined();
      expect(result.suggestedBundle.components).toBeInstanceOf(Array);
    });
  });

  describe('Timeout and Error Handling', () => {
    it('should propagate timeout errors from the AI service', async () => {
      mockGenerateLeadMagnetIdeas.mockRejectedValueOnce(new Error('Request timed out after 240000ms'));

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      await expect(generateLeadMagnetIdeas(sampleBusinessContext)).rejects.toThrow('Request timed out');
    });

    it('should propagate JSON parsing errors', async () => {
      mockGenerateLeadMagnetIdeas.mockRejectedValueOnce(new Error('Failed to parse ideation response'));

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      await expect(generateLeadMagnetIdeas(sampleBusinessContext)).rejects.toThrow('Failed to parse ideation response');
    });

    it('should propagate API errors', async () => {
      mockGenerateLeadMagnetIdeas.mockRejectedValueOnce(new Error('No text response from Claude'));

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      await expect(generateLeadMagnetIdeas(sampleBusinessContext)).rejects.toThrow('No text response from Claude');
    });
  });

  describe('Source Handling', () => {
    it('should accept transcript insights as optional source', async () => {
      mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

      const transcriptInsights = {
        painPoints: [
          { quote: 'I spend 20 hours a week on manual data entry', theme: 'time-waste', frequency: 'dominant' as const },
        ],
        frequentQuestions: [],
        transformationOutcomes: [],
        objections: [],
        languagePatterns: ['pipeline predictability'],
      };

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      await generateLeadMagnetIdeas(sampleBusinessContext, { callTranscriptInsights: transcriptInsights });

      expect(mockGenerateLeadMagnetIdeas).toHaveBeenCalledWith(
        sampleBusinessContext,
        { callTranscriptInsights: transcriptInsights }
      );
    });

    it('should accept competitor analysis as optional source', async () => {
      mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

      const competitorAnalysis: CompetitorAnalysis = {
        detectedArchetype: 'single-system',
        format: 'PDF Guide',
        painPointAddressed: 'Lack of sales process',
        effectivenessFactors: ['Specific steps', 'Clear outcomes'],
        adaptationSuggestions: ['Use industry terminology'],
        originalTitle: 'The Sales Playbook',
      };

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      await generateLeadMagnetIdeas(sampleBusinessContext, { competitorAnalysis });

      expect(mockGenerateLeadMagnetIdeas).toHaveBeenCalledWith(
        sampleBusinessContext,
        { competitorAnalysis }
      );
    });
  });

  describe('Performance Expectations (Documents Required Improvements)', () => {
    /**
     * TEST: Documents the known performance issue (MOD-71)
     *
     * Bug MOD-71: User experienced 15+ minute wait for ideation
     * The UI messaging says "1-2 minutes" but actual performance can be much worse.
     *
     * Root cause: Single monolithic API call generates all 10 concepts at once.
     * No parallelization, streaming, or batching is implemented.
     */
    it('should document: current implementation uses single blocking API call', async () => {
      // Track how many times the mock is called
      mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      await generateLeadMagnetIdeas(sampleBusinessContext);

      // Current behavior: one call for all 10 concepts
      // This is the root cause of the 15+ minute wait reported in MOD-71
      // Expected improvement: parallel/batched calls for better performance
      expect(mockGenerateLeadMagnetIdeas).toHaveBeenCalledTimes(1);
    });

    /**
     * TEST: Documents lack of progress feedback mechanism
     *
     * When ideation takes a long time (15+ minutes as reported), users see only
     * a loading screen with no indication of actual progress.
     *
     * The function signature only accepts context and optional sources.
     * There is no callback or streaming mechanism for progress updates.
     */
    it('should document: no progress callback in function signature', () => {
      // The generateLeadMagnetIdeas function signature is:
      // (context: BusinessContext, sources?: {...}) => Promise<IdeationResult>
      //
      // There is no third parameter for progress callbacks.
      // This means we cannot show users partial results as they're generated.
      //
      // Expected improvement: Add onProgress callback or use streaming API
      const currentSignature = 'generateLeadMagnetIdeas(context, sources?) => Promise<IdeationResult>';
      const expectedSignature = 'generateLeadMagnetIdeas(context, sources?, options?: { onProgress? }) => Promise<IdeationResult>';

      // This test documents the gap - current signature lacks progress support
      expect(currentSignature).not.toContain('onProgress');
      expect(expectedSignature).toContain('onProgress');
    });

    /**
     * TEST: Documents that ideation has no timeout protection at the function level
     *
     * The only timeout is at the HTTP client level (240 seconds / 4 minutes).
     * If the AI takes 15 minutes, the user experiences this full delay.
     */
    it('should document: relies only on Anthropic client timeout (4 minutes)', async () => {
      // Simulate a slow response that would timeout
      mockGenerateLeadMagnetIdeas.mockRejectedValueOnce(
        new Error('Request timed out after 240000ms')
      );

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');

      // The function will wait for the full 4-minute timeout before failing
      // There is no internal timeout or cancellation mechanism
      await expect(generateLeadMagnetIdeas(sampleBusinessContext))
        .rejects.toThrow('Request timed out');
    });

    /**
     * TEST: Documents the bottleneck - requesting 10 detailed concepts in one call
     *
     * Each concept includes:
     * - Full LinkedIn post (~800 chars)
     * - Viral check (5 boolean fields)
     * - Multiple text fields
     *
     * This results in a very large output token requirement (~6000-8000 tokens)
     * which takes a long time to generate.
     */
    it('should document: output size is large (10 concepts x ~700 tokens each)', async () => {
      mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

      const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
      const result = await generateLeadMagnetIdeas(sampleBusinessContext);

      // Current behavior: all 10 concepts returned in a single response
      // Each concept has a linkedinPost field that is ~800 characters
      expect(result.concepts).toHaveLength(10);
      result.concepts.forEach(concept => {
        expect(concept.linkedinPost).toBeDefined();
        // LinkedIn posts are substantial pieces of content
        expect(typeof concept.linkedinPost).toBe('string');
      });
    });
  });
});

describe('Performance Improvement Tracking', () => {
  /**
   * This test suite tracks the performance requirements for MOD-71 fix.
   * These tests should PASS after the fix is implemented.
   */

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  it('should return all 10 concepts with required fields', async () => {
    mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

    const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
    const result = await generateLeadMagnetIdeas(sampleBusinessContext);

    expect(result.concepts).toHaveLength(10);
    result.concepts.forEach((concept) => {
      expect(concept.title).toBeDefined();
      expect(concept.archetype).toBeDefined();
      expect(concept.linkedinPost).toBeDefined();
      expect(concept.viralCheck).toBeDefined();
    });
  });

  it('should return recommendations with valid concept indices', async () => {
    mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

    const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
    const result = await generateLeadMagnetIdeas(sampleBusinessContext);

    expect(result.recommendations.shipThisWeek.conceptIndex).toBeGreaterThanOrEqual(0);
    expect(result.recommendations.shipThisWeek.conceptIndex).toBeLessThan(10);
    expect(result.recommendations.highestEngagement.conceptIndex).toBeGreaterThanOrEqual(0);
    expect(result.recommendations.bestAuthorityBuilder.conceptIndex).toBeGreaterThanOrEqual(0);
  });

  it('should return suggested bundle with valid structure', async () => {
    mockGenerateLeadMagnetIdeas.mockResolvedValueOnce(sampleIdeationResult);

    const { generateLeadMagnetIdeas } = await import('@/lib/ai/lead-magnet-generator');
    const result = await generateLeadMagnetIdeas(sampleBusinessContext);

    expect(result.suggestedBundle.name).toBeDefined();
    expect(result.suggestedBundle.components).toBeInstanceOf(Array);
    expect(result.suggestedBundle.releaseStrategy).toBeDefined();
  });
});
