/**
 * AI Tutor - useTutorSystemPrompt hook
 *
 * Loads the currently selected certification's config + topics and builds a
 * memoized, certification-grounded system prompt for the AI Tutor.
 *
 * The prompt is built once per `currentCertificationId` and reused across
 * renders/messages; it is rebuilt only when the certification changes. On a
 * missing/empty certification id or any load failure, the hook falls back to
 * `null` (logging a warning) so the tutor can send messages with no system
 * prompt rather than surfacing an error.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/contexts/settings-context';
import {
  loadCertificationConfig,
  loadCertificationTopics,
} from '@/lib/loaders/certification-loader';
import { buildTutorSystemPrompt } from './prompts';

/**
 * Returns the certification-grounded tutor system prompt for the current
 * certification, or `null` when unavailable.
 */
export function useTutorSystemPrompt(): string | null {
  const { currentCertificationId } = useSettings();
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);

  useEffect(() => {
    // No certification selected: fall back to no system prompt.
    if (!currentCertificationId) {
      setSystemPrompt(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [config, topics] = await Promise.all([
          loadCertificationConfig(currentCertificationId),
          loadCertificationTopics(currentCertificationId),
        ]);

        if (cancelled) {
          return;
        }

        setSystemPrompt(buildTutorSystemPrompt(config, topics));
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.warn(
          `Failed to build tutor system prompt for certification "${currentCertificationId}"; falling back to no system prompt.`,
          error
        );
        setSystemPrompt(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentCertificationId]);

  return systemPrompt;
}
