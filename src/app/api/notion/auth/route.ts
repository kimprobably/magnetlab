// API Route: Notion OAuth
// GET /api/notion/auth - Start OAuth flow
// GET /api/notion/auth?code=xxx - OAuth callback

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getNotionOAuthUrl, exchangeNotionCode } from '@/lib/integrations/notion';
import { createSupabaseServerClient } from '@/lib/utils/supabase-server';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth callback
    if (code) {
      // Verify state matches session user
      if (state !== session.user.id) {
        return NextResponse.redirect(
          new URL('/settings?error=invalid_state', request.url)
        );
      }

      try {
        // Exchange code for tokens
        const tokens = await exchangeNotionCode(code);

        // Save to database
        const supabase = await createSupabaseServerClient();
        await supabase.from('notion_connections').upsert({
          user_id: session.user.id,
          access_token: tokens.access_token,
          workspace_id: tokens.workspace_id,
          workspace_name: tokens.workspace_name,
          workspace_icon: tokens.workspace_icon,
          bot_id: tokens.bot_id,
        });

        return NextResponse.redirect(
          new URL('/settings?notion=connected', request.url)
        );
      } catch (err) {
        console.error('Notion OAuth error:', err);
        return NextResponse.redirect(
          new URL('/settings?error=notion_auth_failed', request.url)
        );
      }
    }

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=${error}`, request.url)
      );
    }

    // Start OAuth flow - redirect to Notion
    const authUrl = getNotionOAuthUrl(session.user.id);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Notion auth error:', error);
    return NextResponse.redirect(
      new URL('/settings?error=auth_error', request.url)
    );
  }
}
