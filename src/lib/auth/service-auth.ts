import { createHmac, timingSafeEqual } from 'crypto'

const SERVICE_SECRET = process.env.GTM_SERVICE_SECRET!

/**
 * Generate HMAC signature for service-to-service authentication.
 * Includes method and path for additional security.
 */
export function generateServiceSignature(
  method: string,
  path: string,
  payload: string,
  timestamp: string
): string {
  const data = `${method}.${path}.${timestamp}.${payload}`
  return createHmac('sha256', SERVICE_SECRET).update(data).digest('hex')
}

/**
 * Verify HMAC signature from GTM service.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyServiceSignature(
  method: string,
  path: string,
  payload: string,
  timestamp: string,
  signature: string
): boolean {
  const expected = generateServiceSignature(method, path, payload, timestamp)

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

export function isTimestampValid(timestamp: string, maxAgeSeconds = 300): boolean {
  const ts = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  return Math.abs(now - ts) < maxAgeSeconds
}
