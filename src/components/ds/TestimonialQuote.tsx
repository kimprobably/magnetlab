import React from 'react';

interface TestimonialQuoteProps {
  quote: string;
  author?: string;
  role?: string;
  result?: string;
  className?: string;
}

const TestimonialQuote: React.FC<TestimonialQuoteProps> = ({
  quote,
  author = 'Recent Client',
  role = '',
  result,
  className = '',
}) => {
  return (
    <div className={`max-w-3xl mx-auto ${className}`}>
      <div
        className="rounded-xl border shadow-sm p-6 sm:p-8"
        style={{
          backgroundColor: 'var(--ds-card)',
          borderColor: 'var(--ds-border)',
          borderLeftWidth: '4px',
          borderLeftColor: 'var(--ds-primary)',
        }}
      >
        <blockquote
          className="text-lg sm:text-xl leading-relaxed mb-6 italic"
          style={{ color: 'var(--ds-text)' }}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-semibold" style={{ color: 'var(--ds-text)' }}>{author}</p>
            {role && <p className="text-sm" style={{ color: 'var(--ds-muted)' }}>{role}</p>}
          </div>
          {result && (
            <div
              className="rounded-lg px-4 py-2"
              style={{
                backgroundColor: 'var(--ds-primary-light)',
                border: `1px solid var(--ds-primary-light)`,
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--ds-primary)' }}>{result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestimonialQuote;
