// NextAuth.js v5 Configuration for MagnetLab

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { sendVerificationEmail } from '@/lib/email';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const supabase = createSupabaseAdminClient();

        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email, name, avatar_url, password_hash, email_verified_at')
          .eq('email', email)
          .single();

        if (existingUser) {
          // Simple password check (in production, use bcrypt)
          // For v1, we're using a simple hash comparison
          const isValid = await verifyPassword(password, existingUser.password_hash);
          if (!isValid) {
            return null;
          }

          return {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            image: existingUser.avatar_url,
            emailVerified: existingUser.email_verified_at ? new Date(existingUser.email_verified_at) : null,
          };
        }

        // Auto-create new user on first login
        const passwordHash = await hashPassword(password);
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            email,
            password_hash: passwordHash,
          })
          .select('id, email, name')
          .single();

        if (error || !newUser) {
          console.error('Failed to create user:', error);
          return null;
        }

        // Create free subscription
        await supabase.from('subscriptions').insert({
          user_id: newUser.id,
          plan: 'free',
          status: 'active',
        });

        // Generate verification token and send email
        const { data: tokenData, error: tokenError } = await supabase.rpc(
          'setup_email_verification',
          { p_user_id: newUser.id }
        );

        if (!tokenError && tokenData && tokenData[0]) {
          // Send verification email
          await sendVerificationEmail({
            to: email,
            token: tokenData[0].token,
          });
        }

        return {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          emailVerified: null,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        token.emailVerified = user.emailVerified;
      }

      // Refresh email verification status on update
      if (trigger === 'update') {
        const supabase = createSupabaseAdminClient();
        const { data } = await supabase
          .from('users')
          .select('email_verified_at')
          .eq('id', token.userId)
          .single();

        if (data) {
          token.emailVerified = data.email_verified_at ? new Date(data.email_verified_at) : null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      session.user.emailVerified = token.emailVerified as Date | null;
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
});

// Simple password hashing (for v1 - consider bcrypt for production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + process.env.AUTH_SECRET);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Extend session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
    };
  }

  interface User {
    emailVerified?: Date | null;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string;
    emailVerified?: Date | null;
  }
}
