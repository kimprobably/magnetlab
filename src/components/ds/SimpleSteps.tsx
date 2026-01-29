import React from 'react';

interface Step {
  title: string;
  description: string;
  icon?: string;
}

interface SimpleStepsProps {
  heading?: string;
  subheading?: string;
  steps?: Step[];
  className?: string;
}

const DEFAULT_STEPS: Step[] = [
  {
    title: 'Book a 30-Min Call',
    description: "We'll review your blueprint together and identify your 3 quickest wins.",
  },
  {
    title: 'Get Your Implementation Plan',
    description: 'Walk away with a concrete 30-day action plan you can start today.',
  },
  {
    title: 'See Results in 30 Days',
    description: 'Most clients see their first inbound lead within 2-4 weeks of implementing.',
  },
];

const SimpleSteps: React.FC<SimpleStepsProps> = ({
  heading = 'What Happens Next',
  subheading = "Here's exactly what to expect when you book your strategy call.",
  steps = DEFAULT_STEPS,
  className = '',
}) => {
  return (
    <div
      className={`py-12 sm:py-16 px-4 ${className}`}
      style={{ background: `linear-gradient(to bottom, var(--ds-primary-light), transparent)` }}
    >
      <div className="max-w-4xl mx-auto">
        <h2
          className="text-2xl sm:text-3xl font-bold text-center mb-3"
          style={{ color: 'var(--ds-text)' }}
        >
          {heading}
        </h2>
        <p
          className="text-center mb-10 max-w-2xl mx-auto"
          style={{ color: 'var(--ds-muted)' }}
        >
          {subheading}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div
                className="text-5xl sm:text-6xl font-bold mb-3"
                style={{ color: 'var(--ds-primary)', opacity: 0.3 }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--ds-text)' }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--ds-muted)' }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleSteps;
