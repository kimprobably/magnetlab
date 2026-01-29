import type { ClientLogo, ContentBlock, ContentBlockType } from '../types';

describe('types/index', () => {
  it('ClientLogo satisfies the interface', () => {
    const logo: ClientLogo = {
      id: '1',
      name: 'Acme',
      imageUrl: '/logo.svg',
      sortOrder: 0,
      isVisible: true,
    };
    expect(logo.id).toBe('1');
    expect(logo.name).toBe('Acme');
    expect(logo.isVisible).toBe(true);
  });

  it('ContentBlock satisfies the interface', () => {
    const block: ContentBlock = {
      id: '1',
      blockType: 'faq',
      title: 'FAQ',
      content: 'Some content',
      sortOrder: 0,
      isVisible: true,
    };
    expect(block.blockType).toBe('faq');
    expect(block.title).toBe('FAQ');
  });

  it('ContentBlock optional fields can be omitted', () => {
    const block: ContentBlock = {
      id: '2',
      blockType: 'cta',
      sortOrder: 1,
      isVisible: true,
    };
    expect(block.title).toBeUndefined();
    expect(block.content).toBeUndefined();
    expect(block.imageUrl).toBeUndefined();
    expect(block.ctaText).toBeUndefined();
    expect(block.ctaUrl).toBeUndefined();
  });

  it('ContentBlockType includes all expected values', () => {
    const types: ContentBlockType[] = [
      'testimonial',
      'case_study',
      'feature',
      'benefit',
      'faq',
      'pricing',
      'cta',
    ];
    expect(types).toHaveLength(7);
  });
});
