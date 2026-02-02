import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    description: 'Bulk page creation template. POST this shape to /api/funnel/bulk',
    pages: [
      {
        title: 'Your Lead Magnet Title (required)',
        slug: 'your-slug (optional, auto-generated from title)',
        optinHeadline: 'The headline visitors see (required)',
        optinSubline: 'Supporting text (optional)',
        optinButtonText: 'Button text (optional, default: Get It Now)',
        leadMagnetUrl: 'https://example.com/your-resource.pdf (required)',
        thankyouHeadline: 'Thank you page headline (optional)',
        thankyouSubline: 'Thank you page subtext (optional)',
        autoPublish: false,
      },
    ],
  });
}
