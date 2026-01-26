// API Route: Resend Verification Email
// POST /api/auth/resend-verification - Resend verification email to user

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { sendVerificationEmail } from '@/lib/email';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check if user is already verified
    const { data: user } = await supabase
      .from('users')
      .select('email, email_verified_at, name')
      .eq('id', session.user.id)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.email_verified_at) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'setup_email_verification',
      { p_user_id: session.user.id }
    );

    if (tokenError) {
      console.error('Token generation error:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate verification token' },
        { status: 500 }
      );
    }

    if (!tokenData || !tokenData[0]) {
      return NextResponse.json(
        { error: 'Failed to generate verification token' },
        { status: 500 }
      );
    }

    // Send verification email
    const result = await sendVerificationEmail({
      to: user.email,
      token: tokenData[0].token,
      userName: user.name,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}
