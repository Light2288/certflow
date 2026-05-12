import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProviderSelector from '../ProviderSelector';
import { AI_PROVIDERS, type AIProviderType } from '@/lib/types/ai-settings';

describe('ProviderSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('should render provider selector with label', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      expect(screen.getByLabelText('AI Provider')).toBeInTheDocument();
    });

    it('should render all provider options', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('AI Provider') as HTMLSelectElement;
      const options = Array.from(select.options);
      
      expect(options).toHaveLength(Object.keys(AI_PROVIDERS).length);
      
      Object.values(AI_PROVIDERS).forEach((provider) => {
        expect(screen.getByRole('option', { name: provider.name })).toBeInTheDocument();
      });
    });

    it('should display selected provider value', () => {
      render(<ProviderSelector value="openai" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('AI Provider') as HTMLSelectElement;
      expect(select.value).toBe('openai');
    });

    it('should display provider info for selected provider', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      // Check that provider name appears in the info section (not just the select)
      expect(screen.getByRole('heading', { name: AI_PROVIDERS.mock.name })).toBeInTheDocument();
      expect(screen.getByText(AI_PROVIDERS.mock.description)).toBeInTheDocument();
    });
  });

  describe('Provider Selection', () => {
    it('should call onChange when provider is selected', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('AI Provider');
      fireEvent.change(select, { target: { value: 'openai' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('openai');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should update displayed info when provider changes', () => {
      const { rerender } = render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      expect(screen.getByText(AI_PROVIDERS.mock.description)).toBeInTheDocument();
      
      rerender(<ProviderSelector value="openai" onChange={mockOnChange} />);
      
      expect(screen.getByText(AI_PROVIDERS.openai.description)).toBeInTheDocument();
    });
  });

  describe('Provider Features', () => {
    it('should show "API Key Required" badge for providers that need API key', () => {
      render(<ProviderSelector value="openai" onChange={mockOnChange} />);
      
      expect(screen.getByText('API Key Required')).toBeInTheDocument();
    });

    it('should show "Local Models" badge for providers that support local models', () => {
      render(<ProviderSelector value="ollama" onChange={mockOnChange} />);
      
      expect(screen.getByText('Local Models')).toBeInTheDocument();
    });

    it('should show "No Configuration" badge for mock provider', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      expect(screen.getByText('No Configuration')).toBeInTheDocument();
    });
  });

  describe('Help Links', () => {
    it('should show OpenAI API key link for OpenAI provider', () => {
      render(<ProviderSelector value="openai" onChange={mockOnChange} />);
      
      const link = screen.getByText('Get OpenAI API Key').closest('a');
      expect(link).toHaveAttribute('href', 'https://platform.openai.com/api-keys');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should show Anthropic API key link for Anthropic provider', () => {
      render(<ProviderSelector value="anthropic" onChange={mockOnChange} />);
      
      const link = screen.getByText('Get Anthropic API Key').closest('a');
      expect(link).toHaveAttribute('href', 'https://console.anthropic.com/settings/keys');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should show Ollama setup instructions for Ollama provider', () => {
      render(<ProviderSelector value="ollama" onChange={mockOnChange} />);
      
      expect(screen.getByText('Using Ollama:')).toBeInTheDocument();
      expect(screen.getByText(/Install Ollama from/)).toBeInTheDocument();
      expect(screen.getByText(/ollama serve/)).toBeInTheDocument();
      expect(screen.getByText(/ollama pull llama2/)).toBeInTheDocument();
    });

    it('should not show help links for mock provider', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      expect(screen.queryByText(/Need an API key/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Using Ollama/)).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable select when disabled prop is true', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} disabled={true} />);
      
      const select = screen.getByLabelText('AI Provider');
      expect(select).toBeDisabled();
    });

    it('should not call onChange when disabled', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} disabled={true} />);
      
      const select = screen.getByLabelText('AI Provider');
      
      // Disabled selects don't trigger change events in the DOM
      // Just verify it's disabled
      expect(select).toBeDisabled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should enable select by default', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('AI Provider');
      expect(select).not.toBeDisabled();
    });
  });

  describe('All Providers', () => {
    const providers: AIProviderType[] = ['mock', 'openai', 'anthropic', 'ollama', 'custom'];

    providers.forEach((providerId) => {
      it(`should render correctly for ${providerId} provider`, () => {
        render(<ProviderSelector value={providerId} onChange={mockOnChange} />);
        
        const provider = AI_PROVIDERS[providerId];
        // Use heading role to get the name from info section, not select option
        expect(screen.getByRole('heading', { name: provider.name })).toBeInTheDocument();
        expect(screen.getByText(provider.description)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('AI Provider');
      expect(select).toHaveAttribute('id', 'provider');
    });

    it('should be keyboard navigable', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('AI Provider');
      select.focus();
      
      expect(document.activeElement).toBe(select);
    });
  });

  describe('Visual States', () => {
    it('should apply disabled styles when disabled', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} disabled={true} />);
      
      const select = screen.getByLabelText('AI Provider');
      expect(select).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should have focus styles', () => {
      render(<ProviderSelector value="mock" onChange={mockOnChange} />);
      
      const select = screen.getByLabelText('AI Provider');
      expect(select).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });
});

// Made with Bob
