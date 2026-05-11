import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatMessage from '../ChatMessage';

describe('ChatMessage', () => {
  const mockTimestamp = new Date('2024-01-01T12:00:00Z');

  describe('User Messages', () => {
    it('renders user message correctly', () => {
      render(
        <ChatMessage
          role="user"
          content="Hello, AI!"
          timestamp={mockTimestamp}
        />
      );

      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('applies correct styling for user messages', () => {
      const { container } = render(
        <ChatMessage
          role="user"
          content="Test message"
          timestamp={mockTimestamp}
        />
      );

      // User messages should be right-aligned
      const messageContainer = container.querySelector('.justify-end');
      expect(messageContainer).toBeInTheDocument();

      // User messages should have blue background
      const messageContent = container.querySelector('.bg-blue-600');
      expect(messageContent).toBeInTheDocument();
    });

    it('displays user avatar icon', () => {
      const { container } = render(
        <ChatMessage
          role="user"
          content="Test"
          timestamp={mockTimestamp}
        />
      );

      // Check for user icon (person icon)
      const avatar = container.querySelector('.bg-blue-600.text-white');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('AI Messages', () => {
    it('renders AI message correctly', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Hello, human!"
          timestamp={mockTimestamp}
        />
      );

      expect(screen.getByText('Hello, human!')).toBeInTheDocument();
      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    });

    it('applies correct styling for AI messages', () => {
      const { container } = render(
        <ChatMessage
          role="assistant"
          content="Test message"
          timestamp={mockTimestamp}
        />
      );

      // AI messages should be left-aligned
      const messageContainer = container.querySelector('.justify-start');
      expect(messageContainer).toBeInTheDocument();

      // AI messages should have gray background
      const messageContent = container.querySelector('.bg-gray-100');
      expect(messageContent).toBeInTheDocument();
    });

    it('displays AI avatar icon', () => {
      const { container } = render(
        <ChatMessage
          role="assistant"
          content="Test"
          timestamp={mockTimestamp}
        />
      );

      // Check for AI icon (chat bubbles icon)
      const avatar = container.querySelector('.bg-purple-600.text-white');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Timestamp', () => {
    it('displays relative timestamp', () => {
      const recentTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      
      render(
        <ChatMessage
          role="user"
          content="Recent message"
          timestamp={recentTime}
        />
      );

      // Should show "2 minutes ago" or similar
      expect(screen.getByText(/ago/i)).toBeInTheDocument();
    });

    it('formats timestamp correctly for user messages', () => {
      const { container } = render(
        <ChatMessage
          role="user"
          content="Test"
          timestamp={mockTimestamp}
        />
      );

      // User timestamp should be right-aligned
      const timestamp = container.querySelector('.text-right');
      expect(timestamp).toBeInTheDocument();
    });

    it('formats timestamp correctly for AI messages', () => {
      const { container } = render(
        <ChatMessage
          role="assistant"
          content="Test"
          timestamp={mockTimestamp}
        />
      );

      // AI timestamp should be left-aligned
      const timestamp = container.querySelector('.text-left');
      expect(timestamp).toBeInTheDocument();
    });
  });

  describe('Content Handling', () => {
    it('handles multi-line content', () => {
      const multiLineContent = 'Line 1\nLine 2\nLine 3';
      
      const { container } = render(
        <ChatMessage
          role="user"
          content={multiLineContent}
          timestamp={mockTimestamp}
        />
      );

      // Check that content is rendered (may be split across elements due to whitespace-pre-wrap)
      expect(container.textContent).toContain('Line 1');
      expect(container.textContent).toContain('Line 2');
      expect(container.textContent).toContain('Line 3');
    });

    it('handles long content with word wrapping', () => {
      const longContent = 'This is a very long message that should wrap properly when displayed in the chat interface without breaking the layout or causing horizontal scrolling issues.';
      
      const { container } = render(
        <ChatMessage
          role="user"
          content={longContent}
          timestamp={mockTimestamp}
        />
      );

      // Check for break-words class
      const contentElement = container.querySelector('.break-words');
      expect(contentElement).toBeInTheDocument();
    });

    it('handles empty content gracefully', () => {
      render(
        <ChatMessage
          role="user"
          content=""
          timestamp={mockTimestamp}
        />
      );

      // Should still render the message structure
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('preserves whitespace in content', () => {
      const { container } = render(
        <ChatMessage
          role="user"
          content="Text with    spaces"
          timestamp={mockTimestamp}
        />
      );

      // Check for whitespace-pre-wrap class
      const contentElement = container.querySelector('.whitespace-pre-wrap');
      expect(contentElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      const { container } = render(
        <ChatMessage
          role="user"
          content="Test message"
          timestamp={mockTimestamp}
        />
      );

      // Should have proper div structure
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('displays role label for screen readers', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Test"
          timestamp={mockTimestamp}
        />
      );

      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    });
  });
});

// Made with Bob
