'use client';

import type { ComponentPropsWithoutRef } from 'react';

export type CodeRendererProps = ComponentPropsWithoutRef<'code'> & { inline?: boolean };

/**
 * Shared markdown renderer components, mirroring the AI Tutor's ChatMessage
 * styling. Used by DeepDiveButton and the topic detail page so authored
 * subtopic content renders consistently with the rest of the app.
 */
export const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="ml-2">{children}</li>,
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
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="my-2">{children}</pre>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">{children}</blockquote>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
      {children}
    </a>
  ),
};
