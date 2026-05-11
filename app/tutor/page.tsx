'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import type { ChatMessageProps } from './components/ChatMessage';

// Mock AI response generator
function generateMockAIResponse(userMessage: string): string {
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

export default function TutorPage() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessageProps = {
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI thinking time (1-2 seconds)
    const thinkingTime = 1000 + Math.random() * 1000;
    
    setTimeout(() => {
      // Generate AI response
      const aiResponse: ChatMessageProps = {
        role: 'assistant',
        content: generateMockAIResponse(content),
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, thinkingTime);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Tutor
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get personalized help and explanations
              </p>
            </div>
            
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Demo Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <ChatHistory messages={messages} isLoading={isLoading} />
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>

      {/* Info Banner */}
      {messages.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This is a demo version with pre-defined responses. Full AI integration coming soon in Settings → AI Provider.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob