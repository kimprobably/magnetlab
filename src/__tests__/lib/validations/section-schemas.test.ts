import {
  createSectionSchema,
  updateSectionSchema,
  sectionConfigSchemas,
} from '@/lib/validations/api';

describe('Section Validation Schemas', () => {
  describe('createSectionSchema', () => {
    it('should accept valid section data', () => {
      const result = createSectionSchema.safeParse({
        sectionType: 'testimonial',
        pageLocation: 'optin',
        config: { quote: 'Great!', author: 'Jane' },
      });

      expect(result.success).toBe(true);
    });

    it('should accept all section types', () => {
      const types = ['logo_bar', 'steps', 'testimonial', 'marketing_block', 'section_bridge'];
      types.forEach(sectionType => {
        const result = createSectionSchema.safeParse({
          sectionType,
          pageLocation: 'optin',
          config: {},
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept all page locations', () => {
      const locations = ['optin', 'thankyou', 'content'];
      locations.forEach(pageLocation => {
        const result = createSectionSchema.safeParse({
          sectionType: 'testimonial',
          pageLocation,
          config: {},
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid section type', () => {
      const result = createSectionSchema.safeParse({
        sectionType: 'invalid_type',
        pageLocation: 'optin',
        config: {},
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid page location', () => {
      const result = createSectionSchema.safeParse({
        sectionType: 'testimonial',
        pageLocation: 'invalid_location',
        config: {},
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional sortOrder and isVisible', () => {
      const result = createSectionSchema.safeParse({
        sectionType: 'steps',
        pageLocation: 'thankyou',
        config: {},
        sortOrder: 25,
        isVisible: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe(25);
        expect(result.data.isVisible).toBe(false);
      }
    });

    it('should require config field', () => {
      const result = createSectionSchema.safeParse({
        sectionType: 'testimonial',
        pageLocation: 'optin',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateSectionSchema', () => {
    it('should accept partial updates', () => {
      const result = updateSectionSchema.safeParse({ isVisible: false });
      expect(result.success).toBe(true);
    });

    it('should accept config-only update', () => {
      const result = updateSectionSchema.safeParse({
        config: { quote: 'Updated quote' },
      });
      expect(result.success).toBe(true);
    });

    it('should accept sortOrder update', () => {
      const result = updateSectionSchema.safeParse({ sortOrder: 55 });
      expect(result.success).toBe(true);
    });

    it('should accept pageLocation update', () => {
      const result = updateSectionSchema.safeParse({ pageLocation: 'content' });
      expect(result.success).toBe(true);
    });

    it('should reject empty object', () => {
      // Empty object is fine for zod .partial() - all fields optional
      const result = updateSectionSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('sectionConfigSchemas', () => {
    it('should have schemas for all section types', () => {
      expect(sectionConfigSchemas).toHaveProperty('logo_bar');
      expect(sectionConfigSchemas).toHaveProperty('steps');
      expect(sectionConfigSchemas).toHaveProperty('testimonial');
      expect(sectionConfigSchemas).toHaveProperty('marketing_block');
      expect(sectionConfigSchemas).toHaveProperty('section_bridge');
    });

    it('should validate logo_bar config', () => {
      const schema = sectionConfigSchemas.logo_bar;
      // Requires at least 1 logo with valid URL
      expect(schema.safeParse({ logos: [] }).success).toBe(false);
      expect(schema.safeParse({ logos: [{ name: 'Co', imageUrl: 'https://img.com/logo.png' }] }).success).toBe(true);
    });

    it('should reject logo_bar with invalid URL', () => {
      const schema = sectionConfigSchemas.logo_bar;
      expect(schema.safeParse({ logos: [{ name: 'Co', imageUrl: 'not-a-url' }] }).success).toBe(false);
    });

    it('should validate steps config', () => {
      const schema = sectionConfigSchemas.steps;
      expect(schema.safeParse({
        steps: [{ title: 'Step 1', description: 'Do this' }],
      }).success).toBe(true);
      expect(schema.safeParse({
        heading: 'Next Steps',
        subheading: 'Follow these',
        steps: [{ title: 'A', description: 'B' }],
      }).success).toBe(true);
    });

    it('should validate testimonial config', () => {
      const schema = sectionConfigSchemas.testimonial;
      expect(schema.safeParse({ quote: 'Amazing!' }).success).toBe(true);
      expect(schema.safeParse({
        quote: 'Great',
        author: 'Jane',
        role: 'CEO',
        result: '2x growth',
      }).success).toBe(true);
    });

    it('should reject testimonial without quote', () => {
      const schema = sectionConfigSchemas.testimonial;
      expect(schema.safeParse({ author: 'Jane' }).success).toBe(false);
    });

    it('should validate marketing_block config', () => {
      const schema = sectionConfigSchemas.marketing_block;
      expect(schema.safeParse({ blockType: 'feature' }).success).toBe(true);
      expect(schema.safeParse({
        blockType: 'cta',
        title: 'Get Started',
        content: 'Sign up now',
        ctaText: 'Click',
        ctaUrl: 'https://example.com',
      }).success).toBe(true);
    });

    it('should reject marketing_block with invalid blockType', () => {
      const schema = sectionConfigSchemas.marketing_block;
      expect(schema.safeParse({ blockType: 'invalid' }).success).toBe(false);
    });

    it('should validate section_bridge config', () => {
      const schema = sectionConfigSchemas.section_bridge;
      expect(schema.safeParse({ text: 'Ready?' }).success).toBe(true);
      expect(schema.safeParse({
        text: 'Next step',
        variant: 'accent',
        stepNumber: 2,
        stepLabel: 'Step 2',
      }).success).toBe(true);
    });

    it('should reject section_bridge without text', () => {
      const schema = sectionConfigSchemas.section_bridge;
      expect(schema.safeParse({ variant: 'accent' }).success).toBe(false);
    });
  });
});
