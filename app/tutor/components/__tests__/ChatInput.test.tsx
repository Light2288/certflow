import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from '../ChatInput';

describe('ChatInput', () => {
  describe('Rendering', () => {
    it('renders textarea and send button', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} placeholder="Custom placeholder" />);

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('displays keyboard hint text', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      expect(screen.getByText(/press/i)).toBeInTheDocument();
      expect(screen.getByText('Enter')).toBeInTheDocument();
      expect(screen.getByText(/shift \+ enter/i)).toBeInTheDocument();
    });
  });

  describe('Text Input', () => {
    it('allows typing in textarea', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(textarea, 'Hello AI');

      expect(textarea).toHaveValue('Hello AI');
    });

    it('updates value as user types', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(textarea, 'Test message');

      expect(textarea).toHaveValue('Test message');
    });
  });

  describe('Sending Messages', () => {
    it('calls onSend when send button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('calls onSend when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(textarea, 'Test message{Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('does not send on Shift+Enter (allows new line)', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(mockOnSend).not.toHaveBeenCalled();
      expect(textarea).toHaveValue('Line 1\nLine 2');
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(textarea, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('trims whitespace before sending', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(textarea, '  Test message  ');
      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('does not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(textarea, '   ');
      await user.click(screen.getByRole('button', { name: /send/i }));

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables textarea when disabled prop is true', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      expect(textarea).toBeDisabled();
    });

    it('disables send button when disabled prop is true', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const sendButton = screen.getByRole('button');
      expect(sendButton).toBeDisabled();
    });

    it('shows loading spinner when disabled', () => {
      const mockOnSend = vi.fn();
      const { container } = render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows "Thinking..." text when disabled', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      expect(screen.getByText(/thinking/i)).toBeInTheDocument();
    });

    it('does not call onSend when disabled', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const sendButton = screen.getByRole('button');
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('Button State', () => {
    it('disables send button when input is empty', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(textarea, 'Test');

      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Character Count', () => {
    it('shows character count when approaching limit', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      const longText = 'a'.repeat(450);
      
      await user.type(textarea, longText);

      expect(screen.getByText(/450\/1000/)).toBeInTheDocument();
    });

    it('does not show character count for short messages', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      await user.type(textarea, 'Short message');

      expect(screen.queryByText(/\/1000/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on send button', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByLabelText('Send message');
      expect(sendButton).toBeInTheDocument();
    });

    it('textarea is keyboard accessible', () => {
      const mockOnSend = vi.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/ask me anything/i);
      
      // Textarea should be focusable (has no tabindex=-1)
      expect(textarea).not.toHaveAttribute('tabindex', '-1');
      
      // Manually focus to test accessibility
      textarea.focus();
      expect(textarea).toHaveFocus();
    });
  });
});

// Made with Bob
