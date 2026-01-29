'use client';

import { Clock, FileText } from 'lucide-react';

interface ContentHeroProps {
  title: string;
  heroSummary: string | null;
  readingTimeMinutes: number | null;
  wordCount: number | null;
  isDark: boolean;
}

export function ContentHero({
  title,
  heroSummary,
  readingTimeMinutes,
  wordCount,
  isDark,
}: ContentHeroProps) {
  const textColor = isDark ? '#FAFAFA' : '#09090B';
  const bodyColor = isDark ? '#E4E4E7' : '#27272A';
  const mutedColor = isDark ? '#A1A1AA' : '#71717A';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: '2.5rem',
          color: textColor,
          margin: '0 0 1rem 0',
        }}
      >
        {title}
      </h1>

      {heroSummary && (
        <p
          style={{
            fontSize: '1.125rem',
            lineHeight: '1.75rem',
            color: bodyColor,
            margin: '0 0 1.25rem 0',
          }}
        >
          {heroSummary}
        </p>
      )}

      {(readingTimeMinutes || wordCount) && (
        <div
          style={{
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'center',
            color: mutedColor,
            fontSize: '0.875rem',
          }}
        >
          {readingTimeMinutes && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Clock size={14} />
              {readingTimeMinutes} min read
            </span>
          )}
          {wordCount && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <FileText size={14} />
              {wordCount.toLocaleString()} words
            </span>
          )}
        </div>
      )}

      <hr
        style={{
          border: 'none',
          borderTop: `1px solid ${borderColor}`,
          marginTop: '1.5rem',
        }}
      />
    </div>
  );
}
