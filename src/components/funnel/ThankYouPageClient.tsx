'use client';

import { useState, useEffect } from 'react';
import { parseVideoUrl } from '@/lib/types/funnel';

interface QualificationQuestion {
  id: string;
  question_text: string;
  qualifying_answer: boolean;
  display_order: number;
}

interface ThankYouPageClientProps {
  funnelPageId: string;
  leadId?: string;
  headline: string;
  subline: string | null;
  vslEmbedUrl: string | null;
  calendlyUrl: string | null;
  rejectionMessage: string;
  qualificationQuestions: QualificationQuestion[];
}

export function ThankYouPageClient({
  funnelPageId,
  leadId,
  headline,
  subline,
  vslEmbedUrl,
  calendlyUrl,
  rejectionMessage,
  qualificationQuestions,
}: ThankYouPageClientProps) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [qualificationStatus, setQualificationStatus] = useState<
    'pending' | 'qualified' | 'not_qualified' | 'no_questions'
  >(qualificationQuestions.length === 0 ? 'no_questions' : 'pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoEmbed = vslEmbedUrl ? parseVideoUrl(vslEmbedUrl) : null;

  // Check if all questions are answered
  const allQuestionsAnswered =
    qualificationQuestions.length > 0 &&
    qualificationQuestions.every((q) => answers[q.id] !== undefined);

  // Submit qualification answers
  useEffect(() => {
    if (allQuestionsAnswered && leadId && qualificationStatus === 'pending') {
      submitQualification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allQuestionsAnswered]);

  const submitQualification = async () => {
    if (!leadId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leads/qualify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          funnelPageId,
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setQualificationStatus(data.qualified ? 'qualified' : 'not_qualified');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Show Calendly if qualified or no questions
  const showCalendly =
    calendlyUrl &&
    (qualificationStatus === 'qualified' || qualificationStatus === 'no_questions');

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Success message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">{headline}</h1>
          {subline && <p className="text-zinc-400">{subline}</p>}
        </div>

        {/* VSL embed */}
        {videoEmbed?.embedUrl && (
          <div className="aspect-video bg-zinc-900 rounded-lg border border-zinc-800 mb-8 overflow-hidden">
            <iframe
              className="w-full h-full"
              src={videoEmbed.embedUrl}
              title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Qualification section */}
        {qualificationQuestions.length > 0 && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              Want to Chat About Your Specific Situation?
            </h2>

            {/* Qualification questions */}
            <div className="space-y-4 mb-6">
              {qualificationQuestions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg"
                >
                  <span className="text-sm text-zinc-300">
                    {question.question_text}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAnswer(question.id, true)}
                      disabled={loading}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        answers[question.id] === true
                          ? 'bg-violet-500 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleAnswer(question.id, false)}
                      disabled={loading}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        answers[question.id] === false
                          ? 'bg-zinc-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {loading && (
              <div className="p-4 bg-zinc-950 rounded-lg text-center">
                <p className="text-sm text-zinc-400">Checking eligibility...</p>
              </div>
            )}

            {/* Not qualified message */}
            {qualificationStatus === 'not_qualified' && (
              <div className="p-4 bg-zinc-950 rounded-lg">
                <p className="text-sm text-zinc-400">{rejectionMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Calendly embed (shown when qualified or no questions) */}
        {showCalendly && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">
                Schedule Your Call
              </h2>
              <p className="text-sm text-zinc-400">
                Choose a time that works best for you.
              </p>
            </div>
            <div className="h-[600px]">
              <iframe
                src={calendlyUrl}
                className="w-full h-full"
                title="Schedule a call"
              />
            </div>
          </div>
        )}

        {/* No Calendly configured but qualified */}
        {!calendlyUrl &&
          (qualificationStatus === 'qualified' ||
            qualificationStatus === 'no_questions') && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
              <p className="text-green-300">
                Thank you for your responses! We&apos;ll be in touch soon.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
