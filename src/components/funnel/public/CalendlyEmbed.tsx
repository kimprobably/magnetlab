'use client';

import { useEffect, useState } from 'react';

interface CalendlyEmbedProps {
  url: string;
}

type EmbedType = 'calendly' | 'cal' | 'unknown';

function detectEmbedType(url: string): EmbedType {
  if (url.includes('calendly.com') || url.includes('calendly/')) {
    return 'calendly';
  }
  if (url.includes('cal.com') || url.includes('cal/')) {
    return 'cal';
  }
  return 'unknown';
}

export function CalendlyEmbed({ url }: CalendlyEmbedProps) {
  const [embedType] = useState<EmbedType>(() => detectEmbedType(url));

  useEffect(() => {
    if (embedType === 'calendly') {
      // Load Calendly widget script
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }

    if (embedType === 'cal') {
      // Load Cal.com embed script
      const script = document.createElement('script');
      script.src = 'https://app.cal.com/embed/embed.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src="https://app.cal.com/embed/embed.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [embedType]);

  // Format URLs appropriately
  const getFormattedUrl = () => {
    if (embedType === 'calendly') {
      return url.startsWith('https://') ? url : `https://calendly.com/${url}`;
    }
    if (embedType === 'cal') {
      return url.startsWith('https://') ? url : `https://cal.com/${url}`;
    }
    return url;
  };

  // Extract Cal.com username and event from URL
  const getCalComParams = () => {
    const formattedUrl = getFormattedUrl();
    // URL format: https://cal.com/username/event-type
    const match = formattedUrl.match(/cal\.com\/([^/]+)(?:\/([^?]+))?/);
    if (match) {
      return {
        calLink: match[2] ? `${match[1]}/${match[2]}` : match[1],
      };
    }
    return { calLink: url.replace(/^https?:\/\/cal\.com\//, '') };
  };

  if (embedType === 'calendly') {
    const calendlyUrl = getFormattedUrl();
    return (
      <div
        className="calendly-inline-widget rounded-xl overflow-hidden"
        data-url={`${calendlyUrl}?background_color=18181b&text_color=fafafa&primary_color=8b5cf6`}
        style={{
          minWidth: '320px',
          height: '630px',
          background: '#18181B',
          border: '1px solid #27272A',
          borderRadius: '12px',
        }}
      />
    );
  }

  if (embedType === 'cal') {
    const { calLink } = getCalComParams();
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          minWidth: '320px',
          height: '630px',
          background: '#18181B',
          border: '1px solid #27272A',
          borderRadius: '12px',
        }}
      >
        <cal-inline
          data-cal-link={calLink}
          data-cal-config='{"theme":"dark"}'
          style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
          }}
        />
      </div>
    );
  }

  // Fallback for unknown URL type - try iframe
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        minWidth: '320px',
        height: '630px',
        background: '#18181B',
        border: '1px solid #27272A',
        borderRadius: '12px',
      }}
    >
      <iframe
        src={url}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Booking Calendar"
      />
    </div>
  );
}
