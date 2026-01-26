import { describe, it, expect } from 'vitest';
import {
  funnelPageFromRow,
  qualificationQuestionFromRow,
  leadFromRow,
  leadWebhookFromRow,
  parseVideoUrl,
} from '@/lib/types/funnel';

describe('Funnel Type Utilities', () => {
  describe('funnelPageFromRow', () => {
    it('should convert snake_case row to camelCase interface', () => {
      const row = {
        id: '123',
        lead_magnet_id: 'lm-456',
        user_id: 'user-789',
        slug: 'my-funnel',
        optin_headline: 'Get Your Free Guide',
        optin_subline: 'Download now',
        optin_button_text: 'Get Access',
        optin_trust_text: 'No spam',
        optin_enabled: true,
        thankyou_headline: 'Thanks!',
        thankyou_subline: 'Check your email',
        vsl_embed_url: 'https://youtube.com/embed/abc',
        calendly_url: 'https://calendly.com/user',
        rejection_message: 'Not a fit',
        thankyou_enabled: true,
        published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = funnelPageFromRow(row);

      expect(result.id).toBe('123');
      expect(result.leadMagnetId).toBe('lm-456');
      expect(result.userId).toBe('user-789');
      expect(result.slug).toBe('my-funnel');
      expect(result.optinHeadline).toBe('Get Your Free Guide');
      expect(result.optinSubline).toBe('Download now');
      expect(result.optinButtonText).toBe('Get Access');
      expect(result.optinTrustText).toBe('No spam');
      expect(result.optinEnabled).toBe(true);
      expect(result.thankyouHeadline).toBe('Thanks!');
      expect(result.thankyouSubline).toBe('Check your email');
      expect(result.vslEmbedUrl).toBe('https://youtube.com/embed/abc');
      expect(result.calendlyUrl).toBe('https://calendly.com/user');
      expect(result.rejectionMessage).toBe('Not a fit');
      expect(result.thankyouEnabled).toBe(true);
      expect(result.published).toBe(true);
      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2024-01-02T00:00:00Z');
    });

    it('should handle null values', () => {
      const row = {
        id: '123',
        lead_magnet_id: 'lm-456',
        user_id: 'user-789',
        slug: 'my-funnel',
        optin_headline: 'Headline',
        optin_subline: null,
        optin_button_text: 'Get Access',
        optin_trust_text: 'No spam',
        optin_enabled: true,
        thankyou_headline: 'Thanks!',
        thankyou_subline: null,
        vsl_embed_url: null,
        calendly_url: null,
        rejection_message: 'Not a fit',
        thankyou_enabled: true,
        published: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const result = funnelPageFromRow(row);

      expect(result.optinSubline).toBeNull();
      expect(result.thankyouSubline).toBeNull();
      expect(result.vslEmbedUrl).toBeNull();
      expect(result.calendlyUrl).toBeNull();
    });
  });

  describe('qualificationQuestionFromRow', () => {
    it('should convert snake_case row to camelCase interface', () => {
      const row = {
        id: 'q-123',
        funnel_page_id: 'fp-456',
        question_text: 'Do you run a business?',
        qualifying_answer: true,
        display_order: 1,
        created_at: '2024-01-01T00:00:00Z',
      };

      const result = qualificationQuestionFromRow(row);

      expect(result.id).toBe('q-123');
      expect(result.funnelPageId).toBe('fp-456');
      expect(result.questionText).toBe('Do you run a business?');
      expect(result.qualifyingAnswer).toBe(true);
      expect(result.displayOrder).toBe(1);
      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('leadFromRow', () => {
    it('should convert snake_case row to camelCase interface', () => {
      const row = {
        id: 'lead-123',
        funnel_page_id: 'fp-456',
        user_id: 'user-789',
        email: 'test@example.com',
        name: 'John Doe',
        qualified: true,
        qualification_answers: { q1: true, q2: false },
        source_url: 'https://example.com/page',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        created_at: '2024-01-01T00:00:00Z',
      };

      const result = leadFromRow(row);

      expect(result.id).toBe('lead-123');
      expect(result.funnelPageId).toBe('fp-456');
      expect(result.userId).toBe('user-789');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('John Doe');
      expect(result.qualified).toBe(true);
      expect(result.qualificationAnswers).toEqual({ q1: true, q2: false });
      expect(result.sourceUrl).toBe('https://example.com/page');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
    });

    it('should handle null values', () => {
      const row = {
        id: 'lead-123',
        funnel_page_id: 'fp-456',
        user_id: 'user-789',
        email: 'test@example.com',
        name: null,
        qualified: null,
        qualification_answers: null,
        source_url: null,
        ip_address: null,
        user_agent: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      const result = leadFromRow(row);

      expect(result.name).toBeNull();
      expect(result.qualified).toBeNull();
      expect(result.qualificationAnswers).toBeNull();
      expect(result.sourceUrl).toBeNull();
      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });
  });

  describe('leadWebhookFromRow', () => {
    it('should convert snake_case row to camelCase interface', () => {
      const row = {
        id: 'wh-123',
        user_id: 'user-456',
        name: 'My Webhook',
        webhook_url: 'https://api.example.com/hook',
        enabled: true,
        last_triggered_at: '2024-01-15T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-10T00:00:00Z',
      };

      const result = leadWebhookFromRow(row);

      expect(result.id).toBe('wh-123');
      expect(result.userId).toBe('user-456');
      expect(result.name).toBe('My Webhook');
      expect(result.webhookUrl).toBe('https://api.example.com/hook');
      expect(result.enabled).toBe(true);
      expect(result.lastTriggeredAt).toBe('2024-01-15T00:00:00Z');
      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(result.updatedAt).toBe('2024-01-10T00:00:00Z');
    });
  });

  describe('parseVideoUrl', () => {
    describe('YouTube', () => {
      it('should parse standard YouTube URLs', () => {
        const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(result.provider).toBe('youtube');
        expect(result.videoId).toBe('dQw4w9WgXcQ');
        expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
      });

      it('should parse YouTube embed URLs', () => {
        const result = parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
        expect(result.provider).toBe('youtube');
        expect(result.videoId).toBe('dQw4w9WgXcQ');
      });

      it('should parse youtu.be short URLs', () => {
        const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
        expect(result.provider).toBe('youtube');
        expect(result.videoId).toBe('dQw4w9WgXcQ');
      });
    });

    describe('Loom', () => {
      it('should parse Loom share URLs', () => {
        const result = parseVideoUrl('https://www.loom.com/share/abc123def456');
        expect(result.provider).toBe('loom');
        expect(result.videoId).toBe('abc123def456');
        expect(result.embedUrl).toBe('https://www.loom.com/embed/abc123def456');
      });

      it('should parse Loom embed URLs', () => {
        const result = parseVideoUrl('https://www.loom.com/embed/abc123def456');
        expect(result.provider).toBe('loom');
        expect(result.videoId).toBe('abc123def456');
      });
    });

    describe('Vimeo', () => {
      it('should parse Vimeo URLs', () => {
        const result = parseVideoUrl('https://vimeo.com/123456789');
        expect(result.provider).toBe('vimeo');
        expect(result.videoId).toBe('123456789');
        expect(result.embedUrl).toBe('https://player.vimeo.com/video/123456789');
      });

      it('should parse Vimeo player URLs', () => {
        const result = parseVideoUrl('https://player.vimeo.com/video/123456789');
        expect(result.provider).toBe('vimeo');
        expect(result.videoId).toBe('123456789');
      });
    });

    describe('Wistia', () => {
      it('should parse Wistia media URLs', () => {
        const result = parseVideoUrl('https://fast.wistia.net/embed/iframe/abc123xyz');
        expect(result.provider).toBe('wistia');
        expect(result.videoId).toBe('abc123xyz');
      });

      it('should parse Wistia.com URLs', () => {
        const result = parseVideoUrl('https://wistia.com/medias/abc123xyz');
        expect(result.provider).toBe('wistia');
        expect(result.videoId).toBe('abc123xyz');
        expect(result.embedUrl).toBe('https://fast.wistia.net/embed/iframe/abc123xyz');
      });
    });

    describe('Unknown providers', () => {
      it('should return unknown for unrecognized URLs', () => {
        const result = parseVideoUrl('https://example.com/video.mp4');
        expect(result.provider).toBe('unknown');
        expect(result.videoId).toBeNull();
        expect(result.embedUrl).toBe('https://example.com/video.mp4');
      });

      it('should handle empty URLs', () => {
        const result = parseVideoUrl('');
        expect(result.provider).toBe('unknown');
        expect(result.videoId).toBeNull();
        expect(result.embedUrl).toBeNull();
      });
    });
  });
});
