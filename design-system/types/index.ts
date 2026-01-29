export interface ClientLogo {
  id: string;
  name: string;
  imageUrl: string;
  sortOrder: number;
  isVisible: boolean;
}

export type ContentBlockType =
  | 'testimonial'
  | 'case_study'
  | 'feature'
  | 'benefit'
  | 'faq'
  | 'pricing'
  | 'cta';

export interface ContentBlock {
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
