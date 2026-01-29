'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

// ============================================
// Types
// ============================================

type ContentBlockType =
  | 'testimonial'
  | 'case_study'
  | 'feature'
  | 'benefit'
  | 'faq'
  | 'pricing'
  | 'cta';

interface ContentBlock {
  id: string;
  blockType: ContentBlockType;
  title?: string;
  content?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  sortOrder: number;
  isVisible: boolean;
}

interface MarketingBlockProps {
  block: ContentBlock | null | undefined;
  className?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ContentWithItems {
  title?: string;
  body?: string;
  items?: FAQItem[];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse plain-text FAQ content into structured items.
 * Detects patterns like "**Question?**\nAnswer text" separated by double newlines.
 */
function parsePlainTextFAQ(content: string): FAQItem[] | null {
  const blocks = content.split(/\n\n+/).filter((b) => b.trim());
  const items: FAQItem[] = [];

  for (const block of blocks) {
    const match = block.match(/^\*\*(.+?)\*\*\s*\n([\s\S]+)$/);
    if (match) {
      items.push({ question: match[1].trim(), answer: match[2].trim() });
    }
  }

  return items.length > 0 ? items : null;
}

/**
 * Parse content that could be a string or JSON object
 */
function parseContent(content: string | undefined): string | ContentWithItems {
  if (!content) return '';

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as ContentWithItems;
    }
    return String(parsed);
  } catch {
    return content;
  }
}

/**
 * Simple markdown-like rendering
 * Supports: paragraphs (\n\n), bold (**text**), italic (*text*), bullet lists (- item)
 */
function renderSimpleMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((paragraph, pIndex) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return null;

    const lines = trimmed.split('\n');
    const isBulletList = lines.every(
      (line) => line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim() === ''
    );

    if (
      isBulletList &&
      lines.some((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
    ) {
      const listItems = lines
        .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map((line) => line.trim().replace(/^[-*]\s+/, ''));

      return (
        <ul
          key={pIndex}
          className="list-disc list-inside space-y-2 mb-4 text-zinc-600 dark:text-zinc-400"
        >
          {listItems.map((item, lIndex) => (
            <li key={lIndex}>{renderInlineFormatting(item)}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={pIndex} className="mb-4 last:mb-0">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });
}

/**
 * Render inline formatting (bold, italic)
 */
function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

    let matchToUse: RegExpMatchArray | null = null;
    let isBold = false;

    if (boldMatch && italicMatch) {
      if (boldMatch.index! <= italicMatch.index!) {
        matchToUse = boldMatch;
        isBold = true;
      } else {
        matchToUse = italicMatch;
      }
    } else if (boldMatch) {
      matchToUse = boldMatch;
      isBold = true;
    } else if (italicMatch) {
      matchToUse = italicMatch;
    }

    if (matchToUse && matchToUse.index !== undefined) {
      if (matchToUse.index > 0) {
        parts.push(remaining.slice(0, matchToUse.index));
      }

      if (isBold) {
        parts.push(
          <strong key={keyIndex++} className="font-semibold text-zinc-800 dark:text-zinc-200">
            {matchToUse[1]}
          </strong>
        );
      } else {
        parts.push(
          <em key={keyIndex++} className="italic">
            {matchToUse[1]}
          </em>
        );
      }

      remaining = remaining.slice(matchToUse.index + matchToUse[0].length);
    } else {
      parts.push(remaining);
      remaining = '';
    }
  }

  return parts.length === 1 ? parts[0] : parts;
}

// ============================================
// FAQ Accordion Component
// ============================================

interface FAQAccordionProps {
  items: FAQItem[];
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
        >
          <button
            type="button"
            onClick={() => toggleItem(index)}
            className="w-full flex items-center justify-between p-4 text-left bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-colors"
            aria-expanded={openIndex === index}
          >
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.question}</span>
            {openIndex === index ? (
              <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            )}
          </button>
          {openIndex === index && (
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">
              <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {renderSimpleMarkdown(item.answer)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================
// Inline CTA Link Component
// ============================================

interface InlineCTAProps {
  text: string;
  url: string;
}

const InlineCTA: React.FC<InlineCTAProps> = ({ text, url }) => {
  const isExternal = url.startsWith('http://') || url.startsWith('https://');

  return (
    <a
      href={url}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors mt-4"
    >
      {text}
      {isExternal && <ExternalLink className="w-4 h-4" />}
    </a>
  );
};

// ============================================
// MarketingBlock Component
// ============================================

const MarketingBlock: React.FC<MarketingBlockProps> = ({ block, className = '' }) => {
  if (!block) {
    return null;
  }

  if (!block.isVisible) {
    return null;
  }

  const parsedContent = parseContent(block.content);
  const isObjectContent = typeof parsedContent === 'object';

  const contentTitle = isObjectContent ? (parsedContent as ContentWithItems).title : undefined;
  const contentBody = isObjectContent
    ? (parsedContent as ContentWithItems).body
    : (parsedContent as string);
  const contentItems = isObjectContent ? (parsedContent as ContentWithItems).items : undefined;

  const faqItems =
    block.blockType === 'faq' && contentItems && Array.isArray(contentItems)
      ? contentItems
      : block.blockType === 'faq' && typeof contentBody === 'string'
        ? parsePlainTextFAQ(contentBody)
        : null;
  const isFAQ = faqItems && faqItems.length > 0;

  const hasTitle = block.title || contentTitle;
  const hasBody = contentBody && contentBody.trim() !== '';
  const hasFAQItems = isFAQ;
  const hasCTA = block.ctaText && block.ctaUrl;

  if (!hasTitle && !hasBody && !hasFAQItems && !hasCTA) {
    return null;
  }

  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-6 ${className}`.trim()}
    >
      {/* Title */}
      {hasTitle && (
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {block.title || contentTitle}
        </h3>
      )}

      {/* Body Content */}
      {hasBody && !isFAQ && (
        <div className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {renderSimpleMarkdown(contentBody)}
        </div>
      )}

      {/* FAQ Accordion */}
      {hasFAQItems && <FAQAccordion items={faqItems as FAQItem[]} />}

      {/* CTA Button */}
      {hasCTA && (
        <div className="mt-6">
          <InlineCTA text={block.ctaText!} url={block.ctaUrl!} />
        </div>
      )}
    </div>
  );
};

export default MarketingBlock;
