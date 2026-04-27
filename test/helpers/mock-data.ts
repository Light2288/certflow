import type {
  CertificationConfig,
  TopicsData,
  QuestionsData,
  Question,
} from '@/lib/types/certification';

/**
 * Mock certification configuration
 */
export const mockCertificationConfig: CertificationConfig = {
  id: 'test-cert',
  name: 'Test Certification',
  code: 'TEST-001',
  version: '1.0',
  description: 'A test certification for testing purposes',
  provider: 'Test Provider',
  examDetails: {
    duration: 120,
    questionCount: 50,
    passingScore: 700,
    scoreRange: {
      min: 100,
      max: 1000,
    },
  },
  metadata: {
    lastUpdated: '2024-01-01',
    difficulty: 'intermediate',
    prerequisites: [],
    officialUrl: 'https://example.com',
  },
};

/**
 * Mock topics data
 */
export const mockTopicsData: TopicsData = {
  topics: [
    {
      id: 'topic-1',
      name: 'Topic One',
      description: 'First topic description',
      weight: 40,
      order: 1,
      subtopics: [
        {
          id: 'subtopic-1-1',
          name: 'Subtopic 1.1',
          description: 'First subtopic',
          keyPoints: ['Point 1', 'Point 2'],
        },
      ],
    },
    {
      id: 'topic-2',
      name: 'Topic Two',
      description: 'Second topic description',
      weight: 60,
      order: 2,
      subtopics: [
        {
          id: 'subtopic-2-1',
          name: 'Subtopic 2.1',
          description: 'Second subtopic',
          keyPoints: ['Point A', 'Point B'],
        },
      ],
    },
  ],
};

/**
 * Mock valid multiple-choice question
 */
export const mockMultipleChoiceQuestion: Question = {
  id: 'q001',
  topicId: 'topic-1',
  subtopicId: 'subtopic-1-1',
  type: 'multiple-choice',
  difficulty: 'medium',
  question: 'What is the correct answer?',
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
    { id: 'c', text: 'Option C' },
    { id: 'd', text: 'Option D' },
  ],
  correctAnswer: 'b',
  explanation: {
    correct: 'Option B is correct because...',
    whyOthersWrong: {
      a: 'Option A is wrong because...',
      c: 'Option C is wrong because...',
      d: 'Option D is wrong because...',
    },
  },
  references: ['https://example.com/ref'],
  tags: ['test', 'example'],
  metadata: {
    createdAt: '2024-01-01',
    lastReviewed: '2024-01-01',
    source: 'test',
  },
};

/**
 * Mock valid multi-select question
 */
export const mockMultiSelectQuestion: Question = {
  id: 'q002',
  topicId: 'topic-2',
  subtopicId: 'subtopic-2-1',
  type: 'multi-select',
  difficulty: 'hard',
  question: 'Which options are correct? (Select TWO)',
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
    { id: 'c', text: 'Option C' },
    { id: 'd', text: 'Option D' },
  ],
  correctAnswer: ['b', 'c'],
  explanation: {
    correct: 'Options B and C are correct because...',
    whyOthersWrong: {
      a: 'Option A is wrong because...',
      d: 'Option D is wrong because...',
    },
  },
  references: ['https://example.com/ref'],
  tags: ['test', 'multi-select'],
  metadata: {
    createdAt: '2024-01-01',
    lastReviewed: '2024-01-01',
    source: 'test',
  },
};

/**
 * Mock questions data
 */
export const mockQuestionsData: QuestionsData = {
  questions: [mockMultipleChoiceQuestion, mockMultiSelectQuestion],
};

/**
 * Invalid certification config (missing required fields)
 */
export const invalidCertificationConfig = {
  // Missing id, name, code
  version: '1.0',
  examDetails: {
    duration: -10, // Invalid: negative
    questionCount: 0, // Invalid: zero
  },
} as unknown as CertificationConfig;

/**
 * Invalid topics data (weights don't sum to 100)
 */
export const invalidTopicsData: TopicsData = {
  topics: [
    {
      id: 'topic-1',
      name: 'Topic One',
      description: 'Description',
      weight: 30,
      order: 1,
      subtopics: [],
    },
    {
      id: 'topic-2',
      name: 'Topic Two',
      description: 'Description',
      weight: 40, // Sum = 70, should be 100
      order: 2,
      subtopics: [],
    },
  ],
};

/**
 * Invalid question (missing required fields)
 */
export const invalidQuestion = {
  // Missing id, question, topicId
  type: 'multiple-choice',
  difficulty: 'easy',
  options: [{ id: 'a', text: 'Option A' }], // Only 1 option (need 2+)
  correctAnswer: 'b', // Doesn't exist in options
} as unknown as Question;

/**
 * Question with duplicate option IDs
 */
export const questionWithDuplicateOptions: Question = {
  ...mockMultipleChoiceQuestion,
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'a', text: 'Duplicate A' }, // Duplicate ID
    { id: 'b', text: 'Option B' },
  ],
};

/**
 * Multi-select question with invalid answer format
 */
export const multiSelectWithInvalidAnswer: Question = {
  ...mockMultiSelectQuestion,
  correctAnswer: 'a', // Should be array for multi-select
};