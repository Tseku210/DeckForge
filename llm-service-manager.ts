import { LLMProvider, ProviderConfig, GenerationOptions, FlashcardResponse, LLMError } from './types';
import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { ErrorHandler } from './error-handler';

/**
 * Manages multiple LLM providers and handles provider switching
 */
export class LLMServiceManager {
  private providers: Map<string, LLMProvider> = new Map();
  private activeProvider: string = '';

  constructor() {
    // Initialize with empty providers - they will be configured through settings
  }

  /**
   * Register a provider with the manager
   */
  registerProvider(name: string, config: ProviderConfig): void {
    let provider: LLMProvider;

    // Determine provider type from name or config
    const providerType = this.determineProviderType(name, config);

    switch (providerType.toLowerCase()) {
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        provider = new AnthropicProvider(config);
        break;
      case 'gemini':
        provider = new GeminiProvider(config);
        break;
      default:
        throw new Error(`Unknown provider type: ${providerType} for provider: ${name}`);
    }

    this.providers.set(name, provider);
  }

  /**
   * Determine provider type from name or configuration
   */
  private determineProviderType(name: string, config: ProviderConfig): string {
    const nameLower = name.toLowerCase();

    // Check if name contains provider type
    if (nameLower.includes('openai') || nameLower.includes('gpt')) {
      return 'openai';
    }
    if (nameLower.includes('anthropic') || nameLower.includes('claude')) {
      return 'anthropic';
    }
    if (nameLower.includes('gemini') || nameLower.includes('google')) {
      return 'gemini';
    }

    // Check endpoint to determine provider type
    if (config.endpoint) {
      const endpointLower = config.endpoint.toLowerCase();
      if (endpointLower.includes('openai.com')) {
        return 'openai';
      }
      if (endpointLower.includes('anthropic.com')) {
        return 'anthropic';
      }
      if (endpointLower.includes('googleapis.com') || endpointLower.includes('gemini')) {
        return 'gemini';
      }
    }

    // Check model to determine provider type
    if (config.model) {
      const modelLower = config.model.toLowerCase();
      if (modelLower.includes('gpt') || modelLower.includes('davinci') || modelLower.includes('turbo')) {
        return 'openai';
      }
      if (modelLower.includes('claude')) {
        return 'anthropic';
      }
      if (modelLower.includes('gemini')) {
        return 'gemini';
      }
    }

    // Default fallback - assume it's the provider type itself
    return name;
  }

  /**
   * Remove a provider from the manager
   */
  unregisterProvider(name: string): void {
    this.providers.delete(name);
    if (this.activeProvider === name) {
      this.activeProvider = '';
    }
  }

  /**
   * Set the active provider
   */
  setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} is not registered`);
    }
    this.activeProvider = name;
  }

  /**
   * Get the active provider
   */
  getActiveProvider(): LLMProvider | null {
    if (!this.activeProvider || !this.providers.has(this.activeProvider)) {
      return null;
    }
    return this.providers.get(this.activeProvider) || null;
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Validate configuration for a specific provider type
   */
  validateProviderConfig(providerType: string, config: ProviderConfig): boolean {
    try {
      let tempProvider: LLMProvider;

      switch (providerType.toLowerCase()) {
        case 'openai':
          tempProvider = new OpenAIProvider(config);
          break;
        case 'anthropic':
          tempProvider = new AnthropicProvider(config);
          break;
        case 'gemini':
          tempProvider = new GeminiProvider(config);
          break;
        default:
          return false;
      }

      return tempProvider.validateConfig(config);
    } catch (error) {
      console.error(`Error validating ${providerType} config:`, error);
      return false;
    }
  }

  /**
   * Test authentication for a provider
   */
  async testProviderAuthentication(name: string): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} is not registered`);
    }

    try {
      return await provider.authenticate(provider.getConfig() as ProviderConfig);
    } catch (error) {
      console.error(`Authentication test failed for ${name}:`, error);
      return false;
    }
  }

  /**
   * Generate flashcards using the active provider
   */
  async generateFlashcards(content: string, options: GenerationOptions): Promise<FlashcardResponse> {
    const provider = this.getActiveProvider();
    if (!provider) {
      const error = ErrorHandler.createError('authentication', 'No active provider configured. Please configure and select a provider in settings.');
      throw error;
    }

    try {
      return await provider.generateFlashcards(content, options);
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error as LLMError;
      }
      const wrappedError = ErrorHandler.createError('unknown', `Error generating flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      ErrorHandler.logError(error, 'LLMServiceManager.generateFlashcards', { provider: this.activeProvider });
      throw wrappedError;
    }
  }

  /**
   * Update configuration for a registered provider
   */
  updateProviderConfig(name: string, config: ProviderConfig): void {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} is not registered`);
    }

    provider.updateConfig(config);
  }

  /**
   * Get configuration for a provider (without sensitive data)
   */
  getProviderConfig(name: string): Partial<ProviderConfig> | null {
    const provider = this.providers.get(name);
    if (!provider) {
      return null;
    }

    return provider.getConfig();
  }

  /**
   * Initialize providers from settings
   */
  initializeFromSettings(providers: Record<string, ProviderConfig>, activeProvider: string): void {
    // Clear existing providers
    this.providers.clear();
    this.activeProvider = '';

    // Register providers from settings
    Object.entries(providers).forEach(([name, config]) => {
      try {
        this.registerProvider(name, config);
      } catch (error) {
        console.error(`Failed to register provider ${name}:`, error);
      }
    });

    // Set active provider if valid
    if (activeProvider && this.providers.has(activeProvider)) {
      this.activeProvider = activeProvider;
    }
  }

  /**
   * Get provider status information
   */
  getProviderStatus(): Array<{ name: string, configured: boolean, active: boolean }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      configured: provider.validateConfig(provider.getConfig() as ProviderConfig),
      active: name === this.activeProvider
    }));
  }

  /**
   * Get available provider types that can be registered
   */
  static getAvailableProviderTypes(): string[] {
    return ['openai', 'anthropic', 'gemini'];
  }

  /**
   * Get default configuration for a provider type
   */
  static getDefaultConfig(providerType: string): Partial<ProviderConfig> {
    switch (providerType.toLowerCase()) {
      case 'openai':
        return {
          endpoint: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        };
      case 'anthropic':
        return {
          endpoint: 'https://api.anthropic.com/v1',
          model: 'claude-3-haiku-20240307'
        };
      case 'gemini':
        return {
          endpoint: 'https://generativelanguage.googleapis.com/v1beta',
          model: 'gemini-1.5-flash'
        };
      default:
        return {};
    }
  }

  // Using ErrorHandler.createError instead of this private method
}