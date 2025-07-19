import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler, ValidationResult } from '../error-handler';
import { LLMError, ProviderConfig } from '../types';

// Mock Obsidian's Notice
vi.mock('obsidian', () => ({
  Notice: vi.fn().mockImplementation((message: string, duration?: number) => {
    console.log(`Notice: ${message} (${duration}ms)`);
  })
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'group').mockImplementation(() => { });
    vi.spyOn(console, 'groupEnd').mockImplementation(() => { });
    vi.spyOn(console, 'trace').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleLLMError', () => {
    it('should handle authentication errors', () => {
      const error: LLMError = {
        type: 'authentication',
        message: 'Invalid API key'
      };

      ErrorHandler.handleLLMError(error, 'OpenAI');

      expect(console.error).toHaveBeenCalledWith('Authentication Error:', error);
    });

    it('should handle network errors', () => {
      const error: LLMError = {
        type: 'network',
        message: 'Connection timeout'
      };

      ErrorHandler.handleLLMError(error, 'Anthropic');

      expect(console.error).toHaveBeenCalledWith('Network Error:', error);
    });

    it('should handle invalid response errors', () => {
      const error: LLMError = {
        type: 'invalid_response',
        message: 'Malformed JSON'
      };

      ErrorHandler.handleLLMError(error, 'Gemini');

      expect(console.error).toHaveBeenCalledWith('Invalid Response Error:', error);
    });

    it('should handle unknown errors', () => {
      const error: LLMError = {
        type: 'unknown',
        message: 'Something went wrong'
      };

      ErrorHandler.handleLLMError(error);

      expect(console.error).toHaveBeenCalledWith('Unknown Error:', error);
    });
  });

  describe('validateProviderConfiguration', () => {
    it('should validate complete OpenAI configuration', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };

      const result = ErrorHandler.validateProviderConfiguration(config, 'OpenAI');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing API key', () => {
      const config: ProviderConfig = {
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };

      const result = ErrorHandler.validateProviderConfiguration(config, 'OpenAI');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key is required');
    });

    it('should detect missing endpoint', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test123',
        model: 'gpt-3.5-turbo'
      };

      const result = ErrorHandler.validateProviderConfiguration(config, 'OpenAI');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API endpoint is required');
    });

    it('should detect invalid endpoint URL', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test123',
        endpoint: 'not-a-url',
        model: 'gpt-3.5-turbo'
      };

      const result = ErrorHandler.validateProviderConfiguration(config, 'OpenAI');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API endpoint must be a valid URL');
    });

    it('should detect missing model', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com/v1'
      };

      const result = ErrorHandler.validateProviderConfiguration(config, 'OpenAI');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Model name is required');
    });

    it('should warn about OpenAI API key format', () => {
      const config: ProviderConfig = {
        apiKey: 'wrong-format',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };

      const result = ErrorHandler.validateProviderConfiguration(config, 'OpenAI');

      expect(result.warnings).toContain('OpenAI API keys typically start with "sk-"');
    });

    it('should warn about Anthropic API key format', () => {
      const config: ProviderConfig = {
        apiKey: 'wrong-format',
        endpoint: 'https://api.anthropic.com/v1',
        model: 'claude-3-haiku'
      };

      const result = ErrorHandler.validateProviderConfiguration(config, 'Anthropic');

      expect(result.warnings).toContain('Anthropic API keys typically start with "sk-ant-"');
    });

    it('should validate custom headers', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        customHeaders: {
          'X-Custom': 'value',
          123: 'invalid' as any // Invalid key type
        }
      };

      const result = ErrorHandler.validateProviderConfiguration(config, 'OpenAI');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Custom header'))).toBe(true);
    });
  });

  describe('createError', () => {
    it('should create error with correct properties', () => {
      const error = ErrorHandler.createError('network', 'Connection failed', { code: 500 });

      expect(error.type).toBe('network');
      expect(error.message).toBe('Connection failed');
      expect(error.details).toEqual({ code: 500 });
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = 'Test context';
      const additionalInfo = { key: 'value' };

      ErrorHandler.logError(error, context, additionalInfo);

      expect(console.group).toHaveBeenCalledWith('🚨 LLM Flashcard Generator Error - Test context');
      expect(console.error).toHaveBeenCalledWith('Error:', error);
      expect(console.log).toHaveBeenCalledWith('Additional Info:', additionalInfo);
      expect(console.trace).toHaveBeenCalledWith('Stack trace');
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('should log error without additional info', () => {
      const error = new Error('Test error');
      const context = 'Test context';

      ErrorHandler.logError(error, context);

      expect(console.group).toHaveBeenCalledWith('🚨 LLM Flashcard Generator Error - Test context');
      expect(console.error).toHaveBeenCalledWith('Error:', error);
      expect(console.log).not.toHaveBeenCalledWith('Additional Info:', expect.anything());
    });
  });

  describe('error handling methods', () => {
    it('should handle configuration errors', () => {
      ErrorHandler.handleConfigurationError('Invalid setting', 'TestProvider');
      // Should not throw and should call Notice
    });

    it('should handle content validation errors', () => {
      ErrorHandler.handleContentValidationError('Content too short');
      // Should not throw and should call Notice
    });

    it('should handle file operation errors', () => {
      ErrorHandler.handleFileOperationError('Permission denied', 'write');
      // Should not throw and should call Notice
    });

    it('should handle flashcard generation errors', () => {
      ErrorHandler.handleFlashcardGenerationError('Invalid format', 'parsing');
      // Should not throw and should call Notice
    });
  });

  describe('user feedback methods', () => {
    it('should show success message', () => {
      ErrorHandler.showSuccess('Operation completed', 'Details here');
      // Should not throw and should call Notice
    });

    it('should show warning message', () => {
      ErrorHandler.showWarning('This is a warning');
      // Should not throw and should call Notice
    });

    it('should show info message', () => {
      ErrorHandler.showInfo('This is information');
      // Should not throw and should call Notice
    });
  });

  describe('showConfigurationValidation', () => {
    it('should show success for valid configuration', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      ErrorHandler.showConfigurationValidation(result, 'TestProvider');
      // Should not throw and should call Notice with success message
    });

    it('should show warnings for valid configuration with warnings', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['This is a warning']
      };

      ErrorHandler.showConfigurationValidation(result, 'TestProvider');
      // Should not throw and should call Notice with warning message
    });

    it('should show errors for invalid configuration', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: ['This is an error'],
        warnings: []
      };

      ErrorHandler.showConfigurationValidation(result, 'TestProvider');
      // Should not throw and should call Notice with error message
    });
  });
});