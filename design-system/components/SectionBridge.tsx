import React from 'react';

interface SectionBridgeProps {
  text: string;
  variant?: 'default' | 'accent' | 'gradient';
  stepNumber?: number;
  stepLabel?: string;
  className?: string;
}

const SectionBridge: React.FC<SectionBridgeProps> = ({
  text,
  variant = 'default',
  stepNumber,
  stepLabel,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-zinc-950',
    accent:
      'bg-violet-50/60 dark:bg-violet-500/5 border-y border-violet-100 dark:border-violet-500/10',
    gradient:
      'bg-gradient-to-b from-violet-50 to-transparent dark:from-violet-950/10 dark:to-transparent border-t border-violet-100 dark:border-violet-500/10',
  };

  return (
    <div className={`py-14 sm:py-20 px-4 -mx-4 ${variantStyles[variant]} ${className}`}>
      <div className="max-w-3xl mx-auto text-center space-y-4">
        {/* Step badge */}
        {stepNumber != null && (
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px flex-1 max-w-[60px] bg-violet-300/40 dark:bg-violet-500/20" />
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase tracking-widest">
              Step {stepNumber}
              {stepLabel && <span className="font-semibold">&mdash; {stepLabel}</span>}
            </span>
            <div className="h-px flex-1 max-w-[60px] bg-violet-300/40 dark:bg-violet-500/20" />
          </div>
        )}

        {/* Bridge text */}
        <p className="text-xl sm:text-2xl md:text-3xl text-zinc-700 dark:text-zinc-300 leading-relaxed font-light">
          {text}
        </p>
      </div>
    </div>
  );
};

export default SectionBridge;
