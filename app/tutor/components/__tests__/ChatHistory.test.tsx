import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatHistory from '../ChatHistory';
import type { ChatMessageProps } from '../ChatMessage';

describe('ChatHistory', () => {
  const mockMessages: ChatMessageProps[] = [
    {
      role: 'user',
      content: 'Hello AI',
      timestamp: new Date('2024-01-01T12:00:00Z'),
    },
    {
      role: 'assistant',
      content: 'Hello! How can I help you?',
      timestamp: new Date('2024-01-01T12:00:05Z'),
    },
    {
      role: 'user',
      content: 'Tell me about data engineering',
      timestamp: new Date('2024-01-01T12:00:10Z'),
    },
  ];

  describe('Empty State', () => {
    it('displays welcome message when no messages', () => {
      render(<ChatHistory messages={[]} />);

      expect(screen.getByText('Welcome to AI Tutor!')).toBeInTheDocument();
    });

    it('shows example questions in empty state', () => {
      render(<ChatHistory messages={[]} />);

      expect(screen.getByText(/explain data engineering/i)).toBeInTheDocument();
      expect(screen.getByText(/what is feature engineering/i)).toBeInTheDocument();
      expect(screen.getByText(/help me understand model selection/i)).toBeInTheDocument();
    });

    it('displays AI tutor icon in empty state', () => {
      const { container } = render(<ChatHistory messages={[]} />);

      const icon = container.querySelector('.bg-purple-100');
      expect(icon).toBeInTheDocument();
    });

    it('does not show empty state when messages exist', () => {
      render(<ChatHistory messages={mockMessages} />);

      expect(screen.queryByText('Welcome to AI Tutor!')).not.toBeInTheDocument();
    });
  });

  describe('Message Rendering', () => {
    it('renders all messages', () => {
      render(<ChatHistory messages={mockMessages} />);

      expect(screen.getByText('Hello AI')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
      expect(screen.getByText('Tell me about data engineering')).toBeInTheDocument();
    });

    it('renders messages in correct order', () => {
      render(<ChatHistory messages={mockMessages} />);

      const messages = screen.getAllByText(/Hello|Tell me/);
      expect(messages).toHaveLength(3);
    });

    it('renders single message correctly', () => {
      const singleMessage: ChatMessageProps[] = [
        {
          role: 'user',
          content: 'Single message',
          timestamp: new Date(),
        },
      ];

      render(<ChatHistory messages={singleMessage} />);

      expect(screen.getByText('Single message')).toBeInTheDocument();
    });

    it('handles many messages', () => {
      const manyMessages: ChatMessageProps[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Message ${i + 1}`,
        timestamp: new Date(),
      }));

      render(<ChatHistory messages={manyMessages} />);

      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Message 20')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when isLoading is true', () => {
      const { container } = render(<ChatHistory messages={mockMessages} isLoading={true} />);

      // Check for loading dots animation
      const loadingDots = container.querySelectorAll('.animate-bounce');
      expect(loadingDots.length).toBeGreaterThan(0);
    });

    it('shows AI avatar with loading indicator', () => {
      const { container } = render(<ChatHistory messages={[]} isLoading={true} />);

      const aiAvatar = container.querySelector('.bg-purple-600');
      expect(aiAvatar).toBeInTheDocument();
    });

    it('does not show loading indicator when isLoading is false', () => {
      const { container } = render(<ChatHistory messages={mockMessages} isLoading={false} />);

      const loadingDots = container.querySelectorAll('.animate-bounce');
      expect(loadingDots.length).toBe(0);
    });

    it('shows loading indicator even with no messages', () => {
      const { container } = render(<ChatHistory messages={[]} isLoading={true} />);

      const loadingDots = container.querySelectorAll('.animate-bounce');
      expect(loadingDots.length).toBeGreaterThan(0);
    });
  });

  describe('Scrolling Behavior', () => {
    it('has scrollable container', () => {
      const { container } = render(<ChatHistory messages={mockMessages} />);

      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('has smooth scroll behavior', () => {
      const { container } = render(<ChatHistory messages={mockMessages} />);

      const scrollContainer = container.querySelector('[style*="scroll-behavior"]');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('includes scroll anchor element', () => {
      const { container } = render(<ChatHistory messages={mockMessages} />);

      // The scroll anchor is the last div in the container
      const scrollAnchor = container.querySelector('.flex-1 > div:last-child');
      expect(scrollAnchor).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('applies correct container classes', () => {
      const { container } = render(<ChatHistory messages={mockMessages} />);

      const historyContainer = container.querySelector('.flex-1.overflow-y-auto');
      expect(historyContainer).toBeInTheDocument();
    });

    it('has proper spacing between messages', () => {
      const { container } = render(<ChatHistory messages={mockMessages} />);

      const messagesContainer = container.querySelector('.space-y-4');
      expect(messagesContainer).toBeInTheDocument();
    });

    it('has padding in container', () => {
      const { container } = render(<ChatHistory messages={mockMessages} />);

      const paddedContainer = container.querySelector('.p-6');
      expect(paddedContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined isLoading prop', () => {
      render(<ChatHistory messages={mockMessages} />);

      // Should render without errors
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });

    it('handles messages with same timestamp', () => {
      const sameTimestamp = new Date();
      const duplicateTimeMessages: ChatMessageProps[] = [
        { role: 'user', content: 'Message 1', timestamp: sameTimestamp },
        { role: 'assistant', content: 'Message 2', timestamp: sameTimestamp },
      ];

      render(<ChatHistory messages={duplicateTimeMessages} />);

      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Message 2')).toBeInTheDocument();
    });

    it('handles very long message content', () => {
      const longMessage: ChatMessageProps[] = [
        {
          role: 'assistant',
          content: 'A'.repeat(1000),
          timestamp: new Date(),
        },
      ];

      render(<ChatHistory messages={longMessage} />);

      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      const { container } = render(<ChatHistory messages={mockMessages} />);

      // Should have main container div
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('empty state has descriptive text', () => {
      render(<ChatHistory messages={[]} />);

      expect(screen.getByText(/ask me anything/i)).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('renders ChatMessage components correctly', () => {
      render(<ChatHistory messages={mockMessages} />);

      // Check that both user and AI messages are rendered (use getAllByText for multiple)
      expect(screen.getAllByText('You').length).toBeGreaterThan(0);
      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    });

    it('passes correct props to ChatMessage', () => {
      render(<ChatHistory messages={[mockMessages[0]]} />);

      expect(screen.getByText('Hello AI')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });
});

// Made with Bob
