import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CTAButton from '../components/CTAButton';

describe('CTAButton', () => {
  it('renders button text', () => {
    render(<CTAButton text="Book a Call" />);
    expect(screen.getByText('Book a Call')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<CTAButton text="Click Me" onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders primary variant by default', () => {
    render(<CTAButton text="Primary" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-violet-500');
  });

  it('renders secondary variant', () => {
    render(<CTAButton text="Secondary" variant="secondary" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-zinc-100');
  });

  it('renders large size', () => {
    render(<CTAButton text="Large" size="large" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-8');
    expect(button.className).toContain('text-lg');
  });

  it('renders default size', () => {
    render(<CTAButton text="Default" size="default" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-6');
    expect(button.className).toContain('text-base');
  });

  it('renders subtext when provided', () => {
    render(<CTAButton text="Main" subtext="No obligation" />);
    expect(screen.getByText('No obligation')).toBeInTheDocument();
  });

  it('does not render subtext when omitted', () => {
    const { container } = render(<CTAButton text="Main" />);
    const spans = container.querySelectorAll('span');
    const subtextSpan = Array.from(spans).find((s) => s.className.includes('opacity-80'));
    expect(subtextSpan).toBeUndefined();
  });

  it('applies custom className', () => {
    render(<CTAButton text="Styled" className="w-full" />);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('renders with icon=none and shows no icon', () => {
    const { container } = render(<CTAButton text="No Icon" icon="none" />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
