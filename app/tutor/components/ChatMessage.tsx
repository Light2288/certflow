'use client';

import { formatDistanceToNow } from 'date-fns';
import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type CodeRendererProps = ComponentPropsWithoutRef<'code'> & { inline?: boolean };

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';
  
  // Format timestamp as relative time (e.g., "2 minutes ago")
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[80%] gap-3`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-purple-600 text-white'
          }`}
        >
          {isUser ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col">
          <div
            className={`rounded-lg px-4 py-3 ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            <div className="text-sm font-medium mb-1">
              {isUser ? 'You' : 'AI Tutor'}
            </div>
            <div className="text-base break-words">
              {isUser ? (
                // User messages: plain text with line breaks
                <div className="whitespace-pre-wrap">{content}</div>
              ) : (
                // AI messages: render markdown
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Customize markdown elements for better styling
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                      code: ({ inline, children, ...props }: CodeRendererProps) =>
                        inline ? (
                          <code className="bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-gray-200 dark:bg-gray-600 p-2 rounded text-sm font-mono overflow-x-auto my-2" {...props}>
                            {children}
                          </code>
                        ),
                      pre: ({ children }) => <pre className="my-2">{children}</pre>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">
                          {children}
                        </blockquote>
                      ),
                      h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
          
          {/* Timestamp */}
          <div
            className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
              isUser ? 'text-right' : 'text-left'
            }`}
          >
            {timeAgo}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob