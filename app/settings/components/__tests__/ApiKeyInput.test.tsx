import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeyInput from '../ApiKeyInput';

describe('ApiKeyInput', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render with default label', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);
      
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} label="Custom Label" />);
      
      expect(screen.getByLabelText('Custom Label')).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} required={true} />);
      
      const label = screen.getByText('API Key');
      expect(label.parentElement).toHaveTextContent('*');
    });

    it('should render with placeholder', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} placeholder="Enter key" />);
      
      expect(screen.getByPlaceholderText('Enter key')).toBeInTheDocument();
    });

    it('should render with help text', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} helpText="This is help text" />);
      
      expect(screen.getByText('This is help text')).toBeInTheDocument();
    });
  });

  describe('Input Behavior', () => {
    it('should display value', () => {
      render(<ApiKeyInput value="test-key-123" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(input.value).toBe('test-key-123');
    });

    it('should call onChange when typing', async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key');
      await user.type(input, 'abc');
      
      expect(mockOnChange).toHaveBeenCalledTimes(3);
      // Each character is typed separately, so last call is with 'c'
      expect(mockOnChange).toHaveBeenNthCalledWith(1, 'a');
      expect(mockOnChange).toHaveBeenNthCalledWith(2, 'b');
      expect(mockOnChange).toHaveBeenNthCalledWith(3, 'c');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} disabled={true} />);
      
      const input = screen.getByLabelText('API Key');
      expect(input).toBeDisabled();
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      render(<ApiKeyInput value="" onChange={mockOnChange} disabled={true} />);
      
      const input = screen.getByLabelText('API Key');
      await user.type(input, 'test');
      
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should start as password type', () => {
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(input.type).toBe('password');
    });

    it('should show visibility toggle button when has value', () => {
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} />);
      
      expect(screen.getByLabelText('Show API key')).toBeInTheDocument();
    });

    it('should not show visibility toggle when empty', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);
      
      expect(screen.queryByLabelText('Show API key')).not.toBeInTheDocument();
    });

    it('should toggle input type when visibility button clicked', () => {
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      const toggleButton = screen.getByLabelText('Show API key');
      
      expect(input.type).toBe('password');
      
      fireEvent.click(toggleButton);
      expect(input.type).toBe('text');
      expect(screen.getByLabelText('Hide API key')).toBeInTheDocument();
      
      fireEvent.click(toggleButton);
      expect(input.type).toBe('password');
      expect(screen.getByLabelText('Show API key')).toBeInTheDocument();
    });

    it('should disable visibility toggle when input is disabled', () => {
      render(<ApiKeyInput value="secret-key" onChange={mockOnChange} disabled={true} />);
      
      const toggleButton = screen.getByLabelText('Show API key');
      expect(toggleButton).toBeDisabled();
    });
  });

  describe('Clear Button', () => {
    it('should show clear button when has value', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} />);
      
      expect(screen.getByLabelText('Clear API key')).toBeInTheDocument();
    });

    it('should not show clear button when empty', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);
      
      expect(screen.queryByLabelText('Clear API key')).not.toBeInTheDocument();
    });

    it('should call onChange with empty string when clear button clicked', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} />);
      
      const clearButton = screen.getByLabelText('Clear API key');
      fireEvent.click(clearButton);
      
      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('should not show clear button when disabled', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} disabled={true} />);
      
      expect(screen.queryByLabelText('Clear API key')).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error when required and empty after blur', async () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} required={true} />);
      
      const input = screen.getByLabelText(/API Key/);
      
      // Focus and blur without entering value
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(screen.getByText('API key is required')).toBeInTheDocument();
      });
    });

    it('should not show error when required but has value', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} required={true} />);
      
      expect(screen.queryByText('API key is required')).not.toBeInTheDocument();
    });

    it('should not show error when focused even if empty and required', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} required={true} />);
      
      const input = screen.getByLabelText(/API Key/);
      fireEvent.focus(input);
      
      expect(screen.queryByText('API key is required')).not.toBeInTheDocument();
    });

    it('should not show error when disabled', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} required={true} disabled={true} />);
      
      const input = screen.getByLabelText(/API Key/);
      fireEvent.blur(input);
      
      expect(screen.queryByText('API key is required')).not.toBeInTheDocument();
    });

    it('should set aria-invalid when showing error', async () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} required={true} />);
      
      const input = screen.getByLabelText(/API Key/);
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Security Notice', () => {
    it('should show security notice when has value', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} />);
      
      expect(screen.getByText(/stored locally in your browser/)).toBeInTheDocument();
    });

    it('should not show security notice when empty', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);
      
      expect(screen.queryByText(/stored locally in your browser/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key');
      expect(input).toHaveAttribute('id', 'api-key');
    });

    it('should link help text with aria-describedby', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} helpText="Help text" />);
      
      const input = screen.getByLabelText('API Key');
      expect(input).toHaveAttribute('aria-describedby', 'api-key-help');
    });

    it('should be keyboard navigable', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key');
      input.focus();
      
      expect(document.activeElement).toBe(input);
    });

    it('should have accessible button labels', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} />);
      
      expect(screen.getByLabelText('Clear API key')).toBeInTheDocument();
      expect(screen.getByLabelText('Show API key')).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('should apply error border when showing error', async () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} required={true} />);
      
      const input = screen.getByLabelText(/API Key/);
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(input).toHaveClass('border-red-500');
      });
    });

    it('should apply disabled styles when disabled', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} disabled={true} />);
      
      const input = screen.getByLabelText('API Key');
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should have focus styles', () => {
      render(<ApiKeyInput value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key');
      expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long API keys', () => {
      const longKey = 'a'.repeat(200);
      render(<ApiKeyInput value={longKey} onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(input.value).toBe(longKey);
    });

    it('should handle special characters in API key', () => {
      const specialKey = 'sk-!@#$%^&*()_+-=[]{}|;:,.<>?';
      render(<ApiKeyInput value={specialKey} onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(input.value).toBe(specialKey);
    });

    it('should handle rapid toggle clicks', () => {
      render(<ApiKeyInput value="test-key" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      const toggleButton = screen.getByLabelText('Show API key');
      
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      
      expect(input.type).toBe('text');
    });
  });
});

// Made with Bob
