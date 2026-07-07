/**
 * Tests for AI Tutor Page
 *
 * Tests the main tutor page functionality including:
 * - Settings integration
 * - Provider-specific UI states
 * - Message handling
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorPage from '../page';
import { SettingsProvider } from '@/lib/contexts/settings-context';
import * as settingsStorage from '@/lib/settings/settings-storage';
import type { AISettings } from '@/lib/types/ai-settings';

// Create mock chat function
const mockChat = vi.fn().mockResolvedValue({
  content: 'This is a test response from the AI',
  model: 'test-model',
  finishReason: 'stop',
});

// Mock the AI service
vi.mock('@/lib/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai')>();
  return {
    ...actual,
    AIService: vi.fn(function(this: { chat: typeof mockChat }) {
      this.chat = mockChat;
      return this;
    }),
  };
});

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('TutorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderWithSettings = (settings?: Partial<AISettings>) => {
    if (settings) {
      vi.spyOn(settingsStorage, 'loadSettings').mockReturnValue({
        success: true,
        data: {
          provider: 'mock',
          temperature: 0.7,
          maxTokens: 2000,
          ...settings,
        },
      });
    }

    return render(
      <SettingsProvider>
        <TutorPage />
      </SettingsProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the tutor page', () => {
      renderWithSettings();

      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
      expect(screen.getByText('Get personalized help and explanations')).toBeInTheDocument();
    });

    it('should render back to home link', () => {
      renderWithSettings();

      const backLink = screen.getByText('Back to Home');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('should render chat input', () => {
      renderWithSettings();

      expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument();
    });
  });

  describe('Provider Status Indicator', () => {
    it('should show mock provider status with yellow indicator', async () => {
      renderWithSettings({ provider: 'mock' });

      await waitFor(() => {
        expect(screen.getByText('Mock Provider (Demo)')).toBeInTheDocument();
      });
    });

    it('should show OpenAI provider status with green indicator', async () => {
      renderWithSettings({ 
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
      });

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });
    });

    it('should show Anthropic provider status', async () => {
      renderWithSettings({ 
        provider: 'anthropic',
        apiKey: 'sk-ant-test-key',
      });

      await waitFor(() => {
        expect(screen.getByText('Anthropic')).toBeInTheDocument();
      });
    });

    it('should show Google AI provider status', async () => {
      renderWithSettings({ 
        provider: 'google',
        apiKey: 'AIza-test-key',
      });

      await waitFor(() => {
        expect(screen.getByText('Google AI (Gemini)')).toBeInTheDocument();
      });
    });

    it('should show Ollama provider status', async () => {
      renderWithSettings({ 
        provider: 'ollama',
        model: 'llama2',
      });

      await waitFor(() => {
        expect(screen.getByText('Ollama (Local)')).toBeInTheDocument();
      });
    });
  });

  describe('Info Banner', () => {
    it('should show demo mode banner for mock provider', async () => {
      renderWithSettings({ provider: 'mock' });

      await waitFor(() => {
        expect(screen.getByText(/Demo Mode:/)).toBeInTheDocument();
        expect(screen.getByText(/Using pre-defined responses/)).toBeInTheDocument();
      });
    });

    it('should show API key required banner when provider needs key but none is set', async () => {
      renderWithSettings({ 
        provider: 'openai',
        apiKey: undefined,
      });

      await waitFor(() => {
        expect(screen.getByText(/Configuration Required:/)).toBeInTheDocument();
        expect(screen.getByText(/requires an API key/)).toBeInTheDocument();
      });
    });

    it('should show active AI banner when provider is configured', async () => {
      renderWithSettings({ 
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
      });

      await waitFor(() => {
        expect(screen.getByText(/AI Tutor Active:/)).toBeInTheDocument();
        expect(screen.getByText(/Using OpenAI/)).toBeInTheDocument();
        expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
      });
    });

    it('should show active AI banner for Ollama without API key requirement', async () => {
      renderWithSettings({ 
        provider: 'ollama',
        model: 'llama2',
      });

      await waitFor(() => {
        expect(screen.getByText(/AI Tutor Active:/)).toBeInTheDocument();
        expect(screen.getByText(/Using Ollama/)).toBeInTheDocument();
      });
    });

    it('should hide banner after first message', async () => {
      const user = userEvent.setup();
      renderWithSettings({ provider: 'mock' });

      await waitFor(() => {
        expect(screen.getByText(/Demo Mode:/)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Hello');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Demo Mode:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Message Handling', () => {
    it('should send message and display response', async () => {
      const user = userEvent.setup();
      renderWithSettings({ provider: 'mock' });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'What is machine learning?');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('What is machine learning?')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('This is a test response from the AI')).toBeInTheDocument();
      });
    });

    it('should show loading state while waiting for response', async () => {
      const user = userEvent.setup();
      
      // Make the mock chat function delay to allow us to catch the loading state
      mockChat.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            content: 'This is a test response from the AI',
            model: 'test-model',
            finishReason: 'stop',
          }), 100)
        )
      );
      
      renderWithSettings({ provider: 'mock' });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Test message');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Input should be disabled during loading
      await waitFor(() => {
        expect(input).toBeDisabled();
      });
      
      // Wait for response to complete
      await waitFor(() => {
        expect(screen.getByText('This is a test response from the AI')).toBeInTheDocument();
      });
      
      // Input should be enabled again after response
      expect(input).not.toBeDisabled();
    });

    it('should handle AI service errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock chat to throw error
      mockChat.mockRejectedValueOnce(new Error('API Error'));

      renderWithSettings({ provider: 'openai', apiKey: 'sk-test' });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText(/Unexpected Error/i)).toBeInTheDocument();
      });
      
      // Reset mock
      mockChat.mockResolvedValue({
        content: 'This is a test response from the AI',
        model: 'test-model',
        finishReason: 'stop',
      });
    });

    it('should show specific error message for missing API key', async () => {
      const user = userEvent.setup();
      const { AIServiceError } = await import('@/lib/ai');
      
      // Mock chat to throw AIServiceError with MISSING_API_KEY code
      mockChat.mockRejectedValueOnce(
        new AIServiceError('API key not configured', 'MISSING_API_KEY', 'OpenAI')
      );

      renderWithSettings({ provider: 'openai' });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText(/API Key Required/i)).toBeInTheDocument();
        expect(screen.getByText(/OpenAI needs an API key/i)).toBeInTheDocument();
      });
    });

    it('should show specific error message for rate limit', async () => {
      const user = userEvent.setup();
      const { AIServiceError } = await import('@/lib/ai');
      
      mockChat.mockRejectedValueOnce(
        new AIServiceError('Rate limit exceeded', 'RATE_LIMIT', 'OpenAI')
      );

      renderWithSettings({ provider: 'openai', apiKey: 'sk-test' });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText(/Rate Limit Reached/i)).toBeInTheDocument();
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    it('should show retry button after error', async () => {
      const user = userEvent.setup();
      
      mockChat.mockRejectedValueOnce(new Error('Network error'));

      renderWithSettings({ provider: 'openai', apiKey: 'sk-test' });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText(/Unexpected Error/i)).toBeInTheDocument();
      });

      // Retry button should appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry failed message when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // First attempt fails
      mockChat.mockRejectedValueOnce(new Error('Network error'));
      // Second attempt succeeds
      mockChat.mockResolvedValueOnce({
        content: 'Success after retry',
        model: 'test-model',
        finishReason: 'stop',
      });

      renderWithSettings({ provider: 'openai', apiKey: 'sk-test' });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/Unexpected Error/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument();
      });

      // Retry button should disappear
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should show max retries message after 3 failed attempts', async () => {
      const user = userEvent.setup();
      
      // All attempts fail
      mockChat.mockRejectedValue(new Error('Persistent error'));

      renderWithSettings({ provider: 'openai', apiKey: 'sk-test' });

      const input = screen.getByPlaceholderText(/ask me anything/i);
      
      // First attempt (retryCount becomes 1, so button shows "2 left")
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry.*2 left/i })).toBeInTheDocument();
      });

      // Second attempt (retryCount becomes 2, so button shows "1 left")
      await user.click(screen.getByRole('button', { name: /retry/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry.*1 left/i })).toBeInTheDocument();
      });

      // Third attempt (retryCount becomes 3, max retries reached)
      await user.click(screen.getByRole('button', { name: /retry/i }));
      
      // Should show max retries message
      await waitFor(() => {
        expect(screen.getByText(/Maximum retries reached/i)).toBeInTheDocument();
      });

      // Retry button should not be visible
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Settings Integration', () => {
    it('should create AI service with correct settings', async () => {
      const { AIService } = await import('@/lib/ai');
      
      renderWithSettings({
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 1000,
      });

      await waitFor(() => {
        expect(AIService).toHaveBeenCalledWith({
          provider: 'openai',
          apiKey: 'sk-test-key',
          model: 'gpt-4',
          baseUrl: undefined,
          temperature: 0.5,
          maxTokens: 1000,
        });
      });
    });

    it('should recreate AI service when settings change', async () => {
      const { AIService } = await import('@/lib/ai');
      
      // First render with mock provider
      const { unmount } = renderWithSettings({ provider: 'mock' });

      await waitFor(() => {
        expect(AIService).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'mock' })
        );
      });

      // Clear the mock to track new calls
      vi.clearAllMocks();
      
      // Unmount the first instance
      unmount();

      // Render again with different settings
      renderWithSettings({
        provider: 'openai',
        apiKey: 'sk-test',
      });

      await waitFor(() => {
        expect(AIService).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'openai' })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithSettings();

      const heading = screen.getByRole('heading', { name: 'AI Tutor' });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible form controls', () => {
      renderWithSettings();

      const input = screen.getByPlaceholderText(/ask me anything/i);
      expect(input).toBeInTheDocument();
    });
  });
});

// Made with Bob