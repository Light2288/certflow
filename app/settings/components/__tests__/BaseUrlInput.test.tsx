import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BaseUrlInput from '../BaseUrlInput';

describe('BaseUrlInput', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Base URL/i)).toBeInTheDocument();
    });

    it('should reflect the provided value', () => {
      render(<BaseUrlInput value="http://localhost:11434" onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Base URL/i) as HTMLInputElement;
      expect(input.value).toBe('http://localhost:11434');
    });

    it('should render an empty input when value is empty', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Base URL/i) as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Interaction', () => {
    it('should call onChange when typing', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Base URL/i);
      fireEvent.change(input, { target: { value: 'http://localhost:11434' } });

      expect(mockOnChange).toHaveBeenCalledWith('http://localhost:11434');
    });

    it('should allow clearing to an empty value', () => {
      render(<BaseUrlInput value="http://localhost:11434" onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Base URL/i);
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('should not show an error for an empty value', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Base URL/i);
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} disabled={true} />);

      expect(screen.getByLabelText(/Base URL/i)).toBeDisabled();
    });

    it('should be enabled by default', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Base URL/i)).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should associate label with the input', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Base URL/i);
      expect(input).toHaveAttribute('id', 'base-url');
    });
  });

  describe('Required state', () => {
    it('should mark the field required and show an error when empty', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} required={true} />);

      const input = screen.getByLabelText(/Base URL/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText(/Base URL is required/i)).toBeInTheDocument();
    });

    it('should not show the required error once a value is present', () => {
      render(
        <BaseUrlInput
          value="https://example.com/v1/chat-models"
          onChange={mockOnChange}
          required={true}
        />
      );

      const input = screen.getByLabelText(/Base URL/i);
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByText(/Base URL is required/i)).not.toBeInTheDocument();
    });

    it('should not show a required error when not required', () => {
      render(<BaseUrlInput value="" onChange={mockOnChange} />);

      expect(screen.queryByText(/Base URL is required/i)).not.toBeInTheDocument();
    });
  });
});

// Made with Bob
