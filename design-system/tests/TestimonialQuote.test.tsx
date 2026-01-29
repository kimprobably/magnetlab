import { render, screen } from '@testing-library/react';
import TestimonialQuote from '../components/TestimonialQuote';

describe('TestimonialQuote', () => {
  it('renders with default props', () => {
    render(<TestimonialQuote />);
    expect(screen.getByText(/blueprint showed me exactly/)).toBeInTheDocument();
    expect(screen.getByText('Recent Blueprint Client')).toBeInTheDocument();
    expect(screen.getByText('B2B Consultant')).toBeInTheDocument();
  });

  it('renders custom quote, author, and role', () => {
    render(
      <TestimonialQuote
        quote="Amazing results"
        author="Jane Doe"
        role="VP Sales"
      />
    );
    expect(screen.getByText(/Amazing results/)).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('VP Sales')).toBeInTheDocument();
  });

  it('renders result badge when provided', () => {
    render(<TestimonialQuote result="3x Pipeline Growth" />);
    expect(screen.getByText('3x Pipeline Growth')).toBeInTheDocument();
  });

  it('does not render result badge when omitted', () => {
    const { container } = render(<TestimonialQuote />);
    expect(container.querySelector('.bg-violet-50')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<TestimonialQuote className="mt-8" />);
    expect(container.firstChild).toHaveClass('mt-8');
  });

  it('wraps quote in blockquote element', () => {
    render(<TestimonialQuote quote="Test quote" />);
    const blockquote = screen.getByText(/Test quote/).closest('blockquote');
    expect(blockquote).toBeInTheDocument();
  });
});
