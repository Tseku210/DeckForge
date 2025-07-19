// Simple test to verify provider system works
import { LLMServiceManager } from './llm-service-manager';
import { ProviderConfig, CardType } from './types';

// Test the provider system
function testProviderSystem() {
  const manager = new LLMServiceManager();

  // Test getting available provider types
  const availableTypes = LLMServiceManager.getAvailableProviderTypes();
  console.log('Available provider types:', availableTypes);

  // Test getting default config
  const openaiConfig = LLMServiceManager.getDefaultConfig('openai');
  console.log('OpenAI default config:', openaiConfig);

  // Test provider registration
  const testConfig: ProviderConfig = {
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

  } catch (error) {
    console.error('Error testing provider system:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testProviderSystem();
}

export { testProviderSystem };