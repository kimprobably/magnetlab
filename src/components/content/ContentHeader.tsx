'use client';

import { Sun, Moon } from 'lucide-react';

interface ContentHeaderProps {
  logoUrl: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function ContentHeader({ logoUrl, isDark, onToggleTheme }: ContentHeaderProps) {
  const bgColor = isDark ? 'rgba(9,9,11,0.8)' : 'rgba(250,250,250,0.8)';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';
  const iconColor = isDark ? '#A1A1AA' : '#71717A';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: bgColor,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${borderColor}`,
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <div>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{ height: '2rem', width: 'auto' }}
            />
          ) : (
            <div style={{ height: '2rem' }} />
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
          }}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
