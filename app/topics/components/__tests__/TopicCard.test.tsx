import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TopicCard from '../TopicCard';
import type { Topic } from '@/lib/types/certification';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('TopicCard', () => {
  const mockTopic: Topic = {
    id: 'data-engineering',
    name: 'Data Engineering',
    description: 'Design and implement data pipelines and storage solutions',
    weight: 20,
    order: 1,
    subtopics: [
      {
        id: 'data-repositories',
        name: 'Data Repositories',
        description: 'S3, databases, data lakes',
        keyPoints: ['S3', 'RDS', 'DynamoDB'],
      },
      {
        id: 'data-ingestion',
        name: 'Data Ingestion',
        description: 'Kinesis, Glue, batch/streaming',
        keyPoints: ['Kinesis', 'Glue', 'Data Pipeline'],
      },
      {
        id: 'data-transformation',
        name: 'Data Transformation',
        description: 'ETL processes and tools',
        keyPoints: ['ETL', 'Glue', 'EMR'],
      },
    ],
  };

  describe('Rendering', () => {
    it('should render topic name', () => {
      render(<TopicCard topic={mockTopic} />);
      expect(screen.getByText('Data Engineering')).toBeInTheDocument();
    });

    it('should render topic description', () => {
      render(<TopicCard topic={mockTopic} />);
      expect(
        screen.getByText('Design and implement data pipelines and storage solutions')
      ).toBeInTheDocument();
    });

    it('should render weight percentage', () => {
      render(<TopicCard topic={mockTopic} />);
      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('should render subtopic count', () => {
      render(<TopicCard topic={mockTopic} />);
      expect(screen.getByText('3 subtopics')).toBeInTheDocument();
    });

    it('should render singular "subtopic" for single subtopic', () => {
      const singleSubtopicTopic: Topic = {
        ...mockTopic,
        subtopics: [mockTopic.subtopics[0]],
      };
      render(<TopicCard topic={singleSubtopicTopic} />);
      expect(screen.getByText('1 subtopic')).toBeInTheDocument();
    });

    it('should render "0 subtopics" when subtopics array is empty', () => {
      const noSubtopicsTopic: Topic = {
        ...mockTopic,
        subtopics: [],
      };
      render(<TopicCard topic={noSubtopicsTopic} />);
      expect(screen.getByText('0 subtopics')).toBeInTheDocument();
    });
  });

  describe('Question Count', () => {
    it('should render the question count when provided', () => {
      render(<TopicCard topic={mockTopic} questionCount={12} />);
      expect(screen.getByText('12 questions')).toBeInTheDocument();
    });

    it('should render singular "question" for a single question', () => {
      render(<TopicCard topic={mockTopic} questionCount={1} />);
      expect(screen.getByText('1 question')).toBeInTheDocument();
    });

    it('should render "0 questions" when the count is zero', () => {
      render(<TopicCard topic={mockTopic} questionCount={0} />);
      expect(screen.getByText('0 questions')).toBeInTheDocument();
    });

    it('should not render a question count when the prop is omitted', () => {
      render(<TopicCard topic={mockTopic} />);
      expect(screen.queryByText(/questions?$/)).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render as a link to topic detail page', () => {
      render(<TopicCard topic={mockTopic} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/topics/data-engineering');
    });

    it('should use topic id in the link href', () => {
      const customTopic: Topic = {
        ...mockTopic,
        id: 'custom-topic-id',
      };
      render(<TopicCard topic={customTopic} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/topics/custom-topic-id');
    });
  });

  describe('Styling and Layout', () => {
    it('should render as a styled card link', () => {
      const { container } = render(<TopicCard topic={mockTopic} />);
      const card = container.querySelector('a');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('href', '/topics/data-engineering');
    });

    it('should contain inner padding div', () => {
      const { container } = render(<TopicCard topic={mockTopic} />);
      const paddingDiv = container.querySelector('a > div');
      expect(paddingDiv).toBeInTheDocument();
    });

    it('should have proper DOM structure', () => {
      const { container } = render(<TopicCard topic={mockTopic} />);
      const link = container.querySelector('a');
      const innerDiv = link?.querySelector('div');
      const heading = innerDiv?.querySelector('h3');
      
      expect(link).toBeInTheDocument();
      expect(innerDiv).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Weight Badge', () => {
    it('should render weight badge as a span element', () => {
      render(<TopicCard topic={mockTopic} />);
      const badge = screen.getByText('20%');
      expect(badge).toBeInTheDocument();
      expect(badge.tagName).toBe('SPAN');
    });

    it('should display different weight values correctly', () => {
      const highWeightTopic: Topic = {
        ...mockTopic,
        weight: 45,
      };
      render(<TopicCard topic={highWeightTopic} />);
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should handle zero weight', () => {
      const zeroWeightTopic: Topic = {
        ...mockTopic,
        weight: 0,
      };
      render(<TopicCard topic={zeroWeightTopic} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Topic Name Styling', () => {
    it('should render topic name with proper heading styles', () => {
      render(<TopicCard topic={mockTopic} />);
      const heading = screen.getByText('Data Engineering');
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveClass('text-xl');
      expect(heading).toHaveClass('font-semibold');
      expect(heading).toHaveClass('text-gray-900');
    });
  });

  describe('Description Styling', () => {
    it('should render description with proper text styles', () => {
      render(<TopicCard topic={mockTopic} />);
      const description = screen.getByText(
        'Design and implement data pipelines and storage solutions'
      );
      expect(description).toHaveClass('text-gray-600');
      expect(description).toHaveClass('mb-4');
    });
  });

  describe('Subtopic Count Styling', () => {
    it('should render subtopic count container with proper styles', () => {
      render(<TopicCard topic={mockTopic} />);
      const subtopicText = screen.getByText('3 subtopics');
      const container = subtopicText.closest('div');
      expect(container).toHaveClass('text-sm');
      expect(container).toHaveClass('text-gray-500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long topic names', () => {
      const longNameTopic: Topic = {
        ...mockTopic,
        name: 'This is a very long topic name that should still render correctly without breaking the layout',
      };
      render(<TopicCard topic={longNameTopic} />);
      expect(
        screen.getByText(
          'This is a very long topic name that should still render correctly without breaking the layout'
        )
      ).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDescTopic: Topic = {
        ...mockTopic,
        description:
          'This is a very long description that contains a lot of text and should still render correctly without breaking the card layout or causing any visual issues in the user interface',
      };
      render(<TopicCard topic={longDescTopic} />);
      expect(
        screen.getByText(
          'This is a very long description that contains a lot of text and should still render correctly without breaking the card layout or causing any visual issues in the user interface'
        )
      ).toBeInTheDocument();
    });

    it('should handle topic with many subtopics', () => {
      const manySubtopicsTopic: Topic = {
        ...mockTopic,
        subtopics: Array.from({ length: 15 }, (_, i) => ({
          id: `subtopic-${i}`,
          name: `Subtopic ${i + 1}`,
          description: `Description ${i + 1}`,
          keyPoints: [`Point ${i + 1}`],
        })),
      };
      render(<TopicCard topic={manySubtopicsTopic} />);
      expect(screen.getByText('15 subtopics')).toBeInTheDocument();
    });

    it('should handle special characters in topic name', () => {
      const specialCharTopic: Topic = {
        ...mockTopic,
        name: 'Data & Analytics: ML/AI (Advanced)',
      };
      render(<TopicCard topic={specialCharTopic} />);
      expect(screen.getByText('Data & Analytics: ML/AI (Advanced)')).toBeInTheDocument();
    });

    it('should handle special characters in description', () => {
      const specialCharTopic: Topic = {
        ...mockTopic,
        description: 'Learn about S3, EC2 & Lambda - including "serverless" architectures',
      };
      render(<TopicCard topic={specialCharTopic} />);
      expect(
        screen.getByText('Learn about S3, EC2 & Lambda - including "serverless" architectures')
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible as a link', () => {
      render(<TopicCard topic={mockTopic} />);
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      render(<TopicCard topic={mockTopic} />);
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should have proper link text for screen readers', () => {
      render(<TopicCard topic={mockTopic} />);
      const link = screen.getByRole('link');
      expect(link).toHaveTextContent('Data Engineering');
    });
  });

  describe('Component Structure', () => {
    it('should render all main sections', () => {
      render(<TopicCard topic={mockTopic} />);
      
      // Check for header section with name and weight
      expect(screen.getByText('Data Engineering')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
      
      // Check for description
      expect(
        screen.getByText('Design and implement data pipelines and storage solutions')
      ).toBeInTheDocument();
      
      // Check for footer with subtopic count
      expect(screen.getByText('3 subtopics')).toBeInTheDocument();
    });

    it('should maintain proper hierarchy', () => {
      const { container } = render(<TopicCard topic={mockTopic} />);
      const link = container.querySelector('a');
      const heading = screen.getByRole('heading', { level: 3 });
      
      expect(link).toContainElement(heading);
    });
  });

  describe('Multiple Instances', () => {
    it('should render multiple cards independently', () => {
      const topic1: Topic = {
        ...mockTopic,
        id: 'topic-1',
        name: 'Topic 1',
        weight: 20,
      };
      const topic2: Topic = {
        ...mockTopic,
        id: 'topic-2',
        name: 'Topic 2',
        weight: 30,
      };

      const { rerender } = render(<TopicCard topic={topic1} />);
      expect(screen.getByText('Topic 1')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();

      rerender(<TopicCard topic={topic2} />);
      expect(screen.getByText('Topic 2')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });
  });
});

// Made with Bob
