import { LLMProvider, ProviderConfig, GenerationOptions, FlashcardResponse, LLMError } from '../types';
import { ErrorHandler } from '../error-handler';

/**
 * Abstract base class for LLM providers
 * Provides common functionality and enforces interface implementation
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
   */
  abstract authenticate(config: ProviderConfig): Promise<boolean>;

  /**
   * Generate flashcards using the LLM provider
   * Must be implemented by concrete providers
   */
  abstract generateFlashcards(content: string, options: GenerationOptions): Promise<FlashcardResponse>;

  /**
   * Validate provider configuration
   * Can be overridden by concrete providers for specific validation
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
   */
  updateConfig(config: ProviderConfig): void {
    this.config = config;
  }

  /**
   * Get current configuration (without sensitive data)
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