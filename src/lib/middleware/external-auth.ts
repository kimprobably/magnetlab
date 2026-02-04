import { NextRequest, NextResponse } from 'next/server'
import { verifyServiceSignature, isTimestampValid } from '@/lib/auth/service-auth'

export interface ExternalAuthContext {
  userId: string
  serviceId: string
}

export async function authenticateExternal(
  request: NextRequest
): Promise<ExternalAuthContext | NextResponse> {
  const signature = request.headers.get('x-gtm-signature')
  const timestamp = request.headers.get('x-gtm-timestamp')
  const userId = request.headers.get('x-gtm-user-id')
  const serviceId = request.headers.get('x-gtm-service-id')

  if (!signature || !timestamp || !userId || !serviceId) {
    return NextResponse.json(
      { error: 'Missing required headers' },
      { status: 401 }
    )
  }

  if (!isTimestampValid(timestamp)) {
    return NextResponse.json(
      { error: 'Request timestamp expired' },
      { status: 401 }
    )
  }

  // Extract method and path for signature verification
  const method = request.method
  const url = new URL(request.url)
  // Get the path after /api/external (e.g., /lead-magnets/123)
  const fullPath = url.pathname
  const externalPrefix = '/api/external'
  const path = fullPath.startsWith(externalPrefix)
    ? fullPath.slice(externalPrefix.length)
    : fullPath

  const body = await request.text()

  if (!verifyServiceSignature(method, path, body, timestamp, signature)) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    )
  }

  return { userId, serviceId }
}

export function withExternalAuth(
  handler: (request: NextRequest, context: ExternalAuthContext, body: unknown) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const clonedRequest = request.clone()
    const authResult = await authenticateExternal(request)

    if (authResult instanceof NextResponse) {
      return authResult
    }

    const body = await clonedRequest.json().catch(() => ({}))
    return handler(request, authResult, body)
  }
}
