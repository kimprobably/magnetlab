import React from 'react';

interface TestimonialQuoteProps {
  quote?: string;
  author?: string;
  role?: string;
  result?: string;
  className?: string;
}

const DEFAULT_QUOTE =
  'The blueprint showed me exactly where I was leaving money on the table. Within 30 days of implementing the profile rewrite and content plan, I had 3 new discovery calls booked from LinkedIn alone.';
const DEFAULT_AUTHOR = 'Recent Blueprint Client';
const DEFAULT_ROLE = 'B2B Consultant';

const TestimonialQuote: React.FC<TestimonialQuoteProps> = ({
  quote = DEFAULT_QUOTE,
  author = DEFAULT_AUTHOR,
  role = DEFAULT_ROLE,
  result,
  className = '',
}) => {
  return (
    <div className={`max-w-3xl mx-auto ${className}`}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none p-6 sm:p-8 border-l-4 border-l-violet-500">
        <blockquote className="text-lg sm:text-xl text-zinc-800 dark:text-zinc-200 leading-relaxed mb-6 italic">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{author}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{role}</p>
          </div>
          {result && (
            <div className="bg-violet-50 border border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/20 rounded-lg px-4 py-2">
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestimonialQuote;
