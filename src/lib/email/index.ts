// Email Service using Resend

import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors when API key is not set
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'MagnetLab <noreply@magnetlab.app>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface SendVerificationEmailParams {
  to: string;
  token: string;
  userName?: string;
}

export async function sendVerificationEmail({
  to,
  token,
  userName,
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  const greeting = userName ? `Hi ${userName}` : 'Hi there';

  try {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Verify your MagnetLab email address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="padding: 40px 32px;">
                        <!-- Logo -->
                        <div style="text-align: center; margin-bottom: 32px;">
                          <div style="display: inline-block; width: 48px; height: 48px; background-color: #6366f1; border-radius: 12px; line-height: 48px; text-align: center;">
                            <span style="font-size: 24px;">🧲</span>
                          </div>
                        </div>

                        <!-- Content -->
                        <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
                          Verify your email
                        </h1>

                        <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #52525b;">
                          ${greeting},
                        </p>

                        <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #52525b;">
                          Thanks for signing up for MagnetLab! Please verify your email address by clicking the button below.
                        </p>

                        <!-- Button -->
                        <div style="text-align: center; margin-bottom: 24px;">
                          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 16px; border-radius: 8px;">
                            Verify Email Address
                          </a>
                        </div>

                        <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #71717a;">
                          If you didn't create an account, you can safely ignore this email.
                        </p>

                        <p style="margin: 0 0 24px; font-size: 14px; line-height: 20px; color: #71717a;">
                          This link will expire in 24 hours.
                        </p>

                        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">

                        <p style="margin: 0; font-size: 12px; line-height: 18px; color: #a1a1aa; text-align: center;">
                          If the button doesn't work, copy and paste this URL into your browser:
                        </p>
                        <p style="margin: 8px 0 0; font-size: 12px; line-height: 18px; color: #6366f1; text-align: center; word-break: break-all;">
                          ${verificationUrl}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <p style="margin: 24px 0 0; font-size: 12px; line-height: 18px; color: #a1a1aa; text-align: center;">
                    MagnetLab - Create lead magnets your ICP will love
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `${greeting},

Thanks for signing up for MagnetLab! Please verify your email address by clicking the link below:

${verificationUrl}

If you didn't create an account, you can safely ignore this email.

This link will expire in 24 hours.

- The MagnetLab Team`,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
