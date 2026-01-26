// API Route: Email Verification
// POST /api/auth/verify-email - Verify email with token

import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Verify the email using the database function
    const { data, error } = await supabase.rpc('verify_email_with_token', {
      p_token: token,
    });

    if (error) {
      console.error('Verification error:', error);
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      );
    }

    const result = data?.[0];

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error_message || 'Invalid or expired token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      email: result.email,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
