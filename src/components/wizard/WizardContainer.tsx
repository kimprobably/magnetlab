'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContextStep } from './steps/ContextStep';
import { IdeationStep } from './steps/IdeationStep';
import { ExtractionStep } from './steps/ExtractionStep';
import { ContentStep } from './steps/ContentStep';
import { PostStep } from './steps/PostStep';
import { PublishStep } from './steps/PublishStep';
import { GeneratingScreen } from './GeneratingScreen';
import { WizardProgress } from './WizardProgress';
import type {
  WizardState,
  BusinessContext,
  IdeationResult,
  ExtractedContent,
  PostWriterResult,
  LeadMagnetArchetype,
  LeadMagnetConcept,
} from '@/lib/types/lead-magnet';

type GeneratingState = 'idle' | 'ideas' | 'extraction' | 'posts';

const INITIAL_STATE: WizardState = {
  currentStep: 1,
  brandKit: {},
  ideationResult: null,
  selectedConceptIndex: null,
  extractionAnswers: {},
  chatMessages: [],
  extractedContent: null,
  postResult: null,
  selectedPostIndex: null,
};

export function WizardContainer() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [generating, setGenerating] = useState<GeneratingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
    setError(null);
  }, []);

  const handleContextSubmit = useCallback(async (context: BusinessContext) => {
    setGenerating('ideas');
    setError(null);

    try {
      // Save business context to brand_kit
      const brandKitResponse = await fetch('/api/brand-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!brandKitResponse.ok) {
        console.warn('Failed to save brand kit, continuing anyway');
      }

      // Generate lead magnet ideas
      const response = await fetch('/api/lead-magnet/ideate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate ideas');
      }

      const ideationResult: IdeationResult = await response.json();

      setState((prev) => ({
        ...prev,
        brandKit: context,
        ideationResult,
        currentStep: 2,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Go back to step 1 on error
      setState((prev) => ({ ...prev, currentStep: 1 }));
    } finally {
      setGenerating('idle');
    }
  }, []);

  const handleConceptSelect = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedConceptIndex: index,
      currentStep: 3,
    }));
  }, []);

  const handleExtractionComplete = useCallback(async (
    answers: Record<string, string>,
    archetype: LeadMagnetArchetype,
    concept: LeadMagnetConcept
  ) => {
    setGenerating('extraction');
    setError(null);

    try {
      const response = await fetch('/api/lead-magnet/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archetype, concept, answers }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process extraction');
      }

      const extractedContent: ExtractedContent = await response.json();

      setState((prev) => ({
        ...prev,
        extractionAnswers: answers,
        extractedContent,
        currentStep: 4,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGenerating('idle');
    }
  }, []);

  const handleContentApprove = useCallback(async () => {
    if (!state.extractedContent || !state.ideationResult || state.selectedConceptIndex === null) {
      return;
    }

    setGenerating('posts');
    setError(null);

    try {
      const concept = state.ideationResult.concepts[state.selectedConceptIndex];

      const response = await fetch('/api/lead-magnet/write-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadMagnetTitle: state.extractedContent.title,
          format: state.extractedContent.format,
          contents: state.extractedContent.structure
            .map((s) => `${s.sectionName}: ${s.contents.join(', ')}`)
            .join('; '),
          problemSolved: concept.painSolved,
          credibility: (state.brandKit.credibilityMarkers || []).join(', '),
          audience: state.brandKit.businessType || 'B2B professionals',
          audienceStyle: 'casual-direct',
          proof: state.extractedContent.proof,
          ctaWord: 'LINK',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate posts');
      }

      const postResult: PostWriterResult = await response.json();

      setState((prev) => ({
        ...prev,
        postResult,
        currentStep: 5,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGenerating('idle');
    }
  }, [state.extractedContent, state.ideationResult, state.selectedConceptIndex, state.brandKit]);

  const handlePostSelect = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedPostIndex: index,
      currentStep: 6,
    }));
  }, []);

  const selectedConcept =
    state.ideationResult && state.selectedConceptIndex !== null
      ? state.ideationResult.concepts[state.selectedConceptIndex]
      : null;

  const selectedPost =
    state.postResult && state.selectedPostIndex !== null
      ? state.postResult.variations[state.selectedPostIndex]
      : null;

  // Show generating screen when generating ideas
  if (generating === 'ideas') {
    return (
      <div className="min-h-screen bg-background">
        <WizardProgress currentStep={1} />
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <GeneratingScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WizardProgress currentStep={state.currentStep} />

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {state.currentStep === 1 && (
              <ContextStep
                initialData={state.brandKit}
                onSubmit={handleContextSubmit}
                loading={generating !== 'idle'}
              />
            )}

            {state.currentStep === 2 && state.ideationResult && (
              <IdeationStep
                result={state.ideationResult}
                onSelect={handleConceptSelect}
                onBack={() => goToStep(1)}
              />
            )}

            {state.currentStep === 3 && selectedConcept && (
              <ExtractionStep
                concept={selectedConcept}
                initialAnswers={state.extractionAnswers}
                onComplete={handleExtractionComplete}
                onBack={() => goToStep(2)}
                loading={generating === 'extraction'}
              />
            )}

            {state.currentStep === 4 && state.extractedContent && (
              <ContentStep
                content={state.extractedContent}
                onApprove={handleContentApprove}
                onBack={() => goToStep(3)}
                loading={generating === 'posts'}
              />
            )}

            {state.currentStep === 5 && state.postResult && (
              <PostStep
                result={state.postResult}
                onSelect={handlePostSelect}
                onBack={() => goToStep(4)}
              />
            )}

            {state.currentStep === 6 && selectedPost && state.extractedContent && (
              <PublishStep
                content={state.extractedContent}
                post={selectedPost}
                dmTemplate={state.postResult?.dmTemplate || ''}
                ctaWord={state.postResult?.ctaWord || ''}
                concept={selectedConcept!}
                onBack={() => goToStep(5)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
