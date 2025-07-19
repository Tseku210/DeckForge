"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const base_provider_1 = require("./base-provider");
const types_1 = require("../types");
/**
 * Anthropic provider implementation for Claude models
 */
class AnthropicProvider extends base_provider_1.BaseLLMProvider {
    constructor(config) {
        super(config);
        this.name = 'Anthropic';
        // Set default endpoint if not provided
        if (!config.endpoint) {
            config.endpoint = 'https://api.anthropic.com/v1';
        }
        // Set default model if not provided
        if (!config.model) {
            config.model = 'claude-3-haiku-20240307';
        }
    }
    async authenticate(config) {
        try {
            // Anthropic doesn't have a simple auth endpoint, so we'll make a minimal request
            const response = await fetch(`${config.endpoint}/messages`, {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey || '',
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 1,
                    messages: [
                        {
                            role: 'user',
                            content: 'test'
                        }
                    ]
                })
            });
            // Even if the request fails due to minimal content, a 400 with proper error indicates auth worked
            if (response.ok || response.status === 400) {
                return true;
            }
            return response.status !== 401 && response.status !== 403;
        }
        catch (error) {
            console.error('Anthropic authentication failed:', error);
            return false;
        }
    }
    async generateFlashcards(content, options) {
        try {
            const prompt = this.buildPrompt(content, options);
            const requestBody = {
                model: this.config.model,
                max_tokens: 2000,
                temperature: 0.7,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            };
            const response = await fetch(`${this.config.endpoint}/messages`, {
                method: 'POST',
                headers: {
                    ...this.buildHeaders(),
                    'x-api-key': this.config.apiKey || '',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                throw this.handleHttpError({ status: response.status, statusText: response.statusText }, 'generateFlashcards');
            }
            const data = await response.json();
            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('Invalid response format from Anthropic');
            }
            const flashcardResponse = this.parseFlashcardResponse(data.content[0].text, options);
            // Add metadata
            flashcardResponse.metadata = {
                tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
                model: this.config.model
            };
            return flashcardResponse;
        }
        catch (error) {
            if (error instanceof Error && 'type' in error) {
                throw error;
            }
            throw this.handleHttpError(error, 'generateFlashcards');
        }
    }
    validateConfig(config) {
        // Anthropic specific validation
        if (!super.validateConfig(config)) {
            return false;
        }
        // Validate Anthropic endpoint format
        if (!config.endpoint?.includes('anthropic.com') && !config.endpoint?.includes('localhost')) {
            return false;
        }
        // Validate model format (should be a valid Claude model)
        const validModels = ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus', 'claude-2.1', 'claude-2.0'];
        if (config.model && !validModels.some(model => config.model?.startsWith(model))) {
            console.warn(`Unknown Anthropic model: ${config.model}. Proceeding anyway.`);
        }
        return true;
    }
    buildPrompt(content, options) {
        const maxCards = options.maxCards || 5;
        const cardTypes = options.cardTypes || [types_1.CardType.OneWay];
        const tags = options.tags || [];
        let prompt = options.customPrompt || `I need you to create ${maxCards} educational flashcards from the following content. `;
        prompt += `Generate flashcards of these types: ${cardTypes.join(', ')}. `;
        if (tags.length > 0) {
            prompt += `Tag the flashcards with: ${tags.join(', ')}. `;
        }
        prompt += `

Content to create flashcards from:
${content}

Please respond with a JSON object in this exact format:
{
  "cards": [
    {
      "front": "Question or prompt text",
      "back": "Answer or explanation text", 
      "type": "oneway|bidirectional|multiline|cloze",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Card type guidelines:
- "oneway": Simple question-answer format
- "bidirectional": Can be tested in both directions  
- "multiline": Multi-line question or answer
- "cloze": Fill-in-the-blank format with ==text== to be hidden

Make sure the JSON is valid and contains exactly ${maxCards} flashcards. Focus on creating clear, concise questions that test understanding of key concepts.`;
        return prompt;
    }
    parseFlashcardResponse(content, options) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            if (!this.validateFlashcardResponse(parsed)) {
                throw new Error('Invalid flashcard response format');
            }
            // Process and validate each card
            const cards = parsed.cards.map((card) => ({
                front: card.front.trim(),
                back: card.back.trim(),
                type: this.validateCardType(card.type),
                tags: this.mergeTags(card.tags, options.tags)
            }));
            return { cards };
        }
        catch (error) {
            // Fallback: try to parse as plain text
            return this.parseAsPlainText(content, options);
        }
    }
    parseAsPlainText(content, options) {
        // Simple fallback parser for when JSON parsing fails
        const lines = content.split('\n').filter(line => line.trim());
        const cards = [];
        let currentCard = {};
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.toLowerCase().startsWith('q:') || trimmed.toLowerCase().startsWith('question:')) {
                if (currentCard.front && currentCard.back) {
                    cards.push(this.completeCard(currentCard, options));
                }
                currentCard = { front: trimmed.replace(/^(q:|question:)/i, '').trim() };
            }
            else if (trimmed.toLowerCase().startsWith('a:') || trimmed.toLowerCase().startsWith('answer:')) {
                currentCard.back = trimmed.replace(/^(a:|answer:)/i, '').trim();
            }
            else if (currentCard.front && !currentCard.back && trimmed) {
                currentCard.back = trimmed;
            }
        }
        // Add the last card if complete
        if (currentCard.front && currentCard.back) {
            cards.push(this.completeCard(currentCard, options));
        }
        return { cards };
    }
    completeCard(partial, options) {
        return {
            front: partial.front || '',
            back: partial.back || '',
            type: partial.type || options.cardTypes[0] || types_1.CardType.OneWay,
            tags: this.mergeTags(partial.tags, options.tags)
        };
    }
    validateCardType(type) {
        const validTypes = Object.values(types_1.CardType);
        return validTypes.includes(type) ? type : types_1.CardType.OneWay;
    }
    mergeTags(cardTags, optionTags) {
        const tags = new Set();
        if (cardTags) {
            cardTags.forEach(tag => tags.add(tag));
        }
        if (optionTags) {
            optionTags.forEach(tag => tags.add(tag));
        }
        return Array.from(tags);
    }
}
exports.AnthropicProvider = AnthropicProvider;
