import { getThemeVars, darken } from '@/lib/utils/theme-vars';

describe('getThemeVars', () => {
  it('should return CSS custom properties for dark theme', () => {
    const vars = getThemeVars('dark', '#8b5cf6');

    expect(vars['--ds-primary' as keyof typeof vars]).toBe('#8b5cf6');
    expect(vars['--ds-bg' as keyof typeof vars]).toBe('#09090B');
    expect(vars['--ds-text' as keyof typeof vars]).toBe('#FAFAFA');
    expect(vars['--ds-card' as keyof typeof vars]).toBe('#18181B');
    expect(vars['--ds-body' as keyof typeof vars]).toBe('#E4E4E7');
    expect(vars['--ds-muted' as keyof typeof vars]).toBe('#A1A1AA');
    expect(vars['--ds-border' as keyof typeof vars]).toBe('#27272A');
    expect(vars['--ds-placeholder' as keyof typeof vars]).toBe('#71717A');
  });

  it('should return CSS custom properties for light theme', () => {
    const vars = getThemeVars('light', '#8b5cf6');

    expect(vars['--ds-bg' as keyof typeof vars]).toBe('#FAFAFA');
    expect(vars['--ds-text' as keyof typeof vars]).toBe('#09090B');
    expect(vars['--ds-card' as keyof typeof vars]).toBe('#FFFFFF');
    expect(vars['--ds-body' as keyof typeof vars]).toBe('#27272A');
    expect(vars['--ds-muted' as keyof typeof vars]).toBe('#71717A');
    expect(vars['--ds-border' as keyof typeof vars]).toBe('#E4E4E7');
    expect(vars['--ds-placeholder' as keyof typeof vars]).toBe('#A1A1AA');
  });

  it('should use the provided primary color', () => {
    const vars = getThemeVars('dark', '#ef4444');
    expect(vars['--ds-primary' as keyof typeof vars]).toBe('#ef4444');
  });

  it('should compute a darker hover color', () => {
    const vars = getThemeVars('dark', '#8b5cf6');
    const hover = vars['--ds-primary-hover' as keyof typeof vars] as string;
    // Hover should be different from primary and still be a hex color
    expect(hover).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(hover).not.toBe('#8b5cf6');
  });

  it('should compute a light variant with alpha', () => {
    const vars = getThemeVars('dark', '#8b5cf6');
    const light = vars['--ds-primary-light' as keyof typeof vars] as string;
    // Should be a hex+alpha or rgba value (hex with appended alpha like #8b5cf61a)
    expect(light).toBeDefined();
    expect(light.length).toBeGreaterThan(0);
    expect(light).not.toBe('#8b5cf6');
  });
});

describe('darken', () => {
  it('should return a valid hex color', () => {
    const result = darken('#8b5cf6', 10);
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should darken a color', () => {
    const original = '#8b5cf6';
    const darkened = darken(original, 20);
    // Darkened color should be different
    expect(darkened).not.toBe(original);
  });

  it('should handle pure white', () => {
    const result = darken('#ffffff', 10);
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(result).not.toBe('#ffffff');
  });

  it('should handle pure black (floor at 0)', () => {
    const result = darken('#000000', 10);
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should handle 3-char hex', () => {
    // darken expects 6-char, but should still produce valid output
    const result = darken('#fff', 10);
    expect(result).toBeDefined();
  });
});
