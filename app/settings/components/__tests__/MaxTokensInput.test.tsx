import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MaxTokensInput from '../MaxTokensInput';

describe('MaxTokensInput', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Max Tokens/i)).toBeInTheDocument();
    });

    it('should render a number input with min of 1', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Max Tokens/i) as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('min', '1');
    });

    it('should reflect the provided value', () => {
      render(<MaxTokensInput value={1500} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Max Tokens/i) as HTMLInputElement;
      expect(input.value).toBe('1500');
    });
  });

  describe('Valid Input', () => {
    it('should call onChange with a positive integer', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Max Tokens/i);
      fireEvent.change(input, { target: { value: '3000' } });

      expect(mockOnChange).toHaveBeenCalledWith(3000);
      expect(typeof mockOnChange.mock.calls[0][0]).toBe('number');
    });
  });

  describe('Validation', () => {
    it('should not call onChange for zero', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Max Tokens/i);
      fireEvent.change(input, { target: { value: '0' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not call onChange for a negative value', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Max Tokens/i);
      fireEvent.change(input, { target: { value: '-5' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should not call onChange for non-numeric input', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Max Tokens/i);
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should show a validation error for a non-positive value', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Max Tokens/i);
      fireEvent.change(input, { target: { value: '0' } });

      expect(screen.getByText(/must be a positive number/i)).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} disabled={true} />);

      expect(screen.getByLabelText(/Max Tokens/i)).toBeDisabled();
    });

    it('should be enabled by default', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Max Tokens/i)).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should associate label with the input', () => {
      render(<MaxTokensInput value={2000} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Max Tokens/i);
      expect(input).toHaveAttribute('id', 'max-tokens');
    });
  });
});

// Made with Bob
