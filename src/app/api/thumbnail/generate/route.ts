// API Route: Generate Thumbnail
// POST /api/thumbnail/generate

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateNotionThumbnail, generateBrandedThumbnail } from '@/lib/services/thumbnail';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/utils/supabase-server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leadMagnetId, notionUrl, title, subtitle, useNotionScreenshot } = body as {
      leadMagnetId: string;
      notionUrl?: string;
      title?: string;
      subtitle?: string;
      useNotionScreenshot?: boolean;
    };

    if (!leadMagnetId) {
      return NextResponse.json({ error: 'Missing leadMagnetId' }, { status: 400 });
    }

    let thumbnail: Buffer;

    if (useNotionScreenshot && notionUrl) {
      // Screenshot Notion page
      thumbnail = await generateNotionThumbnail(notionUrl);
    } else if (title) {
      // Generate branded thumbnail
      thumbnail = await generateBrandedThumbnail(title, subtitle);
    } else {
      return NextResponse.json(
        { error: 'Either notionUrl or title must be provided' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const supabase = createSupabaseAdminClient();
    const fileName = `thumbnails/${session.user.id}/${leadMagnetId}.png`;

    const { error: uploadError } = await supabase.storage
      .from('magnetlab')
      .upload(fileName, thumbnail, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload thumbnail' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('magnetlab')
      .getPublicUrl(fileName);

    const thumbnailUrl = urlData.publicUrl;

    // Update lead magnet
    const serverSupabase = await createSupabaseServerClient();
    await serverSupabase
      .from('lead_magnets')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', leadMagnetId)
      .eq('user_id', session.user.id);

    return NextResponse.json({ thumbnailUrl });
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}
