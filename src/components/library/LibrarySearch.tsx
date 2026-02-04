'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibrarySearchProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  itemCount: number;
  totalCount: number;
}

export function LibrarySearch({
  value,
  onChange,
  isDark,
  itemCount,
  totalCount,
}: LibrarySearchProps) {
  const showCount = value.trim() && itemCount !== totalCount;

  return (
    <div className="mb-6">
      <div className="relative">
        <Search
          className={cn(
            'absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2',
            isDark ? 'text-gray-500' : 'text-gray-400'
          )}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search resources..."
          className={cn(
            'w-full rounded-lg border py-3 pl-10 pr-10 text-sm outline-none transition-colors',
            isDark
              ? 'border-gray-800 bg-gray-900 text-white placeholder-gray-500 focus:border-gray-700'
              : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-gray-300'
          )}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition-colors',
              isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showCount && (
        <p
          className={cn(
            'mt-2 text-sm',
            isDark ? 'text-gray-400' : 'text-gray-500'
          )}
        >
          Showing {itemCount} of {totalCount} resources
        </p>
      )}
    </div>
  );
}
