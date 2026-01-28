'use client';

import { useState } from 'react';
import { ChevronDown, Check, Loader2, X, FileText, Users } from 'lucide-react';
import type {
  IdeationSources,
  CallTranscriptInsights,
  CompetitorAnalysis,
} from '@/lib/types/lead-magnet';

interface IdeationSourcesPanelProps {
  sources: IdeationSources;
  onSourcesChange: (sources: IdeationSources) => void;
}

export function IdeationSourcesPanel({
  sources,
  onSourcesChange,
}: IdeationSourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcriptText, setTranscriptText] = useState(sources.callTranscript?.raw || '');
  const [competitorText, setCompetitorText] = useState(sources.competitorInspiration?.raw || '');
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const [showTranscriptInsights, setShowTranscriptInsights] = useState(false);
  const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState(false);

  const handleAnalyzeTranscript = async () => {
    if (!transcriptText.trim()) return;

    setTranscriptLoading(true);
    setTranscriptError(null);

    try {
      const response = await fetch('/api/lead-magnet/analyze-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze transcript');
      }

      onSourcesChange({
        ...sources,
        callTranscript: {
          raw: transcriptText,
          insights: data.insights as CallTranscriptInsights,
        },
      });
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleAnalyzeCompetitor = async () => {
    if (!competitorText.trim()) return;

    setCompetitorLoading(true);
    setCompetitorError(null);

    try {
      const response = await fetch('/api/lead-magnet/analyze-competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: competitorText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze content');
      }

      onSourcesChange({
        ...sources,
        competitorInspiration: {
          raw: competitorText,
          analysis: data.analysis as CompetitorAnalysis,
        },
      });
    } catch (error) {
      setCompetitorError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setCompetitorLoading(false);
    }
  };

  const clearTranscript = () => {
    setTranscriptText('');
    setTranscriptError(null);
    const newSources = { ...sources };
    delete newSources.callTranscript;
    onSourcesChange(newSources);
  };

  const clearCompetitor = () => {
    setCompetitorText('');
    setCompetitorError(null);
    const newSources = { ...sources };
    delete newSources.competitorInspiration;
    onSourcesChange(newSources);
  };

  const transcriptInsights = sources.callTranscript?.insights;
  const competitorAnalysis = sources.competitorInspiration?.analysis;

  const hasAnySources = transcriptInsights || competitorAnalysis;

  return (
    <div className="mt-6 rounded-lg border border-border overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Add More Context (Optional)
          </span>
          {hasAnySources && (
            <span className="px-1.5 py-0.5 text-xs bg-green-500/10 text-green-600 rounded">
              {[transcriptInsights && 'Transcript', competitorAnalysis && 'Inspiration'].filter(Boolean).join(' + ')}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="p-4 space-y-6 border-t border-border">
          {/* Call Transcript Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Call Transcript</h4>
              </div>
              {transcriptInsights && (
                <button
                  type="button"
                  onClick={clearTranscript}
                  className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            {!transcriptInsights ? (
              <>
                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste a sales or coaching call transcript to extract pain points, questions, and customer language..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-muted/50 dark:bg-muted/20 px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                />
                {transcriptError && (
                  <p className="text-xs text-destructive">{transcriptError}</p>
                )}
                <button
                  type="button"
                  onClick={handleAnalyzeTranscript}
                  disabled={transcriptLoading || !transcriptText.trim()}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {transcriptLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Transcript'
                  )}
                </button>
              </>
            ) : (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">
                      Extracted: {transcriptInsights.painPoints.length} pain points,{' '}
                      {transcriptInsights.frequentQuestions.length} FAQs
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTranscriptInsights(!showTranscriptInsights)}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    {showTranscriptInsights ? 'Hide' : 'View'}
                  </button>
                </div>

                {showTranscriptInsights && (
                  <div className="mt-3 space-y-3 text-sm border-t border-green-500/20 pt-3">
                    {transcriptInsights.painPoints.length > 0 && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Pain Points:</p>
                        <ul className="space-y-1 text-muted-foreground">
                          {transcriptInsights.painPoints.map((p, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-muted-foreground/50">•</span>
                              <span>&ldquo;{p.quote}&rdquo; <span className="text-muted-foreground/70">({p.frequency})</span></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {transcriptInsights.frequentQuestions.length > 0 && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Questions:</p>
                        <ul className="space-y-1 text-muted-foreground">
                          {transcriptInsights.frequentQuestions.map((q, i) => (
                            <li key={i}>• {q.question}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {transcriptInsights.languagePatterns.length > 0 && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Language Patterns:</p>
                        <div className="flex flex-wrap gap-1">
                          {transcriptInsights.languagePatterns.map((phrase, i) => (
                            <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">
                              {phrase}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Inspiration Post Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Inspiration Post</h4>
              </div>
              {competitorAnalysis && (
                <button
                  type="button"
                  onClick={clearCompetitor}
                  className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            {!competitorAnalysis ? (
              <>
                <textarea
                  value={competitorText}
                  onChange={(e) => setCompetitorText(e.target.value)}
                  placeholder="Paste a competitor's post or lead magnet description to analyze what makes it effective..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-muted/50 dark:bg-muted/20 px-4 py-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                />
                {competitorError && (
                  <p className="text-xs text-destructive">{competitorError}</p>
                )}
                <button
                  type="button"
                  onClick={handleAnalyzeCompetitor}
                  disabled={competitorLoading || !competitorText.trim()}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {competitorLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze'
                  )}
                </button>
              </>
            ) : (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">
                      Detected: {competitorAnalysis.detectedArchetype || 'Unknown'} archetype
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCompetitorAnalysis(!showCompetitorAnalysis)}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    {showCompetitorAnalysis ? 'Hide' : 'View'}
                  </button>
                </div>

                <p className="mt-2 text-sm text-muted-foreground italic">
                  &ldquo;{competitorAnalysis.adaptationSuggestions[0]}&rdquo;
                </p>

                {showCompetitorAnalysis && (
                  <div className="mt-3 space-y-3 text-sm border-t border-green-500/20 pt-3">
                    <div>
                      <p className="text-muted-foreground font-medium mb-1">Original Title:</p>
                      <p className="text-muted-foreground">&ldquo;{competitorAnalysis.originalTitle}&rdquo;</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium mb-1">Format:</p>
                      <p className="text-muted-foreground">{competitorAnalysis.format}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium mb-1">Pain Point Addressed:</p>
                      <p className="text-muted-foreground">{competitorAnalysis.painPointAddressed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium mb-1">Why It Works:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {competitorAnalysis.effectivenessFactors.map((factor, i) => (
                          <li key={i}>• {factor}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium mb-1">Adaptation Ideas:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {competitorAnalysis.adaptationSuggestions.map((suggestion, i) => (
                          <li key={i}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
