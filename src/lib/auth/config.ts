// NextAuth.js v5 Configuration for MagnetLab

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

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
          .select('id, email, name, avatar_url, password_hash')
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

        return {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
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
    };
  }
}
