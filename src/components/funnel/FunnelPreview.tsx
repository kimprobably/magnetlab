'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';
import type { QualificationQuestion, FunnelTheme, BackgroundStyle } from '@/lib/types/funnel';

interface FunnelPreviewProps {
  headline: string;
  subline: string;
  buttonText: string;
  socialProof: string;
  questions: QualificationQuestion[];
  theme?: FunnelTheme;
  primaryColor?: string;
  backgroundStyle?: BackgroundStyle;
  logoUrl?: string | null;
}

export function FunnelPreview({
  headline,
  subline,
  buttonText,
  socialProof,
  questions,
  theme = 'dark',
  primaryColor = '#8b5cf6',
  backgroundStyle = 'solid',
  logoUrl,
}: FunnelPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Theme-based colors
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#09090B' : '#FAFAFA';
  const textColor = isDark ? '#FAFAFA' : '#09090B';
  const mutedColor = isDark ? '#A1A1AA' : '#71717A';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';
  const inputBg = isDark ? '#09090B' : '#FFFFFF';
  const placeholderColor = isDark ? '#71717A' : '#A1A1AA';
  const browserBg = isDark ? '#18181B' : '#F4F4F5';
  const browserBorder = isDark ? '#27272A' : '#E4E4E7';

  // Background style
  const getBackgroundStyle = () => {
    if (backgroundStyle === 'gradient') {
      return isDark
        ? `linear-gradient(135deg, ${bgColor} 0%, #18181B 50%, ${bgColor} 100%)`
        : `linear-gradient(135deg, ${bgColor} 0%, #FFFFFF 50%, ${bgColor} 100%)`;
    }
    if (backgroundStyle === 'pattern') {
      return isDark
        ? `radial-gradient(circle at 50% 50%, ${primaryColor}15 0%, transparent 50%), ${bgColor}`
        : `radial-gradient(circle at 50% 50%, ${primaryColor}15 0%, transparent 50%), ${bgColor}`;
    }
    return bgColor;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Preview
        </h3>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'desktop'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'mobile'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Preview Container - Linear Dark Style */}
      <div
        className={`rounded-xl border overflow-hidden transition-all duration-300 ${
          viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : ''
        }`}
      >
        {/* Simulated Browser Chrome */}
        <div
          className="px-4 py-2 flex items-center gap-2"
          style={{
            background: browserBg,
            borderBottom: `1px solid ${browserBorder}`
          }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: borderColor }} />
            <div className="w-3 h-3 rounded-full" style={{ background: borderColor }} />
            <div className="w-3 h-3 rounded-full" style={{ background: borderColor }} />
          </div>
          <div className="flex-1 mx-4">
            <div
              className="rounded-md px-3 py-1 text-xs text-center"
              style={{ background: isDark ? '#27272A' : '#E4E4E7', color: mutedColor }}
            >
              magnetlab.app/p/username/your-page
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div
          className="min-h-[400px] p-6 flex flex-col items-center justify-center text-center"
          style={{ background: getBackgroundStyle() }}
        >
          {/* Main Content */}
          <div className="max-w-md space-y-6">
            {/* Logo */}
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-10 w-auto mx-auto"
              />
            )}

            {/* Headline */}
            <h1
              className="text-2xl font-semibold leading-tight"
              style={{ color: textColor }}
            >
              {headline || 'Your Headline Here'}
            </h1>

            {/* Subline */}
            {subline && (
              <p
                className="text-base leading-relaxed"
                style={{ color: mutedColor }}
              >
                {subline}
              </p>
            )}

            {/* Email Form Preview */}
            <div className="space-y-3 w-full max-w-sm mx-auto">
              <div
                className="rounded-lg px-4 py-3 text-sm text-left"
                style={{
                  background: inputBg,
                  border: `1px solid ${borderColor}`,
                  color: placeholderColor,
                }}
              >
                Enter your email...
              </div>

              <button
                className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors"
                style={{
                  background: primaryColor,
                  color: '#FFFFFF',
                }}
              >
                {buttonText || 'Get Free Access'}
              </button>
            </div>

            {/* Social Proof */}
            {socialProof && (
              <p
                className="text-xs"
                style={{ color: placeholderColor }}
              >
                {socialProof}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Questions Preview */}
      {questions.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Qualification Flow Preview
          </h4>
          <div className="space-y-2">
            {questions.slice(0, 3).map((q, i) => (
              <div
                key={q.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="text-muted-foreground truncate">
                  {q.questionText}
                </span>
                <span className="ml-auto text-xs text-green-600 dark:text-green-400">
                  {q.qualifyingAnswer === 'yes' ? 'Yes' : 'No'} = Qualified
                </span>
              </div>
            ))}
            {questions.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{questions.length - 3} more questions...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
