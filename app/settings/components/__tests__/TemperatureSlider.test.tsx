import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemperatureSlider from '../TemperatureSlider';

describe('TemperatureSlider', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<TemperatureSlider value={0.7} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Temperature/i)).toBeInTheDocument();
    });

    it('should render a range input with 0-1 bounds', () => {
      render(<TemperatureSlider value={0.7} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Temperature/i) as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'range');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '1');
    });

    it('should reflect the provided value', () => {
      render(<TemperatureSlider value={0.3} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Temperature/i) as HTMLInputElement;
      expect(input.value).toBe('0.3');
    });

    it('should display the current numeric value', () => {
      render(<TemperatureSlider value={0.3} onChange={mockOnChange} />);

      expect(screen.getByText('0.3')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onChange with a numeric value when moved', () => {
      render(<TemperatureSlider value={0.5} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Temperature/i);
      fireEvent.change(input, { target: { value: '0.8' } });

      expect(mockOnChange).toHaveBeenCalledWith(0.8);
      expect(typeof mockOnChange.mock.calls[0][0]).toBe('number');
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<TemperatureSlider value={0.5} onChange={mockOnChange} disabled={true} />);

      expect(screen.getByLabelText(/Temperature/i)).toBeDisabled();
    });

    it('should be enabled by default', () => {
      render(<TemperatureSlider value={0.5} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Temperature/i)).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should associate label with the input', () => {
      render(<TemperatureSlider value={0.5} onChange={mockOnChange} />);

      const input = screen.getByLabelText(/Temperature/i);
      expect(input).toHaveAttribute('id', 'temperature');
    });
  });
});

// Made with Bob
