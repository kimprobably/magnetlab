'use client';

import type { ExtractedContent } from '@/lib/types/lead-magnet';

interface ExtractedContentRendererProps {
  content: ExtractedContent;
  isDark: boolean;
}

export function ExtractedContentRenderer({
  content,
  isDark,
}: ExtractedContentRendererProps) {
  const textColor = isDark ? '#FAFAFA' : '#09090B';
  const bodyColor = isDark ? '#E4E4E7' : '#27272A';
  const mutedColor = isDark ? '#A1A1AA' : '#71717A';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';

  return (
    <div>
      {content.structure.map((section, sectionIdx) => (
        <section
          key={sectionIdx}
          id={`section-${sectionIdx}`}
          style={{ marginBottom: '2.5rem', scrollMarginTop: '5rem' }}
        >
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: '2rem',
              color: textColor,
              margin: '0 0 1.25rem 0',
            }}
          >
            {section.sectionName}
          </h2>

          {section.contents.map((paragraph, pIdx) => (
            <p
              key={pIdx}
              style={{
                fontSize: '1.125rem',
                lineHeight: '1.875rem',
                color: bodyColor,
                margin: '0 0 1.25rem 0',
              }}
            >
              {paragraph}
            </p>
          ))}

          {sectionIdx < content.structure.length - 1 && (
            <hr
              style={{
                border: 'none',
                borderTop: `1px solid ${borderColor}`,
                margin: '2rem 0 0 0',
              }}
            />
          )}
        </section>
      ))}

      {/* Non-obvious insight */}
      {content.nonObviousInsight && (
        <div
          style={{
            borderLeft: `3px solid #3b82f6`,
            paddingLeft: '1.25rem',
            margin: '2rem 0',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: mutedColor,
              margin: '0 0 0.25rem 0',
            }}
          >
            Key Insight
          </p>
          <p style={{ fontSize: '1.125rem', lineHeight: '1.875rem', color: bodyColor, margin: 0 }}>
            {content.nonObviousInsight}
          </p>
        </div>
      )}
    </div>
  );
}
