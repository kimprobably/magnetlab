'use client';

import { useEffect, useState, useRef } from 'react';

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

// Extract Cal.com path from URL
function getCalLink(url: string): string {
  // URL format: https://cal.com/username/event-type
  const match = url.match(/cal\.com\/(.+?)(?:\?|$)/);
  if (match) {
    return match[1];
  }
  // If not a full URL, assume it's already the path
  return url.replace(/^https?:\/\/cal\.com\//, '');
}

export function CalendlyEmbed({ url }: CalendlyEmbedProps) {
  const [embedType] = useState<EmbedType>(() => detectEmbedType(url));
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedType === 'calendly') {
      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existingScript) {
        setScriptLoaded(true);
        return;
      }

      // Load Calendly widget script
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);

      return () => {
        // Don't remove script on unmount as it might be used elsewhere
      };
    }

    if (embedType === 'cal') {
      // Check if Cal already loaded
      if (typeof window !== 'undefined' && (window as unknown as { Cal?: unknown }).Cal) {
        setScriptLoaded(true);
        return;
      }

      // Load Cal.com embed script using their recommended method
      const script = document.createElement('script');
      script.innerHTML = `
        (function (C, A, L) {
          let p = function (a, ar) { a.q.push(ar); };
          let d = C.document;
          C.Cal = C.Cal || function () {
            let cal = C.Cal;
            let ar = arguments;
            if (!cal.loaded) {
              cal.ns = {};
              cal.q = cal.q || [];
              d.head.appendChild(d.createElement("script")).src = A;
              cal.loaded = true;
            }
            if (ar[0] === L) {
              const api = function () { p(api, arguments); };
              const namespace = ar[1];
              api.q = api.q || [];
              typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar);
              return;
            }
            p(cal, ar);
          };
        })(window, "https://app.cal.com/embed/embed.js", "init");
        Cal("init", {origin:"https://cal.com"});
      `;
      document.head.appendChild(script);

      // Wait for Cal to be available
      const checkCal = setInterval(() => {
        if (typeof window !== 'undefined' && (window as unknown as { Cal?: unknown }).Cal) {
          setScriptLoaded(true);
          clearInterval(checkCal);
        }
      }, 100);

      return () => {
        clearInterval(checkCal);
      };
    }
  }, [embedType]);

  // Initialize Cal.com inline embed after script loads
  useEffect(() => {
    if (embedType === 'cal' && scriptLoaded && containerRef.current) {
      const calLink = getCalLink(url);
      const Cal = (window as unknown as { Cal: (action: string, target: HTMLElement | string, options: Record<string, unknown>) => void }).Cal;

      if (Cal && containerRef.current) {
        // Clear container first
        containerRef.current.innerHTML = '';

        Cal("inline", containerRef.current, {
          calLink: calLink,
          config: {
            theme: "dark",
          },
        });
      }
    }
  }, [embedType, scriptLoaded, url]);

  if (embedType === 'calendly') {
    const calendlyUrl = url.startsWith('https://') ? url : `https://calendly.com/${url}`;
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
    return (
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden"
        style={{
          minWidth: '320px',
          height: '630px',
          background: '#18181B',
          border: '1px solid #27272A',
          borderRadius: '12px',
        }}
      >
        {!scriptLoaded && (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Loading calendar...
          </div>
        )}
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
