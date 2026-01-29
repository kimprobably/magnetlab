'use client';

import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CalloutStyle } from '@/lib/types/lead-magnet';

interface ThemeColors {
  text: string;
  body: string;
  muted: string;
  border: string;
  card: string;
}

// Parse **bold** markdown in text
function renderRichText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ---- Callout ----

const calloutConfig: Record<CalloutStyle, {
  icon: typeof Info;
  darkBg: string;
  lightBg: string;
  borderColor: string;
  darkText: string;
  lightText: string;
}> = {
  info: {
    icon: Info,
    darkBg: 'rgba(59,130,246,0.1)',
    lightBg: 'rgba(59,130,246,0.08)',
    borderColor: '#3b82f6',
    darkText: '#93c5fd',
    lightText: '#1e40af',
  },
  warning: {
    icon: AlertTriangle,
    darkBg: 'rgba(245,158,11,0.1)',
    lightBg: 'rgba(245,158,11,0.08)',
    borderColor: '#f59e0b',
    darkText: '#fcd34d',
    lightText: '#92400e',
  },
  success: {
    icon: CheckCircle2,
    darkBg: 'rgba(34,197,94,0.1)',
    lightBg: 'rgba(34,197,94,0.08)',
    borderColor: '#22c55e',
    darkText: '#86efac',
    lightText: '#166534',
  },
};

export function Callout({
  content,
  style = 'info',
  isDark,
}: {
  content: string;
  style?: CalloutStyle;
  isDark: boolean;
}) {
  const config = calloutConfig[style];
  const Icon = config.icon;

  return (
    <div
      style={{
        background: isDark ? config.darkBg : config.lightBg,
        borderLeft: `3px solid ${config.borderColor}`,
        borderRadius: '0.5rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        margin: '1.5rem 0',
      }}
    >
      <Icon
        size={20}
        style={{
          color: config.borderColor,
          flexShrink: 0,
          marginTop: '0.125rem',
        }}
      />
      <p
        style={{
          fontSize: '1rem',
          lineHeight: '1.75rem',
          color: isDark ? config.darkText : config.lightText,
          margin: 0,
        }}
      >
        {renderRichText(content)}
      </p>
    </div>
  );
}

// ---- RichParagraph ----

export function RichParagraph({
  content,
  colors,
}: {
  content: string;
  colors: ThemeColors;
}) {
  return (
    <p
      style={{
        fontSize: '1.125rem',
        fontWeight: 400,
        letterSpacing: '-0.01em',
        lineHeight: '1.875rem',
        color: colors.body,
        margin: '1.25rem 0',
      }}
    >
      {renderRichText(content)}
    </p>
  );
}

// ---- BulletList ----

export function BulletList({
  content,
  colors,
}: {
  content: string;
  colors: ThemeColors;
}) {
  const items = content
    .split('\n')
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);

  return (
    <ul
      style={{
        margin: '1.25rem 0',
        paddingLeft: '1.5rem',
        listStyleType: 'disc',
      }}
    >
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            fontSize: '1.125rem',
            lineHeight: '1.875rem',
            color: colors.body,
            marginBottom: '0.5rem',
            paddingLeft: '0.25rem',
          }}
        >
          {renderRichText(item)}
        </li>
      ))}
    </ul>
  );
}

// ---- BlockQuote ----

export function BlockQuote({
  content,
  colors,
  primaryColor,
}: {
  content: string;
  colors: ThemeColors;
  primaryColor: string;
}) {
  return (
    <blockquote
      style={{
        borderLeft: `3px solid ${primaryColor}`,
        paddingLeft: '1.25rem',
        margin: '1.5rem 0',
        fontStyle: 'italic',
      }}
    >
      <p
        style={{
          fontSize: '1.125rem',
          lineHeight: '1.875rem',
          color: colors.muted,
          margin: 0,
        }}
      >
        {renderRichText(content)}
      </p>
    </blockquote>
  );
}

// ---- SectionDivider ----

export function SectionDivider({ colors }: { colors: ThemeColors }) {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px solid ${colors.border}`,
        margin: '2rem 0',
      }}
    />
  );
}
