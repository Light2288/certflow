import { describe, it, expect } from 'vitest';
import {
  validateCertificationConfig,
  validateTopics,
  validateQuestions,
  validateQuestion,
  validateTopicReference,
  getQuestionsByTopic,
  getQuestionsByDifficulty,
  getRandomQuestions,
  getTopicById,
  getSubtopicById,
} from '../certification-loader';
import {
  mockCertificationConfig,
  mockTopicsData,
  mockQuestionsData,
  mockMultipleChoiceQuestion,
  mockMultiSelectQuestion,
  invalidTopicsData,
  invalidQuestion,
  questionWithDuplicateOptions,
  multiSelectWithInvalidAnswer,
} from '@/test/helpers/mock-data';

describe('validateCertificationConfig', () => {
  it('should validate a correct certification config', () => {
    const result = validateCertificationConfig(mockCertificationConfig);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject config without id', () => {
    const config = { ...mockCertificationConfig, id: '' };
    const result = validateCertificationConfig(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'id',
        message: 'Certification ID is required',
      })
    );
  });

  it('should reject config without name', () => {
    const config = { ...mockCertificationConfig, name: '' };
    const result = validateCertificationConfig(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'name',
        message: 'Certification name is required',
      })
    );
  });

  it('should reject config without code', () => {
    const config = { ...mockCertificationConfig, code: '' };
    const result = validateCertificationConfig(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'code',
        message: 'Certification code is required',
      })
    );
  });

  it('should reject config with invalid duration', () => {
    const config = {
      ...mockCertificationConfig,
      examDetails: { ...mockCertificationConfig.examDetails, duration: -10 },
    };
    const result = validateCertificationConfig(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'examDetails.duration',
        message: 'Duration must be a positive number',
      })
    );
  });

  it('should reject config with invalid question count', () => {
    const config = {
      ...mockCertificationConfig,
      examDetails: { ...mockCertificationConfig.examDetails, questionCount: 0 },
    };
    const result = validateCertificationConfig(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'examDetails.questionCount',
        message: 'Question count must be a positive number',
      })
    );
  });

  it('should handle missing examDetails', () => {
    const config = {
      ...mockCertificationConfig,
      examDetails: undefined as any,
    };
    const result = validateCertificationConfig(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'examDetails',
        message: 'Exam details are required',
      })
    );
  });
});

describe('validateTopics', () => {
  it('should validate correct topics data', () => {
    const result = validateTopics(mockTopicsData);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn when topic weights do not sum to 100', () => {
    const result = validateTopics(invalidTopicsData);
    
    expect(result.valid).toBe(true); // Warnings don't make it invalid
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        field: 'topics',
        message: expect.stringContaining('should sum to 100'),
      })
    );
  });

  it('should reject topics that is not an array', () => {
    const data = { topics: 'not-an-array' } as any;
    const result = validateTopics(data);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'topics',
        message: 'Topics must be an array',
      })
    );
  });

  it('should reject topic without id', () => {
    const data = {
      topics: [{ ...mockTopicsData.topics[0], id: '' }],
    };
    const result = validateTopics(data);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'topics[0].id',
        message: 'Topic ID is required',
      })
    );
  });

  it('should reject topic without name', () => {
    const data = {
      topics: [{ ...mockTopicsData.topics[0], name: '' }],
    };
    const result = validateTopics(data);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'topics[0].name',
        message: 'Topic name is required',
      })
    );
  });

  it('should reject topic with negative weight', () => {
    const data = {
      topics: [{ ...mockTopicsData.topics[0], weight: -10 }],
    };
    const result = validateTopics(data);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'topics[0].weight',
        message: 'Topic weight must be a non-negative number',
      })
    );
  });

  it('should warn when topic has no subtopics', () => {
    const data = {
      topics: [{
        ...mockTopicsData.topics[0],
        subtopics: [],
      }],
    };
    const result = validateTopics(data);
    
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateQuestion', () => {
  it('should validate correct multiple-choice question', () => {
    const result = validateQuestion(mockMultipleChoiceQuestion);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate correct multi-select question', () => {
    const result = validateQuestion(mockMultiSelectQuestion);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject question without id', () => {
    const question = { ...mockMultipleChoiceQuestion, id: '' };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Question ID is required',
      })
    );
  });

  it('should reject question without question text', () => {
    const question = { ...mockMultipleChoiceQuestion, question: '' };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Question text is required',
      })
    );
  });

  it('should reject question without topicId', () => {
    const question = { ...mockMultipleChoiceQuestion, topicId: '' };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Topic ID is required',
      })
    );
  });

  it('should reject question with invalid type', () => {
    const question = { ...mockMultipleChoiceQuestion, type: 'invalid' as any };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('must be "multiple-choice" or "multi-select"'),
      })
    );
  });

  it('should reject question with invalid difficulty', () => {
    const question = { ...mockMultipleChoiceQuestion, difficulty: 'extreme' as any };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('must be "easy", "medium", or "hard"'),
      })
    );
  });

  it('should reject question with less than 2 options', () => {
    const question = {
      ...mockMultipleChoiceQuestion,
      options: [{ id: 'a', text: 'Only one' }],
    };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'At least 2 options are required',
      })
    );
  });

  it('should reject question with duplicate option IDs', () => {
    const result = validateQuestion(questionWithDuplicateOptions);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Duplicate option IDs found',
      })
    );
  });

  it('should reject multiple-choice with array answer', () => {
    const question = {
      ...mockMultipleChoiceQuestion,
      correctAnswer: ['a', 'b'],
    };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Multiple-choice answer must be a single string',
      })
    );
  });

  it('should reject multi-select with string answer', () => {
    const result = validateQuestion(multiSelectWithInvalidAnswer);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Multi-select answer must be an array',
      })
    );
  });

  it('should reject when correct answer not in options', () => {
    const question = {
      ...mockMultipleChoiceQuestion,
      correctAnswer: 'z', // Not in options
    };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Correct answer not found in options',
      })
    );
  });

  it('should reject multi-select with empty correct answers', () => {
    const question = {
      ...mockMultiSelectQuestion,
      correctAnswer: [],
    };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'At least one correct answer required for multi-select',
      })
    );
  });

  it('should reject when some multi-select answers not in options', () => {
    const question = {
      ...mockMultiSelectQuestion,
      correctAnswer: ['b', 'z'], // 'z' not in options
    };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Some correct answers not found in options',
      })
    );
  });

  it('should reject question without explanation', () => {
    const question = {
      ...mockMultipleChoiceQuestion,
      explanation: undefined as any,
    };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Explanation is required',
      })
    );
  });

  it('should warn when whyOthersWrong is missing', () => {
    const question = {
      ...mockMultipleChoiceQuestion,
      explanation: {
        correct: 'This is correct',
        whyOthersWrong: undefined as any,
      },
    };
    const result = validateQuestion(question);
    
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('wrong answers are recommended'),
      })
    );
  });
});

