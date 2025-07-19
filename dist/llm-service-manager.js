"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMServiceManager = void 0;
const openai_provider_1 = require("./providers/openai-provider");
const anthropic_provider_1 = require("./providers/anthropic-provider");
const gemini_provider_1 = require("./providers/gemini-provider");
/**
 * Manages multiple LLM providers and handles provider switching
 */
class LLMServiceManager {
    constructor() {
        this.providers = new Map();
        this.activeProvider = '';
        // Initialize with empty providers - they will be configured through settings
    }
    /**
     * Register a provider with the manager
     */
    registerProvider(name, config) {
        let provider;
        switch (name.toLowerCase()) {
            case 'openai':
                provider = new openai_provider_1.OpenAIProvider(config);
                break;
            case 'anthropic':
                provider = new anthropic_provider_1.AnthropicProvider(config);
                break;
            case 'gemini':
                provider = new gemini_provider_1.GeminiProvider(config);
                break;
            default:
                throw new Error(`Unknown provider type: ${name}`);
        }
        this.providers.set(name, provider);
    }
    /**
     * Remove a provider from the manager
     */
    unregisterProvider(name) {
        this.providers.delete(name);
        if (this.activeProvider === name) {
            this.activeProvider = '';
        }
    }
    /**
     * Set the active provider
     */
    setActiveProvider(name) {
        if (!this.providers.has(name)) {
            throw new Error(`Provider ${name} is not registered`);
        }
        this.activeProvider = name;
    }
    /**
     * Get the active provider
     */
    getActiveProvider() {
        if (!this.activeProvider || !this.providers.has(this.activeProvider)) {
            return null;
        }
        return this.providers.get(this.activeProvider) || null;
    }
    /**
     * Get all registered provider names
     */
    getProviderNames() {
        return Array.from(this.providers.keys());
    }
    /**
     * Check if a provider is registered
     */
    hasProvider(name) {
        return this.providers.has(name);
    }
    /**
     * Validate configuration for a specific provider type
     */
    validateProviderConfig(providerType, config) {
        try {
            let tempProvider;
            switch (providerType.toLowerCase()) {
                case 'openai':
                    tempProvider = new openai_provider_1.OpenAIProvider(config);
                    break;
                case 'anthropic':
                    tempProvider = new anthropic_provider_1.AnthropicProvider(config);
                    break;
                case 'gemini':
                    tempProvider = new gemini_provider_1.GeminiProvider(config);
                    break;
                default:
                    return false;
            }
            return tempProvider.validateConfig(config);
        }
        catch (error) {
            console.error(`Error validating ${providerType} config:`, error);
            return false;
        }
    }
    /**
     * Test authentication for a provider
     */
    async testProviderAuthentication(name) {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} is not registered`);
        }
        try {
            return await provider.authenticate(provider.getConfig());
        }
        catch (error) {
            console.error(`Authentication test failed for ${name}:`, error);
            return false;
        }
    }
    /**
     * Generate flashcards using the active provider
     */
    async generateFlashcards(content, options) {
        const provider = this.getActiveProvider();
        if (!provider) {
            throw this.createError('authentication', 'No active provider configured. Please configure and select a provider in settings.');
        }
        try {
            return await provider.generateFlashcards(content, options);
        }
        catch (error) {
            if (error instanceof Error && 'type' in error) {
                throw error;
            }
            throw this.createError('unknown', `Error generating flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update configuration for a registered provider
     */
    updateProviderConfig(name, config) {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} is not registered`);
        }
        provider.updateConfig(config);
    }
    /**
     * Get configuration for a provider (without sensitive data)
     */
    getProviderConfig(name) {
        const provider = this.providers.get(name);
        if (!provider) {
            return null;
        }
        return provider.getConfig();
    }
    /**
     * Initialize providers from settings
     */
    initializeFromSettings(providers, activeProvider) {
        // Clear existing providers
        this.providers.clear();
        this.activeProvider = '';
        // Register providers from settings
        Object.entries(providers).forEach(([name, config]) => {
            try {
                this.registerProvider(name, config);
            }
            catch (error) {
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
    getProviderStatus() {
        return Array.from(this.providers.entries()).map(([name, provider]) => ({
            name,
            configured: provider.validateConfig(provider.getConfig()),
            active: name === this.activeProvider
        }));
    }
    /**
     * Get available provider types that can be registered
     */
    static getAvailableProviderTypes() {
        return ['openai', 'anthropic', 'gemini'];
    }
    /**
     * Get default configuration for a provider type
     */
    static getDefaultConfig(providerType) {
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
    /**
     * Create a standardized error object
     */
    createError(type, message, details) {
        return {
            type,
            message,
            details
        };
    }
}
exports.LLMServiceManager = LLMServiceManager;
