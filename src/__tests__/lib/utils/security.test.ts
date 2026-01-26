import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  getRateLimitKey,
  validateWebhookUrl,
  validateVideoEmbedUrl,
  validateCalendlyUrl,
  validateEmail,
  escapeCSVValue,
  validateSlug,
  validateTextLength,
  validatePaginationLimit,
} from '@/lib/utils/security';

describe('Security Utilities', () => {
  describe('checkRateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should allow requests within limit', () => {
      const result1 = checkRateLimit('test-key-1', { windowMs: 60000, maxRequests: 3 });
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimit('test-key-1', { windowMs: 60000, maxRequests: 3 });
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should block requests over limit', () => {
      const config = { windowMs: 60000, maxRequests: 2 };

      checkRateLimit('test-key-2', config);
      checkRateLimit('test-key-2', config);
      const result = checkRateLimit('test-key-2', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const config = { windowMs: 1000, maxRequests: 1 };

      checkRateLimit('test-key-3', config);
      let result = checkRateLimit('test-key-3', config);
      expect(result.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(1001);

      result = checkRateLimit('test-key-3', config);
      expect(result.allowed).toBe(true);
    });

    it('should track different keys independently', () => {
      const config = { windowMs: 60000, maxRequests: 1 };

      checkRateLimit('key-a', config);
      const resultA = checkRateLimit('key-a', config);
      const resultB = checkRateLimit('key-b', config);

      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
    });
  });

  describe('getRateLimitKey', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });

      const key = getRateLimitKey(request, 'test');
      expect(key).toBe('test:192.168.1.1');
    });

    it('should use unknown when no IP available', () => {
      const request = new Request('https://example.com');
      const key = getRateLimitKey(request, 'test');
      expect(key).toBe('test:unknown');
    });
  });

  describe('validateWebhookUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(validateWebhookUrl('https://api.example.com/webhook').valid).toBe(true);
      expect(validateWebhookUrl('https://hooks.zapier.com/abc').valid).toBe(true);
    });

    it('should reject HTTP URLs', () => {
      const result = validateWebhookUrl('http://api.example.com/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('should reject localhost', () => {
      expect(validateWebhookUrl('https://localhost/webhook').valid).toBe(false);
      expect(validateWebhookUrl('https://127.0.0.1/webhook').valid).toBe(false);
    });

    it('should reject private network IPs', () => {
      expect(validateWebhookUrl('https://10.0.0.1/webhook').valid).toBe(false);
      expect(validateWebhookUrl('https://192.168.1.1/webhook').valid).toBe(false);
      expect(validateWebhookUrl('https://172.16.0.1/webhook').valid).toBe(false);
    });

    it('should reject AWS metadata endpoint', () => {
      expect(validateWebhookUrl('https://169.254.169.254/latest/meta-data').valid).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(validateWebhookUrl('not-a-url').valid).toBe(false);
      expect(validateWebhookUrl('').valid).toBe(false);
    });
  });

  describe('validateVideoEmbedUrl', () => {
    it('should accept YouTube URLs', () => {
      expect(validateVideoEmbedUrl('https://www.youtube.com/embed/abc123').valid).toBe(true);
      expect(validateVideoEmbedUrl('https://youtube.com/watch?v=abc123').valid).toBe(true);
    });

    it('should accept Loom URLs', () => {
      expect(validateVideoEmbedUrl('https://www.loom.com/embed/abc123').valid).toBe(true);
    });

    it('should accept Vimeo URLs', () => {
      expect(validateVideoEmbedUrl('https://player.vimeo.com/video/123456').valid).toBe(true);
    });

    it('should accept Wistia URLs', () => {
      expect(validateVideoEmbedUrl('https://fast.wistia.net/embed/iframe/abc123').valid).toBe(true);
    });

    it('should reject non-video URLs', () => {
      const result = validateVideoEmbedUrl('https://evil.com/xss.html');
      expect(result.valid).toBe(false);
    });

    it('should reject HTTP URLs', () => {
      const result = validateVideoEmbedUrl('http://www.youtube.com/embed/abc123');
      expect(result.valid).toBe(false);
    });

    it('should accept empty URLs', () => {
      expect(validateVideoEmbedUrl('').valid).toBe(true);
    });
  });

  describe('validateCalendlyUrl', () => {
    it('should accept valid Calendly URLs', () => {
      expect(validateCalendlyUrl('https://calendly.com/user/meeting').valid).toBe(true);
      expect(validateCalendlyUrl('https://www.calendly.com/user').valid).toBe(true);
    });

    it('should reject non-Calendly URLs', () => {
      const result = validateCalendlyUrl('https://evil.com/fake-calendly');
      expect(result.valid).toBe(false);
    });

    it('should reject HTTP URLs', () => {
      const result = validateCalendlyUrl('http://calendly.com/user');
      expect(result.valid).toBe(false);
    });

    it('should accept empty URLs', () => {
      expect(validateCalendlyUrl('').valid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name@example.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should reject overly long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('escapeCSVValue', () => {
    it('should escape commas', () => {
      expect(escapeCSVValue('hello, world')).toBe('"hello, world"');
    });

    it('should escape quotes', () => {
      expect(escapeCSVValue('say "hello"')).toBe('"say ""hello"""');
    });

    it('should escape newlines', () => {
      expect(escapeCSVValue('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should prevent formula injection', () => {
      expect(escapeCSVValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(escapeCSVValue('+1234567890')).toBe("'+1234567890");
      expect(escapeCSVValue('-1234567890')).toBe("'-1234567890");
      expect(escapeCSVValue('@SUM(A1)')).toBe("'@SUM(A1)");
    });

    it('should handle null and undefined', () => {
      expect(escapeCSVValue(null)).toBe('');
      expect(escapeCSVValue(undefined)).toBe('');
    });

    it('should pass through safe values', () => {
      expect(escapeCSVValue('hello')).toBe('hello');
      // Emails don't start with @, so they pass through
      expect(escapeCSVValue('user@email.com')).toBe('user@email.com');
    });
  });

  describe('validateSlug', () => {
    it('should accept valid slugs', () => {
      expect(validateSlug('my-lead-magnet').valid).toBe(true);
      expect(validateSlug('guide123').valid).toBe(true);
      expect(validateSlug('a').valid).toBe(true);
    });

    it('should reject invalid slugs', () => {
      expect(validateSlug('').valid).toBe(false);
      expect(validateSlug('My Lead Magnet').valid).toBe(false);
      expect(validateSlug('slug_with_underscores').valid).toBe(false);
      expect(validateSlug('--double-dash').valid).toBe(false);
    });

    it('should reject overly long slugs', () => {
      const longSlug = 'a'.repeat(101);
      expect(validateSlug(longSlug).valid).toBe(false);
    });
  });

  describe('validateTextLength', () => {
    it('should accept text within limit', () => {
      expect(validateTextLength('hello', 'Field', 10).valid).toBe(true);
      expect(validateTextLength('', 'Field', 10).valid).toBe(true);
      expect(validateTextLength(null, 'Field', 10).valid).toBe(true);
    });

    it('should reject text over limit', () => {
      const result = validateTextLength('hello world', 'Field', 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Field');
      expect(result.error).toContain('5');
    });
  });

  describe('validatePaginationLimit', () => {
    it('should use default for invalid values', () => {
      expect(validatePaginationLimit(NaN)).toBe(20);
      expect(validatePaginationLimit(0)).toBe(20);
      expect(validatePaginationLimit(-1)).toBe(20);
    });

    it('should respect max limit', () => {
      expect(validatePaginationLimit(200, 100)).toBe(100);
      expect(validatePaginationLimit(50, 100)).toBe(50);
    });

    it('should return valid values as-is', () => {
      expect(validatePaginationLimit(25)).toBe(25);
      expect(validatePaginationLimit(1)).toBe(1);
    });
  });
});
