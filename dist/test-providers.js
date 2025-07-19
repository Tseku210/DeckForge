"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testProviderSystem = void 0;
// Simple test to verify provider system works
const llm_service_manager_1 = require("./llm-service-manager");
// Test the provider system
function testProviderSystem() {
    const manager = new llm_service_manager_1.LLMServiceManager();
    // Test getting available provider types
    const availableTypes = llm_service_manager_1.LLMServiceManager.getAvailableProviderTypes();
    console.log('Available provider types:', availableTypes);
    // Test getting default config
    const openaiConfig = llm_service_manager_1.LLMServiceManager.getDefaultConfig('openai');
    console.log('OpenAI default config:', openaiConfig);
    // Test provider registration
    const testConfig = {
        apiKey: 'test-key',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
    };
    try {
        manager.registerProvider('openai', testConfig);
        console.log('OpenAI provider registered successfully');
        manager.setActiveProvider('openai');
        console.log('Active provider set to OpenAI');
        const activeProvider = manager.getActiveProvider();
        console.log('Active provider name:', activeProvider?.name);
        const status = manager.getProviderStatus();
        console.log('Provider status:', status);
    }
    catch (error) {
        console.error('Error testing provider system:', error);
    }
}
exports.testProviderSystem = testProviderSystem;
// Only run if this file is executed directly
if (require.main === module) {
    testProviderSystem();
}
