/**
 * CertFlow - Certification Loader
 * 
 * Functions to load and validate certification data from JSON files.
 * Supports dynamic certification loading.
 */

import type {
  CertificationConfig,
  CertificationData,
  QuestionsData,
  TopicsData,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Question,
  Topic,
} from '@/lib/types/certification';

// ============================================================================
// LOADER FUNCTIONS
// ============================================================================

/**
 * Load complete certification data (config, topics, questions)
 */
export async function loadCertification(
  certificationId: string
): Promise<CertificationData> {
  const [config, topics, questions] = await Promise.all([
    loadCertificationConfig(certificationId),
    loadCertificationTopics(certificationId),
    loadCertificationQuestions(certificationId),
  ]);

  return {
    config,
    topics,
    questions,
  };
}

/**
 * Get base URL for data fetching
 */
function getBaseUrl(): string {
  // In browser, use relative URL
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // In server, use localhost (for development)
  return 'http://localhost:3000';
}

/**
 * Load certification configuration
 */
export async function loadCertificationConfig(
  certificationId: string
): Promise<CertificationConfig> {
  const baseUrl = getBaseUrl();
  const response = await fetch(
    `${baseUrl}/data/certifications/${certificationId}/config.json`,
    { cache: 'no-store' }
  );
  
  if (!response.ok) {
    throw new Error(
      `Failed to load certification config: ${response.statusText}`
    );
  }

  const config: CertificationConfig = await response.json();
  
  // Validate config
  const validation = validateCertificationConfig(config);
  if (!validation.valid) {
    throw new Error(
      `Invalid certification config: ${validation.errors
        .map((e) => e.message)
        .join(', ')}`
    );
  }

  return config;
}

/**
 * Load certification topics
 */
export async function loadCertificationTopics(
  certificationId: string
): Promise<TopicsData> {
  const baseUrl = getBaseUrl();
  const response = await fetch(
    `${baseUrl}/data/certifications/${certificationId}/topics.json`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Failed to load topics: ${response.statusText}`);
  }

  const topics: TopicsData = await response.json();

  // Validate topics
  const validation = validateTopics(topics);
  if (!validation.valid) {
    throw new Error(
      `Invalid topics data: ${validation.errors.map((e) => e.message).join(', ')}`
    );
  }

  return topics;
}

/**
 * Load certification questions
 */
export async function loadCertificationQuestions(
  certificationId: string
): Promise<QuestionsData> {
  const baseUrl = getBaseUrl();
  const response = await fetch(
    `${baseUrl}/data/certifications/${certificationId}/questions.json`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Failed to load questions: ${response.statusText}`);
  }

  const questions: QuestionsData = await response.json();

  // Validate questions
  const validation = validateQuestions(questions);
  if (!validation.valid) {
    throw new Error(
      `Invalid questions  ${validation.errors
        .map((e) => e.message)
        .join(', ')}`
    );
  }

  return questions;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate certification configuration
 */
