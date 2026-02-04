/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibrarySearch } from '@/components/library/LibrarySearch';

describe('LibrarySearch', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    isDark: false,
    itemCount: 10,
    totalCount: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(<LibrarySearch {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search resources...')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const onChange = jest.fn();
    render(<LibrarySearch {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Search resources...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('shows clear button when value is present', () => {
    render(<LibrarySearch {...defaultProps} value="test" />);

    // There should be a button to clear the search
    const clearButton = screen.getByRole('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    const onChange = jest.fn();
    render(<LibrarySearch {...defaultProps} value="test" onChange={onChange} />);

    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('shows count when filtered results differ from total', () => {
    render(<LibrarySearch {...defaultProps} value="test" itemCount={5} totalCount={10} />);

    expect(screen.getByText('Showing 5 of 10 resources')).toBeInTheDocument();
  });

  it('does not show count when all results match', () => {
    render(<LibrarySearch {...defaultProps} value="" itemCount={10} totalCount={10} />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});
