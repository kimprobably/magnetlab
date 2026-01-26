/**
 * Security utilities for API endpoints
 */

// Simple in-memory rate limiter (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetTime < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime };
}

// Get rate limit key from request (IP-based for public endpoints)
export function getRateLimitKey(request: Request, prefix: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
  return `${prefix}:${ip}`;
}

// Validate webhook URL to prevent SSRF
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal', // GCP metadata
  '100.100.100.200', // Alibaba metadata
];

const BLOCKED_NETWORKS = [
  /^10\./,         // Private 10.x.x.x
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private 172.16-31.x.x
  /^192\.168\./,   // Private 192.168.x.x
  /^127\./,        // Loopback
  /^0\./,          // This network
  /^169\.254\./,   // Link-local
  /^fc00:/i,       // IPv6 unique local
  /^fe80:/i,       // IPv6 link-local
];

export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Webhook URL must use HTTPS' };
    }

    // Check for blocked hosts (handle IPv6 bracket notation)
    let hostname = parsed.hostname.toLowerCase();
    // Remove IPv6 brackets if present
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    if (BLOCKED_HOSTS.includes(hostname)) {
      return { valid: false, error: 'Invalid webhook URL: internal host not allowed' };
    }

    // Check for IP addresses in blocked networks
    for (const pattern of BLOCKED_NETWORKS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Invalid webhook URL: internal network not allowed' };
      }
    }

    // Block AWS/GCP/Azure metadata endpoints
    if (hostname.includes('metadata') || hostname.includes('instance-data')) {
      return { valid: false, error: 'Invalid webhook URL: metadata endpoint not allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid webhook URL format' };
  }
}

// Validate video embed URL to prevent XSS
const ALLOWED_VIDEO_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'www.loom.com',
  'loom.com',
  'player.vimeo.com',
  'vimeo.com',
  'fast.wistia.net',
  'wistia.com',
];

export function validateVideoEmbedUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: true }; // Empty URL is valid (no video)
  }

  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Video embed URL must use HTTPS' };
    }

    // Check for allowed hosts
    const hostname = parsed.hostname.toLowerCase();
    if (!ALLOWED_VIDEO_HOSTS.includes(hostname)) {
      return { valid: false, error: 'Video embed URL must be from YouTube, Loom, Vimeo, or Wistia' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid video embed URL format' };
  }
}

// Validate Calendly URL
export function validateCalendlyUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: true }; // Empty URL is valid (no Calendly)
  }

  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Calendly URL must use HTTPS' };
    }

    // Check for Calendly domain - must be calendly.com or subdomain
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'calendly.com' && !hostname.endsWith('.calendly.com')) {
      return { valid: false, error: 'URL must be a Calendly link' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid Calendly URL format' };
  }
}

// More robust email validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

// CSV escape with formula injection protection
export function escapeCSVValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Protect against CSV formula injection
  // Characters that can trigger formula execution in spreadsheets
  const needsFormulaProtection = /^[=+\-@\t\r]/.test(str);

  // Standard CSV escaping needed?
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');

  if (needsFormulaProtection) {
    // Add single quote prefix to prevent formula execution
    str = "'" + str;
  }

  if (needsQuoting) {
    // If needs quoting, wrap in double quotes and escape internal quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

// Sanitize error messages for production
export function sanitizeErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  if (process.env.NODE_ENV === 'development') {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  return defaultMessage;
}

// Validate slug format and length
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Slug is required' };
  }

  if (slug.length > 100) {
    return { valid: false, error: 'Slug must be 100 characters or less' };
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' };
  }

  return { valid: true };
}

// Validate text field length
export function validateTextLength(
  value: string | null | undefined,
  fieldName: string,
  maxLength: number
): { valid: boolean; error?: string } {
  if (!value) return { valid: true };

  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} must be ${maxLength} characters or less` };
  }

  return { valid: true };
}

// Validate pagination limits
export function validatePaginationLimit(limit: number, maxLimit: number = 100): number {
  if (isNaN(limit) || limit < 1) return 20;
  return Math.min(limit, maxLimit);
}
