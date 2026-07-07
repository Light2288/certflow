/**
 * Mock AI Provider
 * 
 * A mock implementation of the AIProvider interface for testing and demo purposes.
 * Provides pre-defined responses based on keyword matching.
 * No API key or external service required.
 */

import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, AIConfig } from '../types';

/**
 * Mock AI Provider for testing and demo mode
 * 
 * This provider generates responses based on keyword matching
 * without requiring any external API or service.
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  /**
   * Generate a mock AI response based on the user's message
   * 
   * @param message - The user's message
   * @param history - Conversation history (not used in mock)
   * @param options - Chat options (not used in mock)
   * @returns Promise resolving to a mock response
   */
  async chat(
    message: string,
    _history?: ChatMessage[],
    _options?: ChatOptions
  ): Promise<ChatResponse> {
    // Simulate network delay (1-2 seconds)
    const delay = 1000 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const content = this.generateResponse(message);
    
    return {
      content,
      usage: {
        promptTokens: message.length,
        completionTokens: content.length,
        totalTokens: message.length + content.length,
      },
      model: 'mock-model',
      finishReason: 'stop',
    };
  }

  /**
   * Validate mock provider configuration
   * Mock provider always has valid configuration (no API key needed)
   */
  async validateConfig(config: AIConfig): Promise<boolean> {
    return config.provider === 'mock';
  }

  /**
   * Test connection to mock provider
   * Always returns true since no external service is needed
   */
  async testConnection(): Promise<boolean> {
    return true;
  }

  /**
   * Generate a response based on keyword matching
   * 
   * @param userMessage - The user's message
   * @returns Generated response text
   */
  private generateResponse(userMessage: string): string {
    const lower = userMessage.toLowerCase();
    
    // Topic-specific responses
    if (lower.includes('data engineering')) {
      return "Data Engineering is a crucial domain in the AWS ML certification, covering:\n\n• **Data Repositories**: Understanding S3, data lakes, and feature stores\n• **Data Ingestion**: Implementing batch and streaming pipelines with Kinesis and Glue\n• **Data Transformation**: Using Glue DataBrew and EMR for large-scale processing\n\nThis topic represents 20% of the exam. Would you like me to explain any specific subtopic in detail?";
    }
    
    if (lower.includes('feature engineering') || lower.includes('exploratory')) {
      return "Feature Engineering is essential for building effective ML models. Key concepts include:\n\n• **Data Preparation**: Handling missing values, outliers, and normalization\n• **Feature Creation**: Extracting meaningful features from raw data\n• **Feature Selection**: Choosing the most relevant features\n• **Dimensionality Reduction**: Using PCA and t-SNE\n\nThis topic accounts for 24% of the exam weight. What specific aspect would you like to explore?";
    }
    
    if (lower.includes('model') || lower.includes('modeling')) {
      return "Modeling is the largest topic (36% of exam weight) and covers:\n\n• **Model Selection**: Choosing between supervised/unsupervised learning, classification/regression\n• **Training**: Using SageMaker training jobs, distributed training, and spot instances\n• **Hyperparameter Tuning**: Optimizing model performance with SageMaker Automatic Model Tuning\n\nWould you like to dive deeper into any of these areas?";
    }
    
    if (lower.includes('help') || lower.includes('how') || lower.includes('start')) {
      return "I'm here to help you prepare for your AWS ML certification! Here's how I can assist:\n\n✓ **Explain Topics**: Ask about any certification topic\n✓ **Study Tips**: Get guidance on exam preparation\n✓ **Clarify Concepts**: Request detailed explanations\n✓ **Practice**: I can help you understand question patterns\n\nTry asking about specific topics like Data Engineering, Feature Engineering, or Modeling!";
    }
    
    if (lower.includes('tip') || lower.includes('study') || lower.includes('prepare')) {
      return "Here are some effective study strategies for the AWS ML certification:\n\n1. **Focus on High-Weight Topics**: Prioritize Modeling (36%), Feature Engineering (24%), and Data Engineering (20%)\n2. **Hands-on Practice**: Use AWS Free Tier to practice with SageMaker\n3. **Understand Services**: Know when to use Kinesis vs Glue, S3 vs RDS\n4. **Practice Questions**: Use the simulator to test your knowledge\n5. **Review Weak Areas**: Track your performance per topic\n\nWould you like specific tips for any particular topic?";
    }
    
    if (lower.includes('sagemaker')) {
      return "Amazon SageMaker is central to the AWS ML certification. Key features include:\n\n• **SageMaker Studio**: Integrated development environment for ML\n• **Built-in Algorithms**: Pre-built algorithms for common ML tasks\n• **Training Jobs**: Managed training with automatic scaling\n• **Automatic Model Tuning**: Hyperparameter optimization\n• **Model Deployment**: Hosting models with auto-scaling endpoints\n• **Feature Store**: Centralized repository for ML features\n\nWhich SageMaker feature would you like to explore further?";
    }
    
    // Default response
    return "That's an interesting question! While I'm currently in demo mode with pre-defined responses, I can help you explore:\n\n• **Data Engineering** (20% of exam)\n• **Exploratory Data Analysis** (24% of exam)\n• **Modeling** (36% of exam)\n\nYou can also ask for study tips, exam preparation strategies, or explanations of specific AWS services like SageMaker.\n\nWhat would you like to learn about?";
  }
}

// Made with Bob
