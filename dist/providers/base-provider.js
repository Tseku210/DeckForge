"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLMProvider = void 0;
/**
 * Abstract base class for LLM providers
 * Provides common functionality and enforces interface implementation
 */
class BaseLLMProvider {
    constructor(config) {
        this.config = config;
    }
    /**
     * Validate provider configuration
     * Can be overridden by concrete providers for specific validation
     */
    validateConfig(config) {
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
    updateConfig(config) {
        this.config = config;
    }
    /**
     * Get current configuration (without sensitive data)
     */
    getConfig() {
        return {
            endpoint: this.config.endpoint,
            model: this.config.model,
            customHeaders: this.config.customHeaders
        };
    }
    /**
     * Common error handling for HTTP requests
     */
    handleHttpError(error, context) {
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
    buildHeaders() {
        const headers = {
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
    validateFlashcardResponse(response) {
        if (!response || !Array.isArray(response.cards)) {
            return false;
        }
        // Validate each card has required fields
        return response.cards.every((card) => card &&
            typeof card.front === 'string' &&
            typeof card.back === 'string' &&
            typeof card.type === 'string');
    }
}
exports.BaseLLMProvider = BaseLLMProvider;
