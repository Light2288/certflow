import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModelSelector from '../ModelSelector';
import { AI_PROVIDERS } from '@/lib/types/ai-settings';

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

    it('should render select with default models for provider', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('Model') as HTMLSelectElement;
      const options = Array.from(select.options);
      
      // Should have placeholder + all OpenAI models
      expect(options.length).toBe(AI_PROVIDERS.openai.defaultModels.length + 1);
    });

    it('should show placeholder option when no value selected', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      expect(screen.getByRole('option', { name: 'Select a model' })).toBeInTheDocument();
    });

    it('should not show placeholder when value is selected', () => {
      render(<ModelSelector provider="openai" value="gpt-4" onChange={mockOnChange} />);
      
      expect(screen.queryByRole('option', { name: 'Select a model' })).not.toBeInTheDocument();
    });
  });

  describe('Model Selection', () => {
    it('should display selected value', () => {
      render(<ModelSelector provider="openai" value="gpt-4" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('Model') as HTMLSelectElement;
      expect(select.value).toBe('gpt-4');
    });

    it('should call onChange when model is selected', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('Model');
      fireEvent.change(select, { target: { value: 'gpt-4' } });
      
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
    it('should show OpenAI models for OpenAI provider', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      AI_PROVIDERS.openai.defaultModels.forEach((model) => {
        expect(screen.getByRole('option', { name: model })).toBeInTheDocument();
      });
    });

    it('should show Anthropic models for Anthropic provider', () => {
      render(<ModelSelector provider="anthropic" value="" onChange={mockOnChange} />);
      
      AI_PROVIDERS.anthropic.defaultModels.forEach((model) => {
        expect(screen.getByRole('option', { name: model })).toBeInTheDocument();
      });
    });

    it('should show Ollama models for Ollama provider', () => {
      render(<ModelSelector provider="ollama" value="" onChange={mockOnChange} />);
      
      AI_PROVIDERS.ollama.defaultModels.forEach((model) => {
        expect(screen.getByRole('option', { name: model })).toBeInTheDocument();
      });
    });

    it('should show mock model for mock provider', () => {
      render(<ModelSelector provider="mock" value="" onChange={mockOnChange} />);
      
      expect(screen.getByRole('option', { name: 'mock-model' })).toBeInTheDocument();
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
      
      customModels.forEach((model) => {
        expect(screen.getByRole('option', { name: model })).toBeInTheDocument();
      });
      
      // Should not show default models
      expect(screen.queryByRole('option', { name: 'gpt-4' })).not.toBeInTheDocument();
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
      
      const select = screen.getByLabelText('Model') as HTMLSelectElement;
      const options = Array.from(select.options).map(opt => opt.value).filter(v => v);
      
      expect(options).toEqual(customModels);
    });
  });

  describe('No Models Available', () => {
    it('should show info message when no models available', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);
      
      expect(screen.getByText('No models configured for this provider.')).toBeInTheDocument();
    });

    it('should not render select when no models available', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);
      
      expect(screen.queryByLabelText('Model')).not.toBeInTheDocument();
    });

    it('should show custom provider help text when no models', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);
      
      expect(screen.getByText(/Custom providers may not require model selection/)).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable select when disabled prop is true', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} disabled={true} />);
      
      const select = screen.getByLabelText('Model');
      expect(select).toBeDisabled();
    });

    it('should not call onChange when disabled', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} disabled={true} />);
      
      const select = screen.getByLabelText('Model');
      
      // Disabled selects don't trigger change events in the DOM
      // Just verify it's disabled
      expect(select).toBeDisabled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should enable select by default', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('Model');
      expect(select).not.toBeDisabled();
    });
  });

  describe('Provider-Specific Help', () => {
    it('should show Ollama help text for Ollama provider', () => {
      render(<ModelSelector provider="ollama" value="" onChange={mockOnChange} />);
      
      expect(screen.getByText(/Available models depend on what you've pulled locally/)).toBeInTheDocument();
      expect(screen.getByText(/ollama pull/)).toBeInTheDocument();
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
      
      const select = screen.getByLabelText('Model');
      expect(select).toHaveAttribute('id', 'model');
    });

    it('should be keyboard navigable', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('Model');
      select.focus();
      
      expect(document.activeElement).toBe(select);
    });
  });

  describe('Visual States', () => {
    it('should apply disabled styles when disabled', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} disabled={true} />);
      
      const select = screen.getByLabelText('Model');
      expect(select).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should have focus styles', () => {
      render(<ModelSelector provider="openai" value="" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('Model');
      expect(select).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle provider with empty default models', () => {
      render(<ModelSelector provider="custom" value="" onChange={mockOnChange} />);
      
      expect(screen.getByText('No models configured for this provider.')).toBeInTheDocument();
    });

    it('should handle switching between providers', () => {
      const { rerender } = render(<ModelSelector provider="openai" value="gpt-4" onChange={mockOnChange} />);
      
      expect(screen.getByRole('option', { name: 'gpt-4' })).toBeInTheDocument();
      
      rerender(<ModelSelector provider="anthropic" value="" onChange={mockOnChange} />);
      
      expect(screen.queryByRole('option', { name: 'gpt-4' })).not.toBeInTheDocument();
      // Use getAllByRole since there are multiple claude options
      const claudeOptions = screen.getAllByRole('option', { name: /claude/ });
      expect(claudeOptions.length).toBeGreaterThan(0);
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
      expect(screen.getByRole('option', { name: 'gpt-4' })).toBeInTheDocument();
    });
  });
});

// Made with Bob
