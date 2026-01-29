import React from 'react';

interface Step {
  number: string;
  title: string;
  description: string;
}

interface SimpleStepsProps {
  heading?: string;
  subheading?: string;
  steps?: Step[];
  className?: string;
}

const DEFAULT_STEPS: Step[] = [
  {
    number: '01',
    title: 'Book a 30-Min Call',
    description: "We'll review your blueprint together and identify your 3 quickest wins.",
  },
  {
    number: '02',
    title: 'Get Your Implementation Plan',
    description: 'Walk away with a concrete 30-day action plan you can start today.',
  },
  {
    number: '03',
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
      className={`py-12 sm:py-16 px-4 bg-gradient-to-b from-violet-50 to-transparent dark:from-violet-950/10 dark:to-transparent ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 text-center mb-3">
          {heading}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 text-center mb-10 max-w-2xl mx-auto">
          {subheading}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-5xl sm:text-6xl font-bold text-violet-500/30 mb-3">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
