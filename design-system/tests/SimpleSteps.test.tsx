import { render, screen } from '@testing-library/react';
import SimpleSteps from '../components/SimpleSteps';

describe('SimpleSteps', () => {
  it('renders default heading and subheading', () => {
    render(<SimpleSteps />);
    expect(screen.getByText('What Happens Next')).toBeInTheDocument();
    expect(screen.getByText(/exactly what to expect/)).toBeInTheDocument();
  });

  it('renders all three default steps', () => {
    render(<SimpleSteps />);
    expect(screen.getByText('Book a 30-Min Call')).toBeInTheDocument();
    expect(screen.getByText('Get Your Implementation Plan')).toBeInTheDocument();
    expect(screen.getByText('See Results in 30 Days')).toBeInTheDocument();
  });

  it('renders default step numbers', () => {
    render(<SimpleSteps />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('renders custom heading and subheading', () => {
    render(<SimpleSteps heading="Getting Started" subheading="Follow these steps." />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Follow these steps.')).toBeInTheDocument();
  });

  it('renders custom steps', () => {
    const steps = [
      { number: 'A', title: 'First', description: 'Do this first.' },
      { number: 'B', title: 'Second', description: 'Do this second.' },
    ];
    render(<SimpleSteps steps={steps} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Do this first.')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    // Default steps should not be present
    expect(screen.queryByText('Book a 30-Min Call')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SimpleSteps className="extra-class" />);
    expect(container.firstChild).toHaveClass('extra-class');
  });
});
