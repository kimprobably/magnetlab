import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarketingBlock from '../components/MarketingBlock';

const makeBlock = (overrides = {}) => ({
  id: '1',
  blockType: 'feature' as const,
  title: 'Test Title',
  content: 'Test content paragraph.',
  sortOrder: 0,
  isVisible: true,
  ...overrides,
});

describe('MarketingBlock', () => {
  it('renders null when block is null', () => {
    const { container } = render(<MarketingBlock block={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when block is undefined', () => {
    const { container } = render(<MarketingBlock block={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when isVisible is false', () => {
    const { container } = render(
      <MarketingBlock block={makeBlock({ isVisible: false })} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when block has no content', () => {
    const { container } = render(
      <MarketingBlock block={makeBlock({ title: undefined, content: undefined })} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title', () => {
    render(<MarketingBlock block={makeBlock()} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders plain text content', () => {
    render(<MarketingBlock block={makeBlock()} />);
    expect(screen.getByText('Test content paragraph.')).toBeInTheDocument();
  });

  it('renders bold text in content', () => {
    render(
      <MarketingBlock block={makeBlock({ content: 'This is **bold** text.' })} />
    );
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');
  });

  it('renders italic text in content', () => {
    render(
      <MarketingBlock block={makeBlock({ content: 'This is *italic* text.' })} />
    );
    const italic = screen.getByText('italic');
    expect(italic.tagName).toBe('EM');
  });

  it('renders bullet lists', () => {
    render(
      <MarketingBlock block={makeBlock({ content: '- Item one\n- Item two\n- Item three' })} />
    );
    expect(screen.getByText('Item one')).toBeInTheDocument();
    expect(screen.getByText('Item two')).toBeInTheDocument();
    expect(screen.getByText('Item three')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MarketingBlock block={makeBlock()} className="mt-4" />
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });

  describe('CTA', () => {
    it('renders CTA link when ctaText and ctaUrl are provided', () => {
      render(
        <MarketingBlock
          block={makeBlock({
            blockType: 'cta',
            ctaText: 'Get Started',
            ctaUrl: 'https://example.com',
          })}
        />
      );
      const link = screen.getByText('Get Started');
      expect(link.closest('a')).toHaveAttribute('href', 'https://example.com');
    });

    it('opens external links in new tab', () => {
      render(
        <MarketingBlock
          block={makeBlock({
            ctaText: 'Visit',
            ctaUrl: 'https://external.com',
          })}
        />
      );
      const link = screen.getByText('Visit').closest('a');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not add target for relative links', () => {
      render(
        <MarketingBlock
          block={makeBlock({
            ctaText: 'Internal',
            ctaUrl: '/about',
          })}
        />
      );
      const link = screen.getByText('Internal').closest('a');
      expect(link).not.toHaveAttribute('target');
    });
  });

  describe('FAQ accordion', () => {
    const faqBlock = makeBlock({
      blockType: 'faq',
      title: 'FAQ',
      content: JSON.stringify({
        items: [
          { question: 'What is this?', answer: 'A design system.' },
          { question: 'How does it work?', answer: 'Just import and use.' },
        ],
      }),
    });

    it('renders FAQ questions', () => {
      render(<MarketingBlock block={faqBlock} />);
      expect(screen.getByText('What is this?')).toBeInTheDocument();
      expect(screen.getByText('How does it work?')).toBeInTheDocument();
    });

    it('does not show answers by default', () => {
      render(<MarketingBlock block={faqBlock} />);
      expect(screen.queryByText('A design system.')).not.toBeInTheDocument();
    });

    it('expands answer when question is clicked', async () => {
      const user = userEvent.setup();
      render(<MarketingBlock block={faqBlock} />);

      await user.click(screen.getByText('What is this?'));
      expect(screen.getByText('A design system.')).toBeInTheDocument();
    });

    it('collapses answer when clicked again', async () => {
      const user = userEvent.setup();
      render(<MarketingBlock block={faqBlock} />);

      await user.click(screen.getByText('What is this?'));
      expect(screen.getByText('A design system.')).toBeInTheDocument();

      await user.click(screen.getByText('What is this?'));
      expect(screen.queryByText('A design system.')).not.toBeInTheDocument();
    });

    it('closes previous answer when another is opened', async () => {
      const user = userEvent.setup();
      render(<MarketingBlock block={faqBlock} />);

      await user.click(screen.getByText('What is this?'));
      expect(screen.getByText('A design system.')).toBeInTheDocument();

      await user.click(screen.getByText('How does it work?'));
      expect(screen.queryByText('A design system.')).not.toBeInTheDocument();
      expect(screen.getByText('Just import and use.')).toBeInTheDocument();
    });

    it('parses plain-text FAQ format', async () => {
      const user = userEvent.setup();
      const plainFaq = makeBlock({
        blockType: 'faq',
        title: 'FAQ',
        content: '**What is it?**\nA tool.\n\n**Why use it?**\nBecause it works.',
      });
      render(<MarketingBlock block={plainFaq} />);

      expect(screen.getByText('What is it?')).toBeInTheDocument();
      expect(screen.getByText('Why use it?')).toBeInTheDocument();

      await user.click(screen.getByText('What is it?'));
      expect(screen.getByText('A tool.')).toBeInTheDocument();
    });
  });

  describe('JSON content', () => {
    it('renders title from JSON content', () => {
      render(
        <MarketingBlock
          block={makeBlock({
            title: undefined,
            content: JSON.stringify({ title: 'JSON Title', body: 'JSON body text.' }),
          })}
        />
      );
      expect(screen.getByText('JSON Title')).toBeInTheDocument();
      expect(screen.getByText('JSON body text.')).toBeInTheDocument();
    });
  });
});
