import { render, screen } from '@testing-library/react';
import SectionBridge from '../components/SectionBridge';

describe('SectionBridge', () => {
  it('renders bridge text', () => {
    render(<SectionBridge text="Here's what we found..." />);
    expect(screen.getByText("Here's what we found...")).toBeInTheDocument();
  });

  it('renders default variant with white background class', () => {
    const { container } = render(<SectionBridge text="Default" />);
    expect(container.firstChild).toHaveClass('bg-white');
  });

  it('renders accent variant', () => {
    const { container } = render(<SectionBridge text="Accent" variant="accent" />);
    expect((container.firstChild as HTMLElement).className).toContain('bg-violet-50/60');
  });

  it('renders gradient variant', () => {
    const { container } = render(<SectionBridge text="Gradient" variant="gradient" />);
    expect((container.firstChild as HTMLElement).className).toContain('bg-gradient-to-b');
  });

  it('renders step badge when stepNumber is provided', () => {
    render(<SectionBridge text="Step content" stepNumber={2} />);
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
  });

  it('renders step label alongside step number', () => {
    render(<SectionBridge text="Step content" stepNumber={1} stepLabel="Your Results" />);
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
    expect(screen.getByText(/Your Results/)).toBeInTheDocument();
  });

  it('does not render step badge when stepNumber is omitted', () => {
    const { container } = render(<SectionBridge text="No step" />);
    expect(container.querySelector('.rounded-full')).not.toBeInTheDocument();
  });

  it('renders step badge when stepNumber is 0', () => {
    render(<SectionBridge text="Zero step" stepNumber={0} />);
    expect(screen.getByText(/Step 0/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SectionBridge text="Custom" className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });
});