export function validateCertificationConfig(
  config: CertificationConfig
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!config.id) {
    errors.push({ field: 'id', message: 'Certification ID is required' });
  }
  if (!config.name) {
    errors.push({ field: 'name', message: 'Certification name is required' });
  }
  if (!config.code) {
    errors.push({ field: 'code', message: 'Certification code is required' });
  }

  // Exam details validation
  if (!config.examDetails) {
    errors.push({ field: 'examDetails', message: 'Exam details are required' });
  } else {
    if (
      config.examDetails.duration <= 0
    ) {
      errors.push({
        field: 'examDetails.duration',
        message: 'Duration must be a positive number',
        value: config.examDetails.duration,
      });
    }
    if (
        config.examDetails.questionCount <= 0
    ) {
      errors.push({
        field: 'examDetails.questionCount',
        message: 'Question count must be a positive number',
        value: config.examDetails.questionCount,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate topics data
 */
export function validateTopics(topicsData: TopicsData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!topicsData.topics || !Array.isArray(topicsData.topics)) {
    errors.push({
      field: 'topics',
      message: 'Topics must be an array',
    });
    return { valid: false, errors, warnings };
  }

  if (topicsData.topics.length === 0) {
    warnings.push({
      field: 'topics',
      message: 'No topics defined',
    });
  }

  // Validate each topic
  topicsData.topics.forEach((topic, index) => {
    const prefix = `topics[${index}]`;

    if (!topic.id) {
      errors.push({ field: `${prefix}.id`, message: 'Topic ID is required' });
    }
    if (!topic.name) {
      errors.push({ field: `${prefix}.name`, message: 'Topic name is required' });
    }
    if (topic.weight < 0) {
      errors.push({
        field: `${prefix}.weight`,
        message: 'Topic weight must be a non-negative number',
        value: topic.weight,
      });
    }

    // Validate subtopics
    if (!topic.subtopics || !Array.isArray(topic.subtopics)) {
      errors.push({
        field: `${prefix}.subtopics`,
        message: 'Subtopics must be an array',
      });
    } else if (topic.subtopics.length === 0) {
      warnings.push({
        field: `${prefix}.subtopics`,
        message: `Topic "${topic.name}" has no subtopics`,
      });
    }
  });

  // Validate total weight
  const totalWeight = topicsData.topics.reduce(
    (sum, topic) => sum + (topic.weight || 0),
    0
  );
  if (Math.abs(totalWeight - 100) > 0.01) {
    warnings.push({
      field: 'topics',
      message: `Total topic weights should sum to 100, got ${totalWeight}`,
      value: totalWeight,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate questions data
 */
export function validateQuestions(
  questionsData: QuestionsData
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
    errors.push({
      field: 'questions',
      message: 'Questions must be an array',
    });
    return { valid: false, errors, warnings };
  }

  if (questionsData.questions.length === 0) {
    warnings.push({
      field: 'questions',
      message: 'No questions defined',
    });
  }

  // Validate each question
  questionsData.questions.forEach((question, index) => {
    const questionErrors = validateQuestion(question, index);
    errors.push(...questionErrors.errors);
    warnings.push(...questionErrors.warnings);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single question
 */
export function validateQuestion(
  question: Question,
  index?: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const prefix = index !== undefined ? `questions[${index}]` : 'question';

  // Required fields
  if (!question.id) {
    errors.push({ field: `${prefix}.id`, message: 'Question ID is required' });
  }
  if (!question.question) {
    errors.push({
      field: `${prefix}.question`,
      message: 'Question text is required',
    });
  }
  if (!question.topicId) {
    errors.push({
      field: `${prefix}.topicId`,
      message: 'Topic ID is required',
    });
  }
  if (!question.subtopicId) {
    errors.push({
      field: `${prefix}.subtopicId`,
      message: 'Subtopic ID is required',
    });
  }

  // Type validation
  if (
    question.type !== 'multiple-choice' &&
    question.type !== 'multi-select'
  ) {
    errors.push({
      field: `${prefix}.type`,
      message: 'Type must be "multiple-choice" or "multi-select"',
      value: question.type,
    });
  }

  // Difficulty validation
  if (!['easy', 'medium', 'hard'].includes(question.difficulty)) {
    errors.push({
      field: `${prefix}.difficulty`,
      message: 'Difficulty must be "easy", "medium", or "hard"',
      value: question.difficulty,
    });
  }

  // Options validation
  if (!question.options || !Array.isArray(question.options)) {
    errors.push({
      field: `${prefix}.options`,
      message: 'Options must be an array',
    });
  } else {
    if (question.options.length < 2) {
      errors.push({
        field: `${prefix}.options`,
        message: 'At least 2 options are required',
        value: question.options.length,
      });
    }

    // Check for duplicate option IDs
    const optionIds = question.options.map((opt) => opt.id);
    const uniqueIds = new Set(optionIds);
    if (optionIds.length !== uniqueIds.size) {
      errors.push({
        field: `${prefix}.options`,
        message: 'Duplicate option IDs found',
      });
    }
  }

  // Correct answer validation
  if (!question.correctAnswer) {
    errors.push({
      field: `${prefix}.correctAnswer`,
      message: 'Correct answer is required',
    });
  } else {
    const optionIds = question.options?.map((opt) => opt.id) || [];

    if (question.type === 'multiple-choice') {
      // Single answer - must be a string
      if (typeof question.correctAnswer !== 'string') {
        errors.push({
          field: `${prefix}.correctAnswer`,
          message: 'Multiple-choice answer must be a single string',
          value: question.correctAnswer,
        });
      } else if (!optionIds.includes(question.correctAnswer)) {
        errors.push({
          field: `${prefix}.correctAnswer`,
          message: 'Correct answer not found in options',
          value: question.correctAnswer,
        });
      }
    } else if (question.type === 'multi-select') {
      // Multiple answers - must be an array
      if (!Array.isArray(question.correctAnswer)) {
        errors.push({
          field: `${prefix}.correctAnswer`,
          message: 'Multi-select answer must be an array',
          value: question.correctAnswer,
        });
      } else {
        if (question.correctAnswer.length === 0) {
          errors.push({
            field: `${prefix}.correctAnswer`,
            message: 'At least one correct answer required for multi-select',
          });
        }

        // Check if all correct answers exist in options
        const invalidAnswers = question.correctAnswer.filter(
          (answer) => !optionIds.includes(answer)
        );
        if (invalidAnswers.length > 0) {
          errors.push({
            field: `${prefix}.correctAnswer`,
            message: 'Some correct answers not found in options',
            value: invalidAnswers,
          });
        }
      }
    }
  }

  // Explanation validation
  if (!question.explanation) {
    errors.push({
      field: `${prefix}.explanation`,
      message: 'Explanation is required',
    });
  } else {
    if (!question.explanation.correct) {
      errors.push({
        field: `${prefix}.explanation.correct`,
        message: 'Correct answer explanation is required',
      });
    }
    if (!question.explanation.whyOthersWrong) {
      warnings.push({
        field: `${prefix}.explanation.whyOthersWrong`,
        message: 'Explanations for wrong answers are recommended',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate that a topic/subtopic reference exists
 */
export function validateTopicReference(
  topicId: string,
  subtopicId: string,
  topics: TopicsData
): boolean {
  const topic = topics.topics.find((t) => t.id === topicId);
  if (!topic) return false;

  const subtopic = topic.subtopics.find((s) => s.id === subtopicId);
  return !!subtopic;
}

/**
 * Get questions by topic
 */
export function getQuestionsByTopic(
  topicId: string,
  questions: QuestionsData
): Question[] {
  return questions.questions.filter((q) => q.topicId === topicId);
}

/**
 * Get questions by difficulty
 */
export function getQuestionsByDifficulty(
  difficulty: string,
  questions: QuestionsData
): Question[] {
  return questions.questions.filter((q) => q.difficulty === difficulty);
}

/**
 * Get random questions
 */
export function getRandomQuestions(
  questions: Question[],
  count: number
): Question[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get topic by ID
 */
export function getTopicById(id: string, topics: TopicsData): Topic | undefined {
  return topics.topics.find((t) => t.id === id);
}

/**
 * Get subtopic by ID
 */
export function getSubtopicById(
  topicId: string,
  subtopicId: string,
  topics: TopicsData
) {
  const topic = getTopicById(topicId, topics);
  return topic?.subtopics.find((s) => s.id === subtopicId);
}
