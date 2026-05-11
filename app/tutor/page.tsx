'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import type { ChatMessageProps } from './components/ChatMessage';
import { getAIService } from '@/lib/ai';

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

    try {
      // Get AI service instance
      const aiService = getAIService();
      
      // Convert messages to AI service format (for context)
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      
      // Get AI response
      const response = await aiService.chat(content, history);
      
      // Add AI response to messages
      const aiResponse: ChatMessageProps = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      // Handle error gracefully
      console.error('AI service error:', error);
      
      const errorResponse: ChatMessageProps = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
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