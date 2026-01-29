'use client';

import { useState, useEffect } from 'react';
import { List, X } from 'lucide-react';

interface TocSection {
  id: string;
  name: string;
}

interface TableOfContentsProps {
  sections: TocSection[];
  isDark: boolean;
  primaryColor: string;
}

export function TableOfContents({ sections, isDark, primaryColor }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const textColor = isDark ? '#FAFAFA' : '#09090B';
  const mutedColor = isDark ? '#A1A1AA' : '#71717A';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';
  const cardBg = isDark ? '#18181B' : '#FFFFFF';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileOpen(false);
  };

  const tocList = (
    <nav>
      <p
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: mutedColor,
          margin: '0 0 0.75rem 0',
        }}
      >
        Contents
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sections.map((section) => (
          <li key={section.id} style={{ marginBottom: '0.25rem' }}>
            <button
              onClick={() => handleClick(section.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                lineHeight: '1.375rem',
                width: '100%',
                textAlign: 'left',
                transition: 'color 0.15s',
                color: activeId === section.id ? primaryColor : mutedColor,
                fontWeight: activeId === section.id ? 500 : 400,
                borderLeft: activeId === section.id
                  ? `2px solid ${primaryColor}`
                  : '2px solid transparent',
              }}
            >
              {section.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block"
        style={{
          position: 'sticky',
          top: '5rem',
          width: '220px',
          flexShrink: 0,
          alignSelf: 'flex-start',
        }}
      >
        {tocList}
      </aside>

      {/* Mobile toggle button */}
      <button
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 40,
          background: primaryColor,
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '3rem',
          height: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        aria-label="Table of contents"
      >
        <List size={20} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 45,
              background: 'rgba(0,0,0,0.5)',
            }}
          />
          <div
            className="lg:hidden"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              background: cardBg,
              borderTop: `1px solid ${borderColor}`,
              borderRadius: '1rem 1rem 0 0',
              padding: '1.5rem',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontWeight: 600, color: textColor }}>Contents</span>
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: mutedColor,
                  padding: '0.25rem',
                }}
              >
                <X size={20} />
              </button>
            </div>
            {tocList}
          </div>
        </>
      )}
    </>
  );
}
