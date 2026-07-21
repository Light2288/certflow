/**
 * Custom API Provider
 *
 * Implementation of the AIProvider interface for any OpenAI-compatible
 * chat-completions endpoint (e.g. IBM Consulting Advantage). It reuses the
 * official OpenAI SDK with a `baseURL` override and a user-supplied API key
 * (sent as a Bearer token), rather than a bespoke HTTP client.
 *
 * Unlike the OpenAI provider, base URL and model are user-supplied and
 * required: there is no official endpoint or default model to fall back to.
 */

import OpenAI from 'openai';
import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, AIConfig } from '../types';
import { AIServiceError } from '../types';

/**
 * Custom API provider for OpenAI-compatible endpoints.
 *
 * Points the OpenAI SDK at a user-supplied base URL. The SDK appends
 * `/chat/completions`, so callers configure the base URL up to (and
 * including) the model namespace, e.g.
 * `https://api.nextgen-beta.ica.ibm.com/ica/v1/chat-models`.
 */
export class CustomProvider implements AIProvider {
  readonly name = 'custom';
  private client: OpenAI | null = null;
  private config: AIConfig;

  /**
   * Create a new Custom provider instance.
   *
   * The OpenAI client is only constructed when both a base URL and an API
   * key are present. Constructing it never triggers a network call, so this
   * is safe on both the client and the server.
   *
   * @param config - AI configuration with baseUrl and apiKey
   */
  constructor(config: AIConfig) {
    this.config = config;

    const baseURL = CustomProvider.normalizeBaseUrl(config.baseUrl);
    if (baseURL && config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL,
        dangerouslyAllowBrowser: true, // Allow client-side usage
      });
    }
  }

  /**
   * Normalize a user-supplied base URL so the SDK builds a correct
   * `<baseUrl>/chat/completions` URL. Trims surrounding whitespace and strips
   * any trailing slash(es). Returns `undefined` when the input is empty.
   *
   * The path itself is left intact — the user supplies the full namespace.
   *
   * @param url - Raw base URL from settings
   * @returns Normalized base URL, or undefined if empty
   */
  private static normalizeBaseUrl(url: string | undefined): string | undefined {
    if (!url) {
      return undefined;
    }
    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    return trimmed.replace(/\/+$/, '');
  }

  /**
   * Send a chat message and get a response from the custom endpoint.
   *
   * @param message - The user's message
   * @param history - Optional conversation history for context
   * @param options - Optional chat configuration
   * @returns Promise resolving to the AI's response
   * @throws AIServiceError if the request fails or configuration is missing
   */
  async chat(
    message: string,
    history?: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    // Fail clearly on missing configuration BEFORE any network call, so a
    // misconfigured custom provider never silently degrades to mock output.
    if (!CustomProvider.normalizeBaseUrl(this.config.baseUrl)) {
      throw new AIServiceError(
        'Custom API base URL not configured',
        'MISSING_BASE_URL',
        this.name
      );
    }

    if (!this.config.apiKey) {
      throw new AIServiceError(
        'Custom API key not configured',
        'MISSING_API_KEY',
        this.name
      );
    }

    const model = options?.model || this.config.model;
    if (!model) {
      throw new AIServiceError(
        'Custom API model not configured',
        'MISSING_MODEL',
        this.name
      );
    }

    if (!this.client) {
      // Should be unreachable given the checks above, but keeps types honest.
      throw new AIServiceError(
        'Custom API client not initialized',
        'PROVIDER_ERROR',
        this.name
      );
    }

    try {
      // Convert chat history to OpenAI format, preserving system/user/assistant
      // roles so exam-grounding / tutor system prompts reach the endpoint.
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (history && history.length > 0) {
        for (const msg of history) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      messages.push({
        role: 'user',
        content: message,
      });

      const temperature = options?.temperature ?? this.config.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? this.config.maxTokens ?? 2000;

      let completion;
      try {
        completion = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });
      } catch (error) {
        // Some OpenAI-compatible gateways (e.g. IBM ICA routing to gpt-5-class
        // models via LiteLLM) reject unsupported sampling params with a 400
        // rather than ignoring them. When that happens, retry once without the
        // optional sampling params so the request still succeeds.
        if (this.isRetriableParamError(error)) {
          completion = await this.client.chat.completions.create({
            model,
            messages,
          });
        } else {
          throw error;
        }
      }

      const choice = completion.choices[0];
      if (!choice || !choice.message) {
        throw new AIServiceError(
          'No response from custom API',
          'EMPTY_RESPONSE',
          this.name
        );
      }

      return {
        content: choice.message.content || '',
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        model: completion.model,
        finishReason: this.mapFinishReason(choice.finish_reason),
      };
    } catch (error) {
      // Re-throw configuration/empty-response errors unchanged.
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Handle OpenAI-compatible API errors (status-bearing objects).
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status?: number; message?: string };
        throw new AIServiceError(
          this.getErrorMessage(apiError),
          this.getErrorCode(apiError),
          this.name
        );
      }

      throw new AIServiceError(
        `Custom API request failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'REQUEST_FAILED',
        this.name
      );
    }
  }

  /**
   * Validate the Custom provider configuration.
   *
   * Requires provider === 'custom' and non-empty base URL, API key, and
   * model. Custom keys are arbitrary, so no `sk-` prefix is enforced.
   *
   * @param config - Configuration to validate
   * @returns Promise resolving to true if valid
   */
  async validateConfig(config: AIConfig): Promise<boolean> {
    if (config.provider !== 'custom') {
      return false;
    }

    if (!config.baseUrl || config.baseUrl.trim().length === 0) {
      return false;
    }

    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return false;
    }

    if (!config.model || config.model.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Test connection to the custom endpoint with a minimal request.
   *
   * @returns Promise resolving to true if connection successful
   */
  async testConnection(): Promise<boolean> {
    if (!this.client || !this.config.model) {
      return false;
    }

    try {
      await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      return true;
    } catch (error) {
      console.error('Custom API connection test failed:', error);
      return false;
    }
  }

  /**
   * Decide whether a failed request is worth retrying without the optional
   * sampling params (`temperature`/`max_tokens`).
   *
   * Some OpenAI-compatible gateways (e.g. IBM ICA routing to gpt-5- or
   * Claude-class models via LiteLLM) reject those params with a 400 instead of
   * ignoring them. The SDK sometimes cannot parse the error body and reports it
   * as `"400 status code (no body)"`, so we cannot rely on finding the word
   * "temperature" in the message. Strategy:
   *
   * - Only ever retry on a 400.
   * - If any available text (message or parsed body) clearly points at a bad
   *   model / not-found error, do NOT retry — dropping params won't help.
   * - Otherwise retry: a param-rejection is the common retriable 400, and a
   *   genuinely malformed request simply fails again harmlessly.
   *
   * @param error - The error thrown by the SDK
   * @returns true if a param-dropping retry is worthwhile
   */
  private isRetriableParamError(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('status' in error)) {
      return false;
    }
    const err = error as {
      status?: number;
      message?: string;
      error?: unknown;
    };
    if (err.status !== 400) {
      return false;
    }

    // Gather any readable text from the message and the parsed body.
    const parts: string[] = [];
    if (typeof err.message === 'string') {
      parts.push(err.message);
    }
    if (err.error !== undefined) {
      parts.push(
        typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
      );
    }
    const text = parts.join(' ').toLowerCase();

    // A bad model id will never succeed on retry — don't waste a call.
    if (text.includes('model not found') || text.includes('model_not_found')) {
      return false;
    }

    // Everything else (including opaque "no body" 400s) is worth one retry
    // without the optional sampling params.
    return true;
  }

  /**
   * Map an OpenAI finish reason to our standard format.
   *
   * @param reason - OpenAI finish reason
   * @returns Standard finish reason
   */
  private mapFinishReason(
    reason: string | null | undefined
  ): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      default:
        return 'error';
    }
  }

  /**
   * Get a user-friendly error message from an OpenAI-compatible error.
   *
   * @param error - API error
   * @returns User-friendly error message
   */
  private getErrorMessage(error: { status?: number; message?: string }): string {
    switch (error.status) {
      case 401:
        return 'Invalid API key. Please check your custom API key in settings.';
      case 403:
        return 'Access forbidden. Your custom API key is not permitted to use this endpoint.';
      case 404:
        return 'Custom API endpoint not found. Please check the base URL in settings.';
      case 429:
        return 'Rate limit exceeded. Please try again in a moment.';
      case 500:
      case 502:
      case 503:
        return 'The custom API endpoint is temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An error occurred while communicating with the custom API endpoint.';
    }
  }

  /**
   * Get an error code from an OpenAI-compatible error.
   *
   * @param error - API error
   * @returns Error code
   */
  private getErrorCode(error: { status?: number }): string {
    switch (error.status) {
      case 401:
        return 'INVALID_API_KEY';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'ENDPOINT_NOT_FOUND';
      case 429:
        return 'RATE_LIMIT';
      case 500:
      case 502:
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'API_ERROR';
    }
  }
}

// Made with Bob
