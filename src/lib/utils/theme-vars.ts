import type { CSSProperties } from 'react';

/**
 * Convert hex color to HSL components
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Darken a hex color by a percentage
 */
export function darken(hex: string, percent: number): string {
  const { h, s, l } = hexToHSL(hex);
  return hslToHex(h, s, Math.max(0, l - percent));
}

/**
 * Generate CSS custom properties for a funnel page's theme and primary color.
 * Applied to the root wrapper div of public pages so design system components
 * can reference var(--ds-primary), var(--ds-bg), etc.
 */
export function getThemeVars(
  theme: 'dark' | 'light',
  primaryColor: string
): CSSProperties {
  const isDark = theme === 'dark';

  return {
    '--ds-primary': primaryColor,
    '--ds-primary-hover': darken(primaryColor, 10),
    '--ds-primary-light': `${primaryColor}1a`,
    '--ds-bg': isDark ? '#09090B' : '#FAFAFA',
    '--ds-card': isDark ? '#18181B' : '#FFFFFF',
    '--ds-text': isDark ? '#FAFAFA' : '#09090B',
    '--ds-body': isDark ? '#E4E4E7' : '#27272A',
    '--ds-muted': isDark ? '#A1A1AA' : '#71717A',
    '--ds-border': isDark ? '#27272A' : '#E4E4E7',
    '--ds-placeholder': isDark ? '#71717A' : '#A1A1AA',
  } as CSSProperties;
}
