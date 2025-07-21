import { Notice } from 'obsidian';
import { LLMError, ProviderConfig } from './types';

/**
 * Comprehensive error handling system for the LLM Flashcard Generator plugin
 * Provides user-friendly error messages and troubleshooting guidance
 */
export class ErrorHandler {
  /**
   * Handle LLM-related errors with appropriate user feedback
   */
  static handleLLMError(error: LLMError, providerName?: string): void {
    const provider = providerName || 'LLM provider';

    switch (error.type) {
      case 'authentication':
        this.handleAuthenticationError(error, provider);
        break;
      case 'network':
        this.handleNetworkError(error, provider);
        break;
      case 'invalid_response':
        this.handleInvalidResponseError(error, provider);
        break;
      default:
        this.handleUnknownError(error, provider);
    }
  }

  /**
   * Handle authentication-related errors
   */
  private static handleAuthenticationError(error: LLMError, provider: string): void {
    const message = `🔐 Authentication failed for ${provider}`;
    const troubleshooting = this.getAuthenticationTroubleshooting(provider);

    new Notice(`${message}\n\n${troubleshooting}`, 10000);
    this.logError(error, `Authentication Error - ${provider}`);
  }

  /**
   * Handle network-related errors
   */
  private static handleNetworkError(error: LLMError, provider: string): void {
    const message = `🌐 Network error with ${provider}`;
    const troubleshooting = this.getNetworkTroubleshooting(provider);

    new Notice(`${message}\n\n${troubleshooting}`, 8000);
    this.logError(error, `Network Error - ${provider}`);
  }

  /**
   * Handle invalid response errors
   */
  private static handleInvalidResponseError(error: LLMError, provider: string): void {
    const message = `📄 Invalid response from ${provider}`;
    const troubleshooting = this.getInvalidResponseTroubleshooting(provider);

    new Notice(`${message}\n\n${troubleshooting}`, 8000);
    this.logError(error, `Invalid Response Error - ${provider}`);
  }

  /**
   * Handle unknown errors
   */
  private static handleUnknownError(error: LLMError, provider: string): void {
    const message = `❌ Unexpected error with ${provider}`;
    const troubleshooting = this.getGeneralTroubleshooting();

    new Notice(`${message}\n\n${troubleshooting}`, 8000);
    this.logError(error, `Unknown Error - ${provider}`);
  }

  /**
   * Handle configuration-related errors
   */
  static handleConfigurationError(message: string, providerName?: string): void {
    const provider = providerName || 'provider';
    const fullMessage = `⚙️ Configuration error for ${provider}: ${message}`;
    const troubleshooting = this.getConfigurationTroubleshooting(provider);

    new Notice(`${fullMessage}\n\n${troubleshooting}`, 10000);
  }

  /**
   * Handle content validation errors
   */
  static handleContentValidationError(message: string): void {
    const fullMessage = `📝 Content validation error: ${message}`;
    const troubleshooting = this.getContentValidationTroubleshooting();

    new Notice(`${fullMessage}\n\n${troubleshooting}`, 8000);
  }

  /**
   * Handle file operation errors
   */
  static handleFileOperationError(message: string, operation: string): void {
    const fullMessage = `📁 File operation error (${operation}): ${message}`;
    const troubleshooting = this.getFileOperationTroubleshooting(operation);

    new Notice(`${fullMessage}\n\n${troubleshooting}`, 8000);
  }

  /**
   * Handle flashcard generation errors
   */
  static handleFlashcardGenerationError(message: string, stage: string): void {
    const fullMessage = `🧠 Flashcard generation error (${stage}): ${message}`;
    const troubleshooting = this.getFlashcardGenerationTroubleshooting(stage);

    new Notice(`${fullMessage}\n\n${troubleshooting}`, 8000);
  }

  /**
   * Get authentication troubleshooting guidance
   */
  private static getAuthenticationTroubleshooting(provider: string): string {
    const providerLower = provider.toLowerCase();

    if (providerLower.includes('openai')) {
      return `Troubleshooting steps:
• Check your OpenAI API key in plugin settings
• Ensure your API key has sufficient credits
• Verify the API key format (starts with 'sk-')
• Check if your account has access to the selected model`;
    }

    if (providerLower.includes('anthropic')) {
      return `Troubleshooting steps:
• Check your Anthropic API key in plugin settings
• Ensure your API key has sufficient credits
• Verify the API key format (starts with 'sk-ant-')
• Check if your account has access to Claude models`;
    }

    if (providerLower.includes('gemini') || providerLower.includes('google')) {
      return `Troubleshooting steps:
• Check your Google AI API key in plugin settings
• Ensure your API key is enabled for Gemini API
• Verify you have quota remaining
• Check if the API key has proper permissions`;
    }

    return `Troubleshooting steps:
• Check your API key in plugin settings
• Ensure your API key is valid and active
• Verify you have sufficient credits/quota
• Check if your account has proper permissions`;
  }

  /**
   * Get network troubleshooting guidance
   */
  private static getNetworkTroubleshooting(provider: string): string {
    return `Troubleshooting steps:
• Check your internet connection
• Verify the API endpoint URL is correct
• Try again in a few moments (temporary server issues)
• Check if you're behind a firewall or proxy
• Ensure ${provider} services are not experiencing outages`;
  }

  /**
   * Get invalid response troubleshooting guidance
   */
  private static getInvalidResponseTroubleshooting(_provider: string): string {
    return `Troubleshooting steps:
• Try reducing the number of flashcards requested
• Simplify your custom prompt if using one
• Check if the content is too long or complex
• Try a different model if available
• Report this issue if it persists`;
  }