describe('validateQuestions', () => {
  it('should validate correct questions data', () => {
    const result = validateQuestions(mockQuestionsData);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject when questions is not an array', () => {
    const data = { questions: 'not-an-array' } as any;
    const result = validateQuestions(data);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'Questions must be an array',
      })
    );
  });

  it('should aggregate errors from multiple invalid questions', () => {
    const data = {
      questions: [invalidQuestion, invalidQuestion],
    };
    const result = validateQuestions(data);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Helper Functions', () => {
  describe('validateTopicReference', () => {
    it('should return true for valid topic reference', () => {
      const result = validateTopicReference(
        'topic-1',
        'subtopic-1-1',
        mockTopicsData
      );
      
      expect(result).toBe(true);
    });

    it('should return false for invalid topicId', () => {
      const result = validateTopicReference(
        'invalid-topic',
        'subtopic-1-1',
        mockTopicsData
      );
      
      expect(result).toBe(false);
    });

    it('should return false for invalid subtopicId', () => {
      const result = validateTopicReference(
        'topic-1',
        'invalid-subtopic',
        mockTopicsData
      );
      
      expect(result).toBe(false);
    });
  });

  describe('getQuestionsByTopic', () => {
    it('should return questions for a specific topic', () => {
      const result = getQuestionsByTopic('topic-1', mockQuestionsData);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q001');
    });

    it('should return empty array for topic with no questions', () => {
      const result = getQuestionsByTopic('non-existent', mockQuestionsData);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getQuestionsByDifficulty', () => {
    it('should return questions of specified difficulty', () => {
      const result = getQuestionsByDifficulty('medium', mockQuestionsData);
      
      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe('medium');
    });

    it('should return empty array for difficulty with no questions', () => {
      const result = getQuestionsByDifficulty('easy', mockQuestionsData);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getRandomQuestions', () => {
    it('should return requested number of questions', () => {
      const questions = Array(10).fill(mockMultipleChoiceQuestion).map((q, i) => ({
        ...q,
        id: `q${i}`,
      }));
      
      const result = getRandomQuestions(questions, 5);
      
      expect(result).toHaveLength(5);
    });

    it('should return all questions if count exceeds available', () => {
      const result = getRandomQuestions(mockQuestionsData.questions, 10);
      
      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      const result = getRandomQuestions([], 5);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getTopicById', () => {
    it('should return topic for valid id', () => {
      const result = getTopicById('topic-1', mockTopicsData);
      
      expect(result).toBeDefined();
      expect(result?.name).toBe('Topic One');
    });

    it('should return undefined for invalid id', () => {
      const result = getTopicById('invalid', mockTopicsData);
      
      expect(result).toBeUndefined();
    });
  });

  describe('getSubtopicById', () => {
    it('should return subtopic for valid ids', () => {
      const result = getSubtopicById('topic-1', 'subtopic-1-1', mockTopicsData);
      
      expect(result).toBeDefined();
      expect(result?.name).toBe('Subtopic 1.1');
    });

    it('should return undefined for invalid topic id', () => {
      const result = getSubtopicById('invalid', 'subtopic-1-1', mockTopicsData);
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid subtopic id', () => {
      const result = getSubtopicById('topic-1', 'invalid', mockTopicsData);
      
      expect(result).toBeUndefined();
    });
  });
});
