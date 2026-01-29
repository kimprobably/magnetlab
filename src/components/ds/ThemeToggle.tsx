'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  /** Controlled dark mode state. If omitted, uses internal state from document class. */
  isDark?: boolean;
  /** Callback when toggled. If omitted, manages document class + localStorage internally. */
  onToggle?: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark: controlledIsDark, onToggle }) => {
  const [internalIsDark, setInternalIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  const isDark = controlledIsDark ?? internalIsDark;

  useEffect(() => {
    // Only manage document class when uncontrolled
    if (controlledIsDark !== undefined) return;

    if (internalIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [internalIsDark, controlledIsDark]);

  const handleClick = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsDark(!internalIsDark);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-zinc-400 hover:text-zinc-200" />
      ) : (
        <Moon className="w-5 h-5 text-zinc-600 hover:text-zinc-800" />
      )}
    </button>
  );
};

export default ThemeToggle;
