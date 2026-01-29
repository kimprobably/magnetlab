import preset from '../tailwind-preset';

describe('tailwind-preset', () => {
  it('exports an object', () => {
    expect(preset).toBeDefined();
    expect(typeof preset).toBe('object');
  });

  it('sets darkMode to class', () => {
    expect(preset.darkMode).toBe('class');
  });

  it('extends fontFamily with Inter', () => {
    const fontFamily = preset.theme?.extend?.fontFamily as Record<string, string[]>;
    expect(fontFamily.sans).toContain('Inter');
  });

  it('defines brand color scale', () => {
    const colors = preset.theme?.extend?.colors as Record<string, Record<string, string>>;
    expect(colors.brand).toBeDefined();
    expect(colors.brand['500']).toBe('#8b5cf6');
    expect(colors.brand['50']).toBe('#f5f3ff');
    expect(colors.brand['100']).toBe('#ede9fe');
    expect(colors.brand['400']).toBe('#a78bfa');
    expect(colors.brand['600']).toBe('#7c3aed');
    expect(colors.brand['700']).toBe('#6d28d9');
    expect(colors.brand['900']).toBe('#4c1d95');
  });
});
