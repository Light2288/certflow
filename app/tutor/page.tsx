'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import type { ChatMessageProps } from './components/ChatMessage';
import { AIService, AIServiceError } from '@/lib/ai';
import { useSettings } from '@/lib/contexts/settings-context';
import { AI_PROVIDERS } from '@/lib/types/ai-settings';

export default function TutorPage() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const { settings, isLoading: settingsLoading } = useSettings();

  // Create AI service instance with current settings
  const aiService = useMemo(() => {
    return new AIService({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseUrl: settings.baseUrl,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    });
  }, [settings]);

  // Get provider info for display
  const providerInfo = AI_PROVIDERS[settings.provider];

  // Prevent body scroll on this page
  useEffect(() => {
    // Save original overflow value
    const originalOverflow = document.body.style.overflow;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  /**
   * Get user-friendly error message based on error type
   */
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AIServiceError) {
      switch (error.code) {
        case 'MISSING_API_KEY':
          return `⚠️ **API Key Required**\n\nYour ${error.provider || 'AI provider'} needs an API key to work. Please:\n\n1. Go to [Settings](/settings)\n2. Enter your API key\n3. Try again\n\nNeed help getting an API key? Check your provider's documentation.`;
        
        case 'INVALID_API_KEY':
          return `🔑 **Invalid API Key**\n\nThe API key for ${error.provider || 'your provider'} appears to be invalid. Please:\n\n1. Check your API key in [Settings](/settings)\n2. Make sure it's copied correctly\n3. Verify it's still active\n\nTip: API keys usually start with specific prefixes (e.g., "sk-" for OpenAI).`;
        
        case 'RATE_LIMIT':
          return `⏱️ **Rate Limit Reached**\n\nYou've sent too many requests to ${error.provider || 'the AI provider'}. Please:\n\n1. Wait a few moments\n2. Try again\n\nIf this persists, check your provider's rate limits or consider upgrading your plan.`;
        
        case 'QUOTA_EXCEEDED':
          return `💳 **Quota Exceeded**\n\nYour ${error.provider || 'AI provider'} quota has been exceeded. Please:\n\n1. Check your account balance\n2. Add credits or upgrade your plan\n3. Try again\n\nVisit your provider's dashboard to manage your account.`;
        
        case 'NETWORK_ERROR':
          return `🌐 **Network Error**\n\nCouldn't connect to ${error.provider || 'the AI provider'}. Please:\n\n1. Check your internet connection\n2. Try again in a moment\n3. If using Ollama, make sure it's running\n\nError details: ${error.message}`;
        
        case 'MODEL_NOT_FOUND':
          return `🤖 **Model Not Available**\n\nThe model you selected isn't available. Please:\n\n1. Go to [Settings](/settings)\n2. Choose a different model\n3. Try again\n\nError: ${error.message}`;
        
        default:
          return `❌ **Error**\n\n${error.message}\n\nProvider: ${error.provider || 'Unknown'}\nCode: ${error.code}\n\nPlease check your [Settings](/settings) and try again.`;
      }
    }
    
    // Generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `❌ **Unexpected Error**\n\nSomething went wrong: ${errorMessage}\n\nPlease:\n1. Check your [Settings](/settings)\n2. Try again\n3. If the problem persists, try a different AI provider`;
  };

  const handleSendMessage = async (content: string, isRetry: boolean = false) => {
    // Add user message (only if not a retry)
    if (!isRetry) {
      const userMessage: ChatMessageProps = {
        role: 'user',
        content,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setLastError(null);
    }
    
    setIsLoading(true);

    try {
      // Convert messages to AI service format (for context)
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      
      let response;
      
      // Use API route for Ollama (server-side only) or optionally for all providers
      if (settings.provider === 'ollama') {
        // Call server-side API route
        const apiResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            history,
            config: {
              provider: settings.provider,
              apiKey: settings.apiKey,
              model: settings.model,
              baseUrl: settings.baseUrl,
              temperature: settings.temperature,
              maxTokens: settings.maxTokens,
            },
          }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new AIServiceError(
            errorData.error || 'API request failed',
            errorData.code || 'API_ERROR',
            errorData.provider || settings.provider
          );
        }

        response = await apiResponse.json();
      } else {
        // Use client-side AI service for other providers
        response = await aiService.chat(content, history);
      }
      
      // Add AI response to messages
      const aiResponse: ChatMessageProps = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiResponse]);
      setRetryCount(0); // Reset retry count on success
      setLastError(null);
    } catch (error) {
      // Handle error gracefully
      console.error('AI service error:', error);
      
      const errorMessage = getErrorMessage(error);
      setLastError(errorMessage);
      
      const errorResponse: ChatMessageProps = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorResponse]);
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Retry the last failed message
   */
  const handleRetry = () => {
    // Find the last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find(msg => msg.role === 'user');
    
    if (lastUserMessage && retryCount < 3) {
      // Remove the last error message
      setMessages((prev) => prev.slice(0, -1));
      handleSendMessage(lastUserMessage.content, true);
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4">
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
            {!settingsLoading && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                settings.provider === 'mock'
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  settings.provider === 'mock' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <span className="font-medium">{providerInfo.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container - Fixed layout with scrollable history */}
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full overflow-hidden relative">
        {/* Scrollable chat history */}
        <div className="flex-1 overflow-hidden">
          <ChatHistory messages={messages} isLoading={isLoading} />
        </div>
        
        {/* Fixed input at bottom */}
        <div className="flex-shrink-0">
          {/* Info Banner - Positioned above input when no messages */}
          {messages.length === 0 && !settingsLoading && (
            <div className={`border-t px-4 py-3 ${
              settings.provider === 'mock'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}>
              <p className={`text-sm ${
                settings.provider === 'mock'
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {settings.provider === 'mock' ? (
                  <>
                    <strong>Demo Mode:</strong> Using pre-defined responses. Configure a real AI provider in{' '}
                    <Link href="/settings" className="underline hover:no-underline font-medium">
                      Settings
                    </Link>{' '}
                    for full AI capabilities.
                  </>
                ) : providerInfo.requiresApiKey && !settings.apiKey ? (
                  <>
                    <strong>Configuration Required:</strong> {providerInfo.name} requires an API key. Please configure it in{' '}
                    <Link href="/settings" className="underline hover:no-underline font-medium">
                      Settings
                    </Link>.
                  </>
                ) : (
                  <>
                    <strong>AI Tutor Active:</strong> Using {providerInfo.name}
                    {settings.model && ` (${settings.model})`}. Ask me anything about your certification!
                  </>
                )}
              </p>
            </div>
          )}
          
          {/* Retry Button - Shows after error */}
          {lastError && retryCount > 0 && retryCount < 3 && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Message failed to send.</strong> Would you like to try again?
                </p>
                <button
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry ({3 - retryCount} left)
                </button>
              </div>
            </div>
          )}
          
          {/* Max retries reached */}
          {retryCount >= 3 && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 px-4 py-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Maximum retries reached.</strong> Please check your{' '}
                <Link href="/settings" className="underline hover:no-underline font-medium">
                  Settings
                </Link>{' '}
                and try sending a new message.
              </p>
            </div>
          )}
          
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

// Made with Bob