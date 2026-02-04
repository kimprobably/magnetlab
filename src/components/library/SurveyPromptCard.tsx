'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurveyPromptCardProps {
  funnelSlug: string;
  username: string;
  leadId: string;
  isDark: boolean;
  primaryColor: string;
}

export function SurveyPromptCard({
  funnelSlug,
  username,
  leadId,
  isDark,
  primaryColor,
}: SurveyPromptCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const surveyUrl = `/p/${username}/${funnelSlug}/qualify?leadId=${leadId}`;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div
        className={cn(
          'relative rounded-lg border p-4 shadow-lg',
          isDark
            ? 'border-gray-700 bg-gray-900'
            : 'border-gray-200 bg-white'
        )}
      >
        <button
          onClick={() => setDismissed(true)}
          className={cn(
            'absolute right-2 top-2 rounded p-1 transition-colors',
            isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
          )}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Calendar className="h-5 w-5" style={{ color: primaryColor }} />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Ready for a conversation?</h3>
            <p
              className={cn(
                'mt-1 text-sm',
                isDark ? 'text-gray-400' : 'text-gray-500'
              )}
            >
              Answer a few quick questions to book a call.
            </p>
            <Link
              href={surveyUrl}
              className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <Calendar className="h-4 w-4" />
              Take Survey
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
