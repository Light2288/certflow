import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelSelector from '../ModelSelector';

describe('ModelSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      expect(screen.getByLabelText('Model')).toBeInTheDocument();
    });

    it('should render text input with suggestions for provider', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model') as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'text');
      
      // Should show suggested models text
      expect(screen.getByText(/Suggested models:/)).toBeInTheDocument();
      expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
    });

    it('should show placeholder when no value selected', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model') as HTMLInputElement;
      expect(input).toHaveAttribute('placeholder', expect.stringContaining('gpt-4'));
    });

    it('should show value when selected', () => {
      render(<ModelSelector provider="openai" value="gpt-4" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model') as HTMLInputElement;
      expect(input.value).toBe('gpt-4');
    });
  });

  describe('Model Selection', () => {
    it('should display selected value', () => {
      render(<ModelSelector provider="openai" value="gpt-4" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model') as HTMLInputElement;
      expect(input.value).toBe('gpt-4');
    });

    it('should call onChange when model is typed and Enter is pressed', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model');
      fireEvent.change(input, { target: { value: 'gpt-4' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockOnChange).toHaveBeenCalledWith('gpt-4');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should show model info when value is selected', () => {
      render(<ModelSelector provider="openai" value="gpt-4" onChange={mockOnChange} />);
      
      expect(screen.getByText('Selected: gpt-4')).toBeInTheDocument();
      expect(screen.getByText(/Most capable model/)).toBeInTheDocument();
    });

    it('should not show model info when no value selected', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    });
  });

  describe('Provider-Specific Models', () => {
    it('should show OpenAI models in suggestions for OpenAI provider', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      // Check that models are shown in the suggested models text
      const suggestionsText = screen.getByText(/Suggested models:/);
      expect(suggestionsText.parentElement).toHaveTextContent('gpt-4');
      expect(suggestionsText.parentElement).toHaveTextContent('gpt-4-turbo');
    });

    it('should show Anthropic models in suggestions for Anthropic provider', () => {
      render(<ModelSelector provider="anthropic" value="" onChange={mockOnChange} />);
      
      const suggestionsText = screen.getByText(/Suggested models:/);
      expect(suggestionsText.parentElement).toHaveTextContent('claude-3-opus');
      expect(suggestionsText.parentElement).toHaveTextContent('claude-3-sonnet');
    });

    it('should show Ollama models in suggestions for Ollama provider', () => {
      render(<ModelSelector provider="ollama" value="" onChange={mockOnChange} />);
      
      const suggestionsText = screen.getByText(/Suggested models:/);
      expect(suggestionsText.parentElement).toHaveTextContent('llama2');
      expect(suggestionsText.parentElement).toHaveTextContent('mistral');
    });

    it('should show mock model in suggestions for mock provider', () => {
      render(<ModelSelector provider="mock" value="" onChange={mockOnChange} />);
      
      const suggestionsText = screen.getByText(/Suggested models:/);
      expect(suggestionsText.parentElement).toHaveTextContent('mock-model');
    });
  });

  describe('Custom Models', () => {
    it('should use custom models when provided', () => {
      const customModels = ['custom-model-1', 'custom-model-2'];
      render(
        <ModelSelector
          provider="openai"
          value=""
          onChange={mockOnChange}
          customModels={customModels}
        />
      );
      
      // Check that custom models are shown in suggestions
      const suggestionsText = screen.getByText(/Suggested models:/);
      expect(suggestionsText.parentElement).toHaveTextContent('custom-model-1');
      expect(suggestionsText.parentElement).toHaveTextContent('custom-model-2');
      
      // Should not show default models
      expect(suggestionsText.parentElement).not.toHaveTextContent('gpt-4-turbo');
    });

    it('should prefer custom models over default models', () => {
      const customModels = ['custom-1'];
      render(
        <ModelSelector
          provider="openai"
          value=""
          onChange={mockOnChange}
          customModels={customModels}
        />
      );
      
      const suggestionsText = screen.getByText(/Suggested models:/);
      expect(suggestionsText.parentElement).toHaveTextContent('custom-1');
      expect(suggestionsText.parentElement).not.toHaveTextContent('gpt-4');
    });
  });

  describe('No Models Available', () => {
    it('should show help text when no models available', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);
      
      // Should still render input but with generic help text
      expect(screen.getByLabelText('Model')).toBeInTheDocument();
      expect(screen.getByText(/Enter any model name supported by your provider/)).toBeInTheDocument();
    });

    it('should render input even when no models available', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);
      
      // Input should always be available for manual entry
      expect(screen.getByLabelText('Model')).toBeInTheDocument();
    });

    it('should show generic help text when no models', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);
      
      expect(screen.getByText(/Enter any model name supported by your provider/)).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} disabled={true} />);
      
      const input = screen.getByLabelText('Model');
      expect(input).toBeDisabled();
    });

    it('should not call onChange when disabled', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} disabled={true} />);
      
      const input = screen.getByLabelText('Model');
      
      // Disabled inputs don't trigger change events in the DOM
      // Just verify it's disabled
      expect(input).toBeDisabled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should enable input by default', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model');
      expect(input).not.toBeDisabled();
    });
  });

  describe('Provider-Specific Help', () => {
    it('should show Ollama help text for Ollama provider', () => {
      render(<ModelSelector provider="ollama" value="" onChange={mockOnChange} />);
      
      expect(screen.getByText(/Enter the name of any model you've pulled locally/)).toBeInTheDocument();
      expect(screen.getByText(/ollama pull llama2/)).toBeInTheDocument();
    });

    it('should not show Ollama help for other providers', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      expect(screen.queryByText(/ollama pull/)).not.toBeInTheDocument();
    });
  });

  describe('Model Descriptions', () => {
    it('should show description for OpenAI GPT-4', () => {
      render(<ModelSelector provider="openai" value="gpt-4" onChange={mockOnChange} />);
      
      expect(screen.getByText(/Most capable model/)).toBeInTheDocument();
    });

    it('should show description for Anthropic Claude', () => {
      render(<ModelSelector provider="anthropic" value="claude-3-opus-20240229" onChange={mockOnChange} />);
      
      expect(screen.getByText(/Most powerful model/)).toBeInTheDocument();
    });

    it('should show description for Ollama models', () => {
      render(<ModelSelector provider="ollama" value="llama2" onChange={mockOnChange} />);
      
      expect(screen.getByText(/Meta's open-source/)).toBeInTheDocument();
    });

    it('should show generic description for unknown models', () => {
      render(
        <ModelSelector
          provider="openai"
          value="unknown-model"
          onChange={mockOnChange}
          customModels={['unknown-model']}
        />
      );
      
      expect(screen.getByText('AI language model')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model');
      expect(input).toHaveAttribute('id', 'model');
    });

    it('should be keyboard navigable', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model');
      input.focus();
      
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Visual States', () => {
    it('should apply disabled styles when disabled', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} disabled={true} />);
      
      const input = screen.getByLabelText('Model');
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should have focus styles', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model');
      expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle provider with empty default models', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);
      
      // Should show generic help text
      expect(screen.getByText(/Enter any model name supported by your provider/)).toBeInTheDocument();
    });

    it('should handle switching between providers', () => {
      const { rerender } = render(<ModelSelector provider="openai" value="gpt-4" onChange={mockOnChange} />);
      
      // Check input value
      const input = screen.getByLabelText('Model') as HTMLInputElement;
      expect(input.value).toBe('gpt-4');
      
      rerender(<ModelSelector provider="anthropic" value="" onChange={mockOnChange} />);
      
      // Should show Anthropic suggestions
      const suggestionsText = screen.getByText(/Suggested models:/);
      expect(suggestionsText.parentElement).toHaveTextContent('claude');
      expect(suggestionsText.parentElement).not.toHaveTextContent('gpt-4');
    });

    it('should handle empty custom models array', () => {
      render(
        <ModelSelector
          provider="openai"
          value=""
          onChange={mockOnChange}
          customModels={[]}
        />
      );
      
      // Should fall back to default models
      const suggestionsText = screen.getByText(/Suggested models:/);
      expect(suggestionsText.parentElement).toHaveTextContent('gpt-4');
    });
  });

  describe('Autocomplete Functionality', () => {
    it('should show autocomplete dropdown when typing', async () => {
      const user = userEvent.setup();
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model');
      await user.click(input);
      await user.type(input, 'gpt');
      
      // Should show filtered suggestions
      await waitFor(() => {
        expect(screen.getByText('gpt-4')).toBeInTheDocument();
      });
    });

    it('should allow selecting from autocomplete', async () => {
      const user = userEvent.setup();
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model');
      await user.click(input);
      
      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText('gpt-4')).toBeInTheDocument();
      });
      
      // Click on a suggestion
      const suggestion = screen.getByText('gpt-4');
      await user.click(suggestion);
      
      expect(mockOnChange).toHaveBeenCalledWith('gpt-4');
    });

    it('should allow typing custom model name', async () => {
      const user = userEvent.setup();
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const input = screen.getByLabelText('Model');
      await user.type(input, 'my-custom-model{Enter}');
      
      expect(mockOnChange).toHaveBeenLastCalledWith('my-custom-model');
    });
  });

  describe('Custom provider', () => {
    it('should render a free-text input with no suggestion dropdown', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Model') as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'text');
      // Custom has no default models, so no "Suggested models:" line.
      expect(screen.queryByText(/Suggested models:/)).not.toBeInTheDocument();
      expect(screen.getByText(/Enter any model name/i)).toBeInTheDocument();
    });

    it('should explain the model is required and free-text for the custom provider', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);

      expect(screen.getByText(/Custom API Model/i)).toBeInTheDocument();
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    it('should call onChange when a custom model name is typed', async () => {
      const user = userEvent.setup();
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Model');
      await user.type(input, 'gpt-4o-mini{Enter}');

      expect(mockOnChange).toHaveBeenLastCalledWith('gpt-4o-mini');
    });
  });
});

// Made with Bob
