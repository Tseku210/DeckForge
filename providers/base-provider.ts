/**
 * Base Provider Module
 * 
 * This module provides the abstract base class for all LLM providers.
 * It implements common functionality and enforces the LLMProvider interface.
 * 
 * @module providers/base-provider
 */

import { LLMProvider, ProviderConfig, GenerationOptions, FlashcardResponse, LLMError } from '../types';

/**
 * Abstract base class for LLM providers
 * Provides common functionality and enforces interface implementation
 * 
 * All provider implementations should extend this class and implement
 * the abstract methods for authentication and flashcard generation.
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Authenticate with the LLM provider
   * Must be implemented by concrete providers
   * 
   * @param config - Provider configuration with API key and endpoint
   * @returns Promise resolving to boolean indicating authentication success
   */
  abstract authenticate(config: ProviderConfig): Promise<boolean>;

  /**
   * Generate flashcards using the LLM provider
   * Must be implemented by concrete providers
   * 
   * @param content - Note content to generate flashcards from
   * @param options - Generation options including card types, count, and tags
   * @returns Promise resolving to FlashcardResponse with generated cards
   */
  abstract generateFlashcards(content: string, options: GenerationOptions): Promise<FlashcardResponse>;

  /**
   * Validate provider configuration
   * Can be overridden by concrete providers for specific validation
   * 
   * @param config - Provider configuration to validate
   * @returns Boolean indicating if the configuration is valid
   */
  validateConfig(config: ProviderConfig): boolean {
    // Basic validation - ensure required fields are present
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false;
    }

    if (!config.endpoint || config.endpoint.trim() === '') {
      return false;
    }

    if (!config.model || config.model.trim() === '') {
      return false;
    }

    return true;
  }

  /**
   * Update provider configuration
   * 
   * @param config - New provider configuration to apply
   */
  updateConfig(config: ProviderConfig): void {
    this.config = config;
  }

  /**
   * Get current configuration (without sensitive data)
   * Returns a partial configuration object that excludes the API key
   * 
   * @returns Partial provider configuration without sensitive data
   */
  getConfig(): Partial<ProviderConfig> {
    return {
      endpoint: this.config.endpoint,
      model: this.config.model,
      customHeaders: this.config.customHeaders
    };
  }

  /**
   * Common error handling for HTTP requests
   * Converts various HTTP and network errors into standardized LLMError objects
   * 
   * @param error - The error object from the failed request
   * @param context - String describing where the error occurred
   * @returns Standardized LLMError object with type, message, and details
   */
  protected handleHttpError(error: any, context: string): LLMError {
    if (error.status === 401 || error.status === 403) {
      return {
        type: 'authentication',
        message: `Authentication failed for ${this.name}. Please check your API key.`,
        details: error
      };
    }

    if (error.status >= 500) {
      return {
        type: 'network',
        message: `Server error from ${this.name}. Please try again later.`,
        details: error
      };
    }

    if (error.name === 'NetworkError' || error.code === 'ECONNREFUSED') {
      return {
        type: 'network',
        message: `Network error connecting to ${this.name}. Please check your connection.`,
        details: error
      };
    }

    return {
      type: 'unknown',
      message: `Error in ${context}: ${error.message || 'Unknown error'}`,
      details: error
    };
  }

  /**
   * Common method to build request headers
   * Creates standard headers for API requests and merges with custom headers
   * 
   * @returns Record of header key-value pairs for API requests
   */
  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Obsidian-LLM-Flashcard-Generator/1.0.0'
    };

    // Add custom headers if configured
    if (this.config.customHeaders) {
      Object.assign(headers, this.config.customHeaders);
    }

    return headers;
  }

  /**
   * Common method to validate flashcard response format
   * Checks if the response contains a valid cards array with required fields
   * 
   * @param response - The parsed response object from the LLM
   * @returns Boolean indicating if the response has valid flashcard format
   */
  protected validateFlashcardResponse(response: any): boolean {
    if (!response || !Array.isArray(response.cards)) {
      return false;
    }

    // Validate each card has required fields
    return response.cards.every((card: any) =>
      card &&
      typeof card.front === 'string' &&
      typeof card.back === 'string' &&
      typeof card.type === 'string'
    );
  }
}