'use client';

import { useState } from 'react';
import { ContentHeader } from './ContentHeader';
import { ContentHero } from './ContentHero';
import { TableOfContents } from './TableOfContents';
import { PolishedContentRenderer } from './PolishedContentRenderer';
import { ExtractedContentRenderer } from './ExtractedContentRenderer';
import { ContentFooter } from './ContentFooter';
import { VideoEmbed } from '@/components/funnel/public/VideoEmbed';
import { CalendlyEmbed } from '@/components/funnel/public/CalendlyEmbed';
import type { PolishedContent, ExtractedContent, LeadMagnetConcept } from '@/lib/types/lead-magnet';

interface ContentPageClientProps {
  title: string;
  polishedContent: PolishedContent | null;
  extractedContent: ExtractedContent | null;
  concept: LeadMagnetConcept | null;
  thumbnailUrl: string | null;
  theme: 'dark' | 'light';
  primaryColor: string;
  logoUrl: string | null;
  vslUrl: string | null;
  calendlyUrl: string | null;
}

export function ContentPageClient({
  title,
  polishedContent,
  extractedContent,
  theme: initialTheme,
  primaryColor,
  logoUrl,
  vslUrl,
  calendlyUrl,
}: ContentPageClientProps) {
  const [isDark, setIsDark] = useState(initialTheme === 'dark');

  const bgColor = isDark ? '#09090B' : '#FAFAFA';

  // Build TOC sections
  const tocSections = polishedContent
    ? polishedContent.sections.map((s) => ({ id: s.id, name: s.sectionName }))
    : extractedContent
      ? extractedContent.structure.map((s, i) => ({ id: `section-${i}`, name: s.sectionName }))
      : [];

  const heroSummary = polishedContent?.heroSummary || null;
  const readingTime = polishedContent?.metadata?.readingTimeMinutes || null;
  const wordCount = polishedContent?.metadata?.wordCount || null;

  return (
    <div style={{ background: bgColor, minHeight: '100vh' }}>
      <ContentHeader
        logoUrl={logoUrl}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        {/* Hero */}
        <div style={{ maxWidth: '700px' }}>
          <ContentHero
            title={title}
            heroSummary={heroSummary}
            readingTimeMinutes={readingTime}
            wordCount={wordCount}
            isDark={isDark}
          />
        </div>

        {/* Video */}
        {vslUrl && (
          <div style={{ maxWidth: '700px', marginBottom: '2.5rem' }}>
            <VideoEmbed url={vslUrl} />
          </div>
        )}

        {/* TOC + Content layout */}
        <div style={{ display: 'flex', gap: '3rem' }}>
          {/* Main content */}
          <div style={{ maxWidth: '700px', flex: 1, minWidth: 0 }}>
            {polishedContent ? (
              <PolishedContentRenderer
                content={polishedContent}
                isDark={isDark}
                primaryColor={primaryColor}
              />
            ) : extractedContent ? (
              <ExtractedContentRenderer
                content={extractedContent}
                isDark={isDark}
              />
            ) : null}

            {/* Calendly */}
            {calendlyUrl && (
              <div style={{ marginTop: '3rem' }}>
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: isDark ? '#FAFAFA' : '#09090B',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                  }}
                >
                  Book a Call
                </h2>
                <CalendlyEmbed url={calendlyUrl} />
              </div>
            )}
          </div>

          {/* TOC sidebar */}
          {tocSections.length > 1 && (
            <TableOfContents
              sections={tocSections}
              isDark={isDark}
              primaryColor={primaryColor}
            />
          )}
        </div>
      </div>

      <ContentFooter isDark={isDark} />
    </div>
  );
}
