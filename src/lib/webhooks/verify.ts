// Webhook signature verification utilities

import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify LeadShark webhook signature
 */
export async function verifyLeadSharkWebhook(
  request: NextRequest,
  body: string
): Promise<WebhookVerificationResult> {
  const secret = process.env.LEADSHARK_WEBHOOK_SECRET;

  // Skip verification if no secret configured (development)
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, error: 'LEADSHARK_WEBHOOK_SECRET not configured' };
    }
    return { valid: true };
  }

  const signature = request.headers.get('x-leadshark-signature');
  if (!signature) {
    return { valid: false, error: 'Missing x-leadshark-signature header' };
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  return isValid ? { valid: true } : { valid: false, error: 'Invalid signature' };
}
