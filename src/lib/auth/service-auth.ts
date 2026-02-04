import { createHmac, timingSafeEqual } from 'crypto'

const SERVICE_SECRET = process.env.GTM_SERVICE_SECRET!

export function generateServiceSignature(payload: string, timestamp: string): string {
  const data = `${timestamp}.${payload}`
  return createHmac('sha256', SERVICE_SECRET).update(data).digest('hex')
}

export function verifyServiceSignature(
  payload: string,
  timestamp: string,
  signature: string
): boolean {
  const expected = generateServiceSignature(payload, timestamp)

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