  /**
   * Get configuration troubleshooting guidance
   */
  private static getConfigurationTroubleshooting(provider: string): string {
    return `Troubleshooting steps:
• Open plugin settings and review ${provider} configuration
• Ensure all required fields are filled
• Check API endpoint URL format
• Verify model name is correct
• Save settings and try again`;
  }

  /**
   * Get content validation troubleshooting guidance
   */
  private static getContentValidationTroubleshooting(): string {
    return `Troubleshooting steps:
• Ensure your note has sufficient content (at least a few sentences)
• Check that the content is meaningful and educational
• Try with a different note or add more content
• Remove any problematic formatting if present`;
  }

  /**
   * Get file operation troubleshooting guidance
   */
  private static getFileOperationTroubleshooting(operation: string): string {
    const baseSteps = `Troubleshooting steps:
• Check if you have write permissions in the vault
• Ensure the target directory exists
• Try closing and reopening the note`;

    if (operation.includes('create') || operation.includes('write')) {
      return `${baseSteps}
• Check available disk space
• Verify the filename doesn't contain invalid characters`;
    }

    if (operation.includes('read')) {
      return `${baseSteps}
• Ensure the file exists and is accessible
• Check if the file is locked by another application`;
    }

    return baseSteps;
  }

  /**
   * Get flashcard generation troubleshooting guidance
   */
  private static getFlashcardGenerationTroubleshooting(stage: string): string {
    const baseSteps = `Troubleshooting steps:
• Try with simpler content
• Reduce the number of flashcards requested
• Check your LLM provider configuration`;

    if (stage.includes('processing')) {
      return `${baseSteps}
• Ensure your note content is not too long
• Remove any complex formatting that might interfere`;
    }

    if (stage.includes('formatting')) {
      return `${baseSteps}
• Try different card types
• Check if the generated content is valid
• Report this issue if it persists`;
    }

    return baseSteps;
  }

  /**
   * Get general troubleshooting guidance
   */
  private static getGeneralTroubleshooting(): string {
    return `General troubleshooting steps:
• Check plugin settings and configuration
• Try restarting Obsidian
• Check the console for detailed error information
• Report this issue with steps to reproduce`;
  }

  /**
   * Validate provider configuration and provide specific error messages
   */
  static validateProviderConfiguration(config: ProviderConfig, providerName: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check API key
    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('API key is required');
    } else {
      // Provider-specific API key format validation
      const providerLower = providerName.toLowerCase();
      if (providerLower.includes('openai') && !config.apiKey.startsWith('sk-')) {
        warnings.push('OpenAI API keys typically start with "sk-"');
      } else if (providerLower.includes('anthropic') && !config.apiKey.startsWith('sk-ant-')) {
        warnings.push('Anthropic API keys typically start with "sk-ant-"');
      }
    }

    // Check endpoint
    if (!config.endpoint || config.endpoint.trim() === '') {
      errors.push('API endpoint is required');
    } else {
      try {
        new URL(config.endpoint);
      } catch {
        errors.push('API endpoint must be a valid URL');
      }
    }

    // Check model
    if (!config.model || config.model.trim() === '') {
      errors.push('Model name is required');
    }

    // Validate custom headers if present
    if (config.customHeaders) {
      Object.entries(config.customHeaders).forEach(([key, value]) => {
        if (typeof key !== 'string' || typeof value !== 'string') {
          errors.push(`Custom header "${key}" must have string key and value`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Show configuration validation results to user
   */
  static showConfigurationValidation(result: ValidationResult, providerName: string): void {
    if (result.isValid) {
      if (result.warnings.length > 0) {
        const warningMessage = `⚠️ ${providerName} configuration warnings:\n${result.warnings.join('\n')}`;
        new Notice(warningMessage, 6000);
      } else {
        new Notice(`✅ ${providerName} configuration is valid`, 3000);
      }
    } else {
      const errorMessage = `❌ ${providerName} configuration errors:\n${result.errors.join('\n')}`;
      new Notice(errorMessage, 8000);
    }
  }

  /**
   * Create a standardized error object
   */
  static createError(type: LLMError['type'], message: string, details?: unknown): LLMError {
    return {
      type,
      message,
      details
    };
  }

  /**
   * Log error with context for debugging
   */
  static logError(error: unknown, context: string, additionalInfo?: unknown): void {
    // Only log detailed errors in development mode
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 LLM Flashcard Generator Error - ${context}`);
      console.error('Error:', error);
      if (additionalInfo) {
        console.log('Additional Info:', additionalInfo);
      }
      console.trace('Stack trace');
      console.groupEnd();
    } else {
      // In production, just log the basic error
      console.error(`LLM Flashcard Generator Error - ${context}:`, (error as Error).message || error);
    }
  }

  /**
   * Show success message with optional details
   */
  static showSuccess(message: string, details?: string, duration: number = 5000): void {
    const fullMessage = details ? `${message}\n${details}` : message;
    new Notice(`✅ ${fullMessage}`, duration);
  }

  /**
   * Show warning message
   */
  static showWarning(message: string, duration: number = 6000): void {
    new Notice(`⚠️ ${message}`, duration);
  }

  /**
   * Show info message
   */
  static showInfo(message: string, duration: number = 4000): void {
    new Notice(`ℹ️ ${message}`, duration);
  }
}

/**
 * Interface for validation results
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Specific error types for different components
 */
export enum ErrorType {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  INVALID_RESPONSE = 'invalid_response',
  CONFIGURATION = 'configuration',
  CONTENT_VALIDATION = 'content_validation',
  FILE_OPERATION = 'file_operation',
  FLASHCARD_GENERATION = 'flashcard_generation',
  UNKNOWN = 'unknown'
}

/**
 * Error context information for better debugging
 */
export interface ErrorContext {
  component: string;
  operation: string;
  provider?: string;
  additionalInfo?: unknown;
}