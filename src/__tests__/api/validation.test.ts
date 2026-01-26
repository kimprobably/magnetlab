/**
 * Integration tests for API input validation
 * Tests the validation logic used across funnel API endpoints
 */

import { describe, it, expect } from 'vitest';
import {
  validateVideoEmbedUrl,
  validateCalendlyUrl,
  validateWebhookUrl,
  validateEmail,
  validateSlug,
  validateTextLength,
  escapeCSVValue,
} from '@/lib/utils/security';

describe('API Validation Integration', () => {
  describe('Funnel Page Creation Validation', () => {
    it('should validate all required fields', () => {
      const createRequest = {
        leadMagnetId: 'lm-123',
        optinHeadline: 'Get Your Free Guide',
        optinSubline: 'Download our comprehensive PDF guide',
        optinButtonText: 'Download Now',
        vslEmbedUrl: 'https://www.youtube.com/embed/abc123',
        calendlyUrl: 'https://calendly.com/user/meeting',
      };

      // Validate video URL
      const videoValidation = validateVideoEmbedUrl(createRequest.vslEmbedUrl);
      expect(videoValidation.valid).toBe(true);

      // Validate Calendly URL
      const calendlyValidation = validateCalendlyUrl(createRequest.calendlyUrl);
      expect(calendlyValidation.valid).toBe(true);

      // Validate text lengths
      expect(validateTextLength(createRequest.optinHeadline, 'Headline', 200).valid).toBe(true);
      expect(validateTextLength(createRequest.optinSubline, 'Subline', 500).valid).toBe(true);
      expect(validateTextLength(createRequest.optinButtonText, 'Button', 50).valid).toBe(true);
    });

    it('should reject invalid video URLs', () => {
      const invalidUrls = [
        'http://www.youtube.com/embed/abc123', // HTTP not HTTPS
        'https://evil.com/video.html', // Not a video provider
        'javascript:alert(1)', // XSS attempt
        'data:text/html,<script>alert(1)</script>', // Data URL XSS
      ];

      for (const url of invalidUrls) {
        const result = validateVideoEmbedUrl(url);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject invalid Calendly URLs', () => {
      const invalidUrls = [
        'http://calendly.com/user', // HTTP not HTTPS
        'https://fakecalendly.com/user', // Fake domain
        'https://evil.com/calendly-phishing', // Phishing attempt
      ];

      for (const url of invalidUrls) {
        const result = validateCalendlyUrl(url);
        expect(result.valid).toBe(false);
      }
    });

    it('should reject overly long text fields', () => {
      const longHeadline = 'A'.repeat(201);
      const longSubline = 'B'.repeat(501);
      const longButton = 'C'.repeat(51);

      expect(validateTextLength(longHeadline, 'Headline', 200).valid).toBe(false);
      expect(validateTextLength(longSubline, 'Subline', 500).valid).toBe(false);
      expect(validateTextLength(longButton, 'Button', 50).valid).toBe(false);
    });
  });

  describe('Lead Capture Validation', () => {
    it('should validate email addresses', () => {
      const validEmails = [
        'user@example.com',
        'name.surname@company.co.uk',
        'user+tag@gmail.com',
        'firstname.lastname@subdomain.example.org',
      ];

      for (const email of validEmails) {
        expect(validateEmail(email)).toBe(true);
      }
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        '', // Empty
        ' ', // Whitespace
        'a'.repeat(255) + '@example.com', // Too long
      ];

      for (const email of invalidEmails) {
        expect(validateEmail(email)).toBe(false);
      }
    });

    it('should accept technically valid emails (even if unusual)', () => {
      // These are technically valid per RFC but may be unusual
      // Our validation accepts them as it's better to allow edge cases than block legitimate users
      expect(validateEmail('double..dots@email.com')).toBe(true);
    });
  });

  describe('Webhook Validation (SSRF Prevention)', () => {
    it('should accept valid external webhook URLs', () => {
      const validUrls = [
        'https://hooks.zapier.com/hooks/catch/123456/abcdef',
        'https://api.example.com/webhook',
        'https://webhook.site/abc-123-def',
        'https://n8n.example.com/webhook/flow-123',
      ];

      for (const url of validUrls) {
        const result = validateWebhookUrl(url);
        expect(result.valid).toBe(true);
      }
    });

    it('should block SSRF attempts to localhost', () => {
      const localhostUrls = [
        'https://localhost/admin',
        'https://localhost:8080/api',
        'https://127.0.0.1/api',
        'https://127.0.0.1:3000/webhook',
        'https://[::1]/api',
      ];

      for (const url of localhostUrls) {
        const result = validateWebhookUrl(url);
        expect(result.valid).toBe(false);
      }
    });

    it('should block SSRF attempts to private networks', () => {
      const privateNetworkUrls = [
        'https://10.0.0.1/api',
        'https://10.255.255.255/webhook',
        'https://172.16.0.1/internal',
        'https://172.31.255.255/api',
        'https://192.168.1.1/admin',
        'https://192.168.100.100/api',
      ];

      for (const url of privateNetworkUrls) {
        const result = validateWebhookUrl(url);
        expect(result.valid).toBe(false);
      }
    });

    it('should block SSRF attempts to cloud metadata endpoints', () => {
      const metadataUrls = [
        'https://169.254.169.254/latest/meta-data', // AWS
        'https://metadata.google.internal/computeMetadata', // GCP
        'https://169.254.169.254/metadata/instance', // Azure
      ];

      for (const url of metadataUrls) {
        const result = validateWebhookUrl(url);
        expect(result.valid).toBe(false);
      }
    });

    it('should require HTTPS', () => {
      const httpUrl = 'http://api.example.com/webhook';
      const result = validateWebhookUrl(httpUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });
  });

  describe('Slug Validation', () => {
    it('should accept valid URL slugs', () => {
      const validSlugs = [
        'my-lead-magnet',
        'guide-2024',
        'ultimate-marketing-playbook',
        'seo',
        'a',
      ];

      for (const slug of validSlugs) {
        const result = validateSlug(slug);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid slugs', () => {
      const invalidSlugs = [
        'My Lead Magnet', // Spaces and capitals
        'slug_with_underscores', // Underscores
        'ALLCAPS', // Capitals
        '-starts-with-dash', // Leading dash
        'ends-with-dash-', // Trailing dash
        'double--dash', // Double dash
        '', // Empty
        'a'.repeat(101), // Too long
      ];

      for (const slug of invalidSlugs) {
        const result = validateSlug(slug);
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('CSV Export Security', () => {
    it('should prevent CSV formula injection', () => {
      // Simple formula prefixes get a single quote prefix
      expect(escapeCSVValue('-1+1')).toBe("'-1+1");
      expect(escapeCSVValue('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");

      // Formulas with quotes get both formula protection AND CSV escaping
      // (prefix with ', then wrap in " and escape internal quotes)
      expect(escapeCSVValue('=HYPERLINK("http://evil.com")')).toBe("\"'=HYPERLINK(\"\"http://evil.com\"\")\"");
      expect(escapeCSVValue('+cmd|"/C calc"!A0')).toBe("\"'+cmd|\"\"/C calc\"\"!A0\"");

      // Tab and carriage return get formula protection
      expect(escapeCSVValue('\t=cmd')).toBe("'\t=cmd");
      // CR needs both formula protection and quoting (because it contains \r)
      expect(escapeCSVValue('\r=cmd')).toBe("\"'\r=cmd\"");
    });

    it('should properly escape CSV special characters', () => {
      expect(escapeCSVValue('hello, world')).toBe('"hello, world"');
      expect(escapeCSVValue('say "hello"')).toBe('"say ""hello"""');
      expect(escapeCSVValue('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should handle edge cases', () => {
      expect(escapeCSVValue(null)).toBe('');
      expect(escapeCSVValue(undefined)).toBe('');
      expect(escapeCSVValue('')).toBe('');
      expect(escapeCSVValue('normal text')).toBe('normal text');
    });
  });
});
