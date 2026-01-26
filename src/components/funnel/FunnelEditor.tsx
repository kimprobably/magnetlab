'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Save,
  Globe,
  Copy,
  Check,
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
} from 'lucide-react';
import { parseVideoUrl } from '@/lib/types/funnel';

interface QualificationQuestion {
  id?: string;
  questionText: string;
  qualifyingAnswer: boolean;
  displayOrder: number;
}

interface FunnelEditorProps {
  leadMagnetId: string;
  leadMagnetTitle: string;
  username: string;
  initialData?: {
    id: string;
    slug: string;
    optinHeadline: string;
    optinSubline: string | null;
    optinButtonText: string;
    optinTrustText: string;
    thankyouHeadline: string;
    thankyouSubline: string | null;
    vslEmbedUrl: string | null;
    calendlyUrl: string | null;
    rejectionMessage: string;
    published: boolean;
    qualificationQuestions: QualificationQuestion[];
  };
}

export function FunnelEditor({
  leadMagnetId,
  leadMagnetTitle,
  username,
  initialData,
}: FunnelEditorProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  // Form state
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [optinHeadline, setOptinHeadline] = useState(
    initialData?.optinHeadline || ''
  );
  const [optinSubline, setOptinSubline] = useState(
    initialData?.optinSubline || ''
  );
  const [optinButtonText, setOptinButtonText] = useState(
    initialData?.optinButtonText || 'Get Instant Access'
  );
  const [optinTrustText, setOptinTrustText] = useState(
    initialData?.optinTrustText || 'No spam. Unsubscribe anytime.'
  );
  const [thankyouHeadline, setThankyouHeadline] = useState(
    initialData?.thankyouHeadline || "You're In! Check Your Email"
  );
  const [thankyouSubline, setThankyouSubline] = useState(
    initialData?.thankyouSubline || ''
  );
  const [vslEmbedUrl, setVslEmbedUrl] = useState(
    initialData?.vslEmbedUrl || ''
  );
  const [calendlyUrl, setCalendlyUrl] = useState(
    initialData?.calendlyUrl || ''
  );
  const [rejectionMessage, setRejectionMessage] = useState(
    initialData?.rejectionMessage ||
      'Thanks for your interest! Our 1:1 calls are best suited for established businesses.'
  );
  const [qualificationQuestions, setQualificationQuestions] = useState<
    QualificationQuestion[]
  >(initialData?.qualificationQuestions || []);
  const [published, setPublished] = useState(initialData?.published || false);

  // UI state
  const [activeTab, setActiveTab] = useState<'optin' | 'thankyou'>('optin');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pageUrl = slug ? `${window.location.origin}/p/${username}/${slug}` : '';

  // Generate content from AI
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/funnel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadMagnetId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate content');
      }

      const data = await response.json();

      setOptinHeadline(data.optinHeadline);
      setOptinSubline(data.optinSubline);
      setOptinButtonText(data.optinButtonText);
      setThankyouHeadline(data.thankyouHeadline);
      setThankyouSubline(data.thankyouSubline);

      if (data.suggestedQuestions) {
        setQualificationQuestions(
          data.suggestedQuestions.map(
            (
              q: { questionText: string; qualifyingAnswer: boolean },
              i: number
            ) => ({
              questionText: q.questionText,
              qualifyingAnswer: q.qualifyingAnswer,
              displayOrder: i,
            })
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  }, [leadMagnetId]);

  // Save funnel
  const handleSave = useCallback(
    async (shouldPublish?: boolean) => {
      setSaving(true);
      setError(null);

      const publishState = shouldPublish !== undefined ? shouldPublish : published;

      try {
        const url = isEditing
          ? `/api/funnel/${initialData.id}`
          : '/api/funnel';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadMagnetId,
            slug,
            optinHeadline,
            optinSubline: optinSubline || null,
            optinButtonText,
            optinTrustText,
            thankyouHeadline,
            thankyouSubline: thankyouSubline || null,
            vslEmbedUrl: vslEmbedUrl || null,
            calendlyUrl: calendlyUrl || null,
            rejectionMessage,
            published: publishState,
            qualificationQuestions: qualificationQuestions.map((q, i) => ({
              ...q,
              displayOrder: i,
            })),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save');
        }

        const data = await response.json();
        setPublished(publishState);

        if (!isEditing) {
          // Redirect to edit page after creation
          router.push(`/library/${leadMagnetId}/funnel`);
          router.refresh();
        } else {
          router.refresh();
        }

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [
      isEditing,
      initialData?.id,
      leadMagnetId,
      slug,
      optinHeadline,
      optinSubline,
      optinButtonText,
      optinTrustText,
      thankyouHeadline,
      thankyouSubline,
      vslEmbedUrl,
      calendlyUrl,
      rejectionMessage,
      qualificationQuestions,
      published,
      router,
    ]
  );

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(() => {
    if (pageUrl) {
      navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pageUrl]);

  // Add question
  const addQuestion = useCallback(() => {
    setQualificationQuestions((prev) => [
      ...prev,
      {
        questionText: '',
        qualifyingAnswer: true,
        displayOrder: prev.length,
      },
    ]);
  }, []);

  // Remove question
  const removeQuestion = useCallback((index: number) => {
    setQualificationQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update question
  const updateQuestion = useCallback(
    (index: number, updates: Partial<QualificationQuestion>) => {
      setQualificationQuestions((prev) =>
        prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
      );
    },
    []
  );

  const videoEmbed = vslEmbedUrl ? parseVideoUrl(vslEmbedUrl) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isEditing ? 'Edit Funnel' : 'Create Funnel'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            For: {leadMagnetTitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100
                         font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Auto-Generate Copy'}
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving || !optinHeadline}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100
                       font-medium rounded-lg transition-colors disabled:opacity-50
                       flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !optinHeadline || !slug}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white
                       font-medium rounded-lg transition-colors disabled:opacity-50
                       flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            {published ? 'Update & Publish' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* URL preview */}
      {isEditing && slug && (
        <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
          <span className="text-sm text-muted-foreground">Page URL:</span>
          <code className="text-sm text-foreground flex-1">{pageUrl}</code>
          <button
            onClick={handleCopyUrl}
            className="p-2 hover:bg-zinc-800 rounded transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-400" />
            )}
          </button>
          {published && (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-zinc-800 rounded transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-zinc-400" />
            </a>
          )}
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab('optin')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'optin'
                ? 'border-violet-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Opt-in Page
          </button>
          <button
            onClick={() => setActiveTab('thankyou')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'thankyou'
                ? 'border-violet-500 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Thank-You Page
          </button>
        </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'optin' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-')
                      )
                    }
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                               text-foreground placeholder:text-muted-foreground
                               focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                               outline-none transition-colors"
                    placeholder="my-lead-magnet"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={optinHeadline}
                    onChange={(e) => setOptinHeadline(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                               text-foreground placeholder:text-muted-foreground
                               focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                               outline-none transition-colors"
                    placeholder="Your compelling headline"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Subline
                  </label>
                  <textarea
                    value={optinSubline}
                    onChange={(e) => setOptinSubline(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                               text-foreground placeholder:text-muted-foreground
                               focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                               outline-none transition-colors resize-none"
                    placeholder="A brief description of what they'll get"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={optinButtonText}
                    onChange={(e) => setOptinButtonText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                               text-foreground placeholder:text-muted-foreground
                               focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                               outline-none transition-colors"
                    placeholder="Get Instant Access"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Trust Text
                  </label>
                  <input
                    type="text"
                    value={optinTrustText}
                    onChange={(e) => setOptinTrustText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                               text-foreground placeholder:text-muted-foreground
                               focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                               outline-none transition-colors"
                    placeholder="No spam. Unsubscribe anytime."
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-6 min-h-[400px] flex items-center justify-center">
                <div className="w-full max-w-sm text-center">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {optinHeadline || 'Your Headline'}
                  </h2>
                  {optinSubline && (
                    <p className="text-zinc-400 text-sm mb-6">{optinSubline}</p>
                  )}
                  <div className="space-y-3">
                    <div className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg" />
                    <div className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg" />
                    <div className="w-full h-10 bg-violet-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {optinButtonText || 'Submit'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-4">
                    {optinTrustText || 'Trust text'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Thank-you settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Thank-You Headline
                    </label>
                    <input
                      type="text"
                      value={thankyouHeadline}
                      onChange={(e) => setThankyouHeadline(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                                 text-foreground placeholder:text-muted-foreground
                                 focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                 outline-none transition-colors"
                      placeholder="You're In! Check Your Email"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Thank-You Subline
                    </label>
                    <textarea
                      value={thankyouSubline}
                      onChange={(e) => setThankyouSubline(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                                 text-foreground placeholder:text-muted-foreground
                                 focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                 outline-none transition-colors resize-none"
                      placeholder="Your download is on its way"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Video URL (YouTube, Loom, Vimeo, Wistia)
                    </label>
                    <input
                      type="url"
                      value={vslEmbedUrl}
                      onChange={(e) => setVslEmbedUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                                 text-foreground placeholder:text-muted-foreground
                                 focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                 outline-none transition-colors"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    {videoEmbed?.provider !== 'unknown' && videoEmbed?.embedUrl && (
                      <p className="text-xs text-green-400 mt-1">
                        {videoEmbed.provider} video detected
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Calendly URL
                    </label>
                    <input
                      type="url"
                      value={calendlyUrl}
                      onChange={(e) => setCalendlyUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                                 text-foreground placeholder:text-muted-foreground
                                 focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                 outline-none transition-colors"
                      placeholder="https://calendly.com/your-link"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Rejection Message
                    </label>
                    <textarea
                      value={rejectionMessage}
                      onChange={(e) => setRejectionMessage(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg
                                 text-foreground placeholder:text-muted-foreground
                                 focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                 outline-none transition-colors resize-none"
                      placeholder="Message shown when visitor doesn't qualify"
                    />
                  </div>
                </div>

                {/* Video preview */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Video Preview
                  </h3>
                  <div className="aspect-video bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                    {videoEmbed?.embedUrl ? (
                      <iframe
                        src={videoEmbed.embedUrl}
                        className="w-full h-full"
                        title="Video preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <Eye className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Qualification questions */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Qualification Questions
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Visitors must answer these to see your Calendly link
                    </p>
                  </div>
                  <button
                    onClick={addQuestion}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100
                               text-sm font-medium rounded-lg transition-colors
                               flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </button>
                </div>

                <div className="space-y-3">
                  {qualificationQuestions.map((question, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border"
                    >
                      <button className="p-1 text-muted-foreground cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={question.questionText}
                          onChange={(e) =>
                            updateQuestion(index, {
                              questionText: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg
                                     text-foreground text-sm placeholder:text-muted-foreground
                                     focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                     outline-none transition-colors"
                          placeholder="Enter your question"
                        />
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">
                            Qualifying answer:
                          </span>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`qualifying-${index}`}
                              checked={question.qualifyingAnswer === true}
                              onChange={() =>
                                updateQuestion(index, { qualifyingAnswer: true })
                              }
                              className="text-violet-500 focus:ring-violet-500"
                            />
                            <span className="text-sm text-foreground">Yes</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`qualifying-${index}`}
                              checked={question.qualifyingAnswer === false}
                              onChange={() =>
                                updateQuestion(index, { qualifyingAnswer: false })
                              }
                              className="text-violet-500 focus:ring-violet-500"
                            />
                            <span className="text-sm text-foreground">No</span>
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {qualificationQuestions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No qualification questions yet.</p>
                      <p className="text-xs mt-1">
                        Without questions, visitors will see the Calendly embed
                        immediately.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
