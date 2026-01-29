import { render, screen } from '@testing-library/react';
import LogoBar from '../components/LogoBar';

const sampleLogos = [
  { id: '1', name: 'Acme Corp', imageUrl: '/logos/acme.svg', sortOrder: 0, isVisible: true },
  { id: '2', name: 'Globex', imageUrl: '/logos/globex.svg', sortOrder: 1, isVisible: true },
  { id: '3', name: 'Initech', imageUrl: '/logos/initech.png', sortOrder: 2, isVisible: true },
];

describe('LogoBar', () => {
  it('renders nothing when logos array is empty', () => {
    const { container } = render(<LogoBar logos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the "Trusted by" label', () => {
    render(<LogoBar logos={sampleLogos} />);
    expect(screen.getByText('Trusted by leaders at')).toBeInTheDocument();
  });

  it('renders all logo images', () => {
    render(<LogoBar logos={sampleLogos} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('sets correct alt text on images', () => {
    render(<LogoBar logos={sampleLogos} />);
    expect(screen.getByAltText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByAltText('Globex')).toBeInTheDocument();
    expect(screen.getByAltText('Initech')).toBeInTheDocument();
  });

  it('sets correct src on images', () => {
    render(<LogoBar logos={sampleLogos} />);
    const acmeImg = screen.getByAltText('Acme Corp') as HTMLImageElement;
    expect(acmeImg.src).toContain('/logos/acme.svg');
  });

  it('applies grayscale class to images', () => {
    render(<LogoBar logos={sampleLogos} />);
    const images = screen.getAllByRole('img');
    images.forEach((img) => {
      expect(img).toHaveClass('grayscale');
    });
  });

  it('renders a single logo', () => {
    render(<LogoBar logos={[sampleLogos[0]]} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });
});
