'use client';

import { cn } from '@/lib/utils';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  options: string[];
  disabled?: boolean;
  label?: string;
}

export function IconPicker({
  value,
  onChange,
  options,
  disabled = false,
  label = 'Icon',
}: IconPickerProps): JSX.Element {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            disabled={disabled}
            className={cn(
              'w-10 h-10 text-xl rounded-lg border transition-colors',
              value === emoji
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export const LIBRARY_ICONS = ['📚', '📁', '🎯', '💡', '🚀', '⭐', '📖', '🔥', '💎', '🎨'];
export const RESOURCE_ICONS = ['🔗', '📎', '🌐', '📹', '🎧', '📊', '📈', '🛠️', '📝', '💻'];
