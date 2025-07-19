import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMServiceManager } from '../llm-service-manager';
import { ProviderConfig, GenerationOptions, CardType, LLMError } from '../types';

// Mock providers
const mockProvider = {
  name: 'MockProvider',
  authenticate: vi.fn(),
  generateFlashcards: vi.fn(),
  validateConfig: vi.fn(),
  updateConfig: vi.fn(),
  getConfig: vi.fn()
};

// Mock provider classes
vi.mock('../providers/openai-provider', () => ({
  OpenAIProvider: vi.fn().mockImplementation((config) => ({
    ...mockProvider,
    name: 'OpenAI',
    getConfig: () => config
  }))
}));

vi.mock('../providers/anthropic-provider', () => ({
  AnthropicProvider: vi.fn().mockImplementation((config) => ({
    ...mockProvider,
    name: 'Anthropic',
    getConfig: () => config
  }))
}));

vi.mock('../providers/gemini-provider', () => ({
  GeminiProvider: vi.fn().mockImplementation((config) => ({
    ...mockProvider,
    name: 'Gemini',
    getConfig: () => config
  }))
}));

vi.mock('../error-handler', () => ({
  ErrorHandler: {
    createError: vi.fn((type, message, details) => ({ type, message, details })),
    logError: vi.fn()
  }
}));

describe('LLMServiceManager', () => {
  let manager: LLMServiceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new LLMServiceManager();
    mockProvider.authenticate.mockResolvedValue(true);
    mockProvider.generateFlashcards.mockResolvedValue({ cards: [] });
    mockProvider.validateConfig.mockReturnValue(true);
    mockProvider.getConfig.mockReturnValue({});
  });

  describe('registerProvider', () => {
    it('should register OpenAI provider', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };

      manager.registerProvider('openai', config);

      expect(manager.hasProvider('openai')).toBe(true);
      expect(manager.getProviderNames()).toContain('openai');
    });

    it('should register Anthropic provider', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-ant-test',
        endpoint: 'https://api.anthropic.com/v1',
        model: 'claude-3-haiku'
      };

      manager.registerProvider('anthropic', config);

      expect(manager.hasProvider('anthropic')).toBe(true);
    });

    it('should register Gemini provider', () => {
      const config: ProviderConfig = {
        apiKey: 'gemini-key',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-1.5-flash'
      };

      manager.registerProvider('gemini', config);

      expect(manager.hasProvider('gemini')).toBe(true);
    });

    it('should determine provider type from name', () => {
      const config: ProviderConfig = { apiKey: 'test' };

      manager.registerProvider('my-openai-provider', config);
      manager.registerProvider('claude-provider', config);
      manager.registerProvider('google-gemini', config);

      expect(manager.getProviderNames()).toHaveLength(3);
    });

    it('should determine provider type from endpoint', () => {
      const openaiConfig: ProviderConfig = {
        apiKey: 'test',
        endpoint: 'https://api.openai.com/v1'
      };

      manager.registerProvider('custom', openaiConfig);

      expect(manager.hasProvider('custom')).toBe(true);
    });

    it('should determine provider type from model', () => {
      const config: ProviderConfig = {
        apiKey: 'test',
        model: 'gpt-4'
      };

      manager.registerProvider('custom', config);

      expect(manager.hasProvider('custom')).toBe(true);
    });

    it('should throw error for unknown provider type', () => {
      const config: ProviderConfig = { apiKey: 'test' };

      expect(() => manager.registerProvider('unknown', config))
        .toThrow('Unknown provider type: unknown for provider: unknown');
    });
  });

  describe('provider management', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        apiKey: 'test',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };
      manager.registerProvider('openai', config);
    });

    it('should unregister provider', () => {
      manager.unregisterProvider('openai');

      expect(manager.hasProvider('openai')).toBe(false);
      expect(manager.getProviderNames()).not.toContain('openai');
    });

    it('should clear active provider when unregistering active provider', () => {
      manager.setActiveProvider('openai');
      manager.unregisterProvider('openai');

      expect(manager.getActiveProvider()).toBeNull();
    });

    it('should set active provider', () => {
      manager.setActiveProvider('openai');

      expect(manager.getActiveProvider()).toBeTruthy();
    });

    it('should throw error when setting non-existent active provider', () => {
      expect(() => manager.setActiveProvider('nonexistent'))
        .toThrow('Provider nonexistent is not registered');
    });

    it('should return null for active provider when none set', () => {
      expect(manager.getActiveProvider()).toBeNull();
    });

    it('should return null for active provider when provider not found', () => {
      manager.setActiveProvider('openai');
      manager.unregisterProvider('openai');

      expect(manager.getActiveProvider()).toBeNull();
    });
  });

  describe('provider validation', () => {
    it('should validate OpenAI provider config', () => {
      const config: ProviderConfig = {
        apiKey: 'sk-test',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };

      const isValid = manager.validateProviderConfig('openai', config);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid provider type', () => {
      const config: ProviderConfig = { apiKey: 'test' };

      const isValid = manager.validateProviderConfig('invalid', config);

      expect(isValid).toBe(false);
    });

    it('should handle validation errors', () => {
      const config: ProviderConfig = { apiKey: 'test' };

      // Test with invalid provider type to trigger error handling
      const isValid = manager.validateProviderConfig('invalid-type', config);

      expect(isValid).toBe(false);
    });
  });

  describe('authentication testing', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        apiKey: 'test',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };
      manager.registerProvider('openai', config);
    });

    it('should test provider authentication successfully', async () => {
      mockProvider.authenticate.mockResolvedValue(true);

      const result = await manager.testProviderAuthentication('openai');

      expect(result).toBe(true);
      expect(mockProvider.authenticate).toHaveBeenCalled();
    });

    it('should handle authentication failure', async () => {
      mockProvider.authenticate.mockResolvedValue(false);

      const result = await manager.testProviderAuthentication('openai');

      expect(result).toBe(false);
    });

    it('should handle authentication error', async () => {
      mockProvider.authenticate.mockRejectedValue(new Error('Network error'));

      const result = await manager.testProviderAuthentication('openai');

      expect(result).toBe(false);
    });

    it('should throw error for non-existent provider', async () => {
      await expect(manager.testProviderAuthentication('nonexistent'))
        .rejects.toThrow('Provider nonexistent is not registered');
    });
  });

  describe('flashcard generation', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        apiKey: 'test',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };
      manager.registerProvider('openai', config);
      manager.setActiveProvider('openai');
    });

    it('should generate flashcards successfully', async () => {
      const expectedResponse = {
        cards: [
          {
            front: 'Question',
            back: 'Answer',
            type: CardType.OneWay,
            tags: ['#test']
          }
        ]
      };
      mockProvider.generateFlashcards.mockResolvedValue(expectedResponse);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay],
        maxCards: 5
      };

      const result = await manager.generateFlashcards('Test content', options);

      expect(result).toEqual(expectedResponse);
      expect(mockProvider.generateFlashcards).toHaveBeenCalledWith('Test content', options);
    });

    it('should throw error when no active provider', async () => {
      manager.unregisterProvider('openai');

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      await expect(manager.generateFlashcards('Test content', options))
        .rejects.toMatchObject({
          type: 'authentication',
          message: 'No active provider configured. Please configure and select a provider in settings.'
        });
    });

    it('should handle provider errors', async () => {
      const providerError: LLMError = {
        type: 'network',
        message: 'Connection failed'
      };
      mockProvider.generateFlashcards.mockRejectedValue(providerError);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      await expect(manager.generateFlashcards('Test content', options))
        .rejects.toMatchObject({
          type: 'network',
          message: 'Connection failed'
        });
    });

    it('should wrap unknown errors', async () => {
      mockProvider.generateFlashcards.mockRejectedValue(new Error('Unknown error'));

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      await expect(manager.generateFlashcards('Test content', options))
        .rejects.toMatchObject({
          type: 'unknown',
          message: 'Error generating flashcards: Unknown error'
        });
    });
  });

  describe('provider configuration management', () => {
    beforeEach(() => {
      const config: ProviderConfig = {
        apiKey: 'test',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };
      manager.registerProvider('openai', config);
    });

    it('should update provider configuration', () => {
      const newConfig: ProviderConfig = {
        apiKey: 'new-key',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4'
      };

      manager.updateProviderConfig('openai', newConfig);

      expect(mockProvider.updateConfig).toHaveBeenCalledWith(newConfig);
    });

    it('should throw error when updating non-existent provider', () => {
      const config: ProviderConfig = { apiKey: 'test' };

      expect(() => manager.updateProviderConfig('nonexistent', config))
        .toThrow('Provider nonexistent is not registered');
    });

    it('should get provider configuration', () => {
      const config = manager.getProviderConfig('openai');

      expect(config).toBeDefined();
      // The getConfig method is called on the actual provider instance, not the mock
    });

    it('should return null for non-existent provider config', () => {
      const config = manager.getProviderConfig('nonexistent');

      expect(config).toBeNull();
    });
  });

  describe('initialization from settings', () => {
    it('should initialize providers from settings', () => {
      const providers = {
        openai: {
          apiKey: 'sk-test',
          endpoint: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        },
        anthropic: {
          apiKey: 'sk-ant-test',
          endpoint: 'https://api.anthropic.com/v1',
          model: 'claude-3-haiku'
        }
      };

      manager.initializeFromSettings(providers, 'openai');

      expect(manager.getProviderNames()).toHaveLength(2);
      expect(manager.getActiveProvider()).toBeTruthy();
    });

    it('should handle provider registration errors', () => {
      const providers = {
        invalid: {
          apiKey: 'test'
        }
      };

      // Should not throw, but should log error
      expect(() => manager.initializeFromSettings(providers, 'invalid')).not.toThrow();
      expect(manager.getProviderNames()).toHaveLength(0);
    });

    it('should not set invalid active provider', () => {
      const providers = {
        openai: {
          apiKey: 'sk-test',
          endpoint: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        }
      };

      manager.initializeFromSettings(providers, 'nonexistent');

      expect(manager.getActiveProvider()).toBeNull();
    });
  });

  describe('provider status', () => {
    it('should get provider status information', () => {
      const config: ProviderConfig = {
        apiKey: 'test',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      };
      manager.registerProvider('openai', config);
      manager.setActiveProvider('openai');

      const status = manager.getProviderStatus();

      expect(status).toHaveLength(1);
      expect(status[0]).toEqual({
        name: 'openai',
        configured: true,
        active: true
      });
    });

    it('should show unconfigured provider status', () => {
      const config: ProviderConfig = { apiKey: 'test' };
      manager.registerProvider('openai', config);
      mockProvider.validateConfig.mockReturnValue(false);

      const status = manager.getProviderStatus();

      expect(status[0].configured).toBe(false);
    });
  });

  describe('static methods', () => {
    it('should return available provider types', () => {
      const types = LLMServiceManager.getAvailableProviderTypes();

      expect(types).toEqual(['openai', 'anthropic', 'gemini']);
    });

    it('should return default OpenAI config', () => {
      const config = LLMServiceManager.getDefaultConfig('openai');

      expect(config).toEqual({
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      });
    });

    it('should return default Anthropic config', () => {
      const config = LLMServiceManager.getDefaultConfig('anthropic');

      expect(config).toEqual({
        endpoint: 'https://api.anthropic.com/v1',
        model: 'claude-3-haiku-20240307'
      });
    });

    it('should return default Gemini config', () => {
      const config = LLMServiceManager.getDefaultConfig('gemini');

      expect(config).toEqual({
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-1.5-flash'
      });
    });

    it('should return empty config for unknown provider', () => {
      const config = LLMServiceManager.getDefaultConfig('unknown');

      expect(config).toEqual({});
    });
  });
});