/**
 * OpenAI Provider Module
 * 
 * This module provides the implementation for the OpenAI provider,
 * supporting GPT-3.5, GPT-4, and other OpenAI models.
 * 
 * @module providers/openai-provider
 */

import { BaseLLMProvider } from './base-provider';
import { ProviderConfig, GenerationOptions, FlashcardResponse, RawFlashcard, CardType, LLMError } from '../types';

/**
 * OpenAI provider implementation for GPT models
 * 
 * Supports:
 * - GPT-3.5 Turbo
 * - GPT-4
 * - GPT-4 Turbo
 * - GPT-4o
 * 
 * Uses the OpenAI Chat Completions API to generate flashcards.
 */
export class OpenAIProvider extends BaseLLMProvider {
  name = 'OpenAI';

  constructor(config: ProviderConfig) {
    super(config);
    // Set default endpoint if not provided
    if (!config.endpoint) {
      config.endpoint = 'https://api.openai.com/v1';
    }
    // Set default model if not provided
    if (!config.model) {
      config.model = 'gpt-3.5-turbo';
    }
  }

  async authenticate(config: ProviderConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.endpoint}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('OpenAI authentication failed:', error);
      return false;
    }
  }

  async generateFlashcards(content: string, options: GenerationOptions): Promise<FlashcardResponse> {
    try {
      const prompt = this.buildPrompt(content, options);
      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates educational flashcards. Always respond with valid JSON containing an array of flashcard objects.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      };

      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          ...this.buildHeaders(),
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw this.handleHttpError({ status: response.status, statusText: response.statusText }, 'generateFlashcards');
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI');
      }

      const flashcardResponse = this.parseFlashcardResponse(data.choices[0].message.content, options);

      // Add metadata
      flashcardResponse.metadata = {
        tokensUsed: data.usage?.total_tokens,
        model: this.config.model
      };

      return flashcardResponse;
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error as LLMError;
      }
      throw this.handleHttpError(error, 'generateFlashcards');
    }
  }

  validateConfig(config: ProviderConfig): boolean {
    // OpenAI specific validation
    if (!super.validateConfig(config)) {
      return false;
    }

    // Validate OpenAI endpoint format
    if (!config.endpoint?.includes('openai.com') && !config.endpoint?.includes('localhost')) {
      return false;
    }

    // Validate model format (should be a valid OpenAI model)
    const validModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
    if (config.model && !validModels.some(model => config.model?.startsWith(model))) {
      console.warn(`Unknown OpenAI model: ${config.model}. Proceeding anyway.`);
    }

    return true;
  }

  private buildPrompt(content: string, options: GenerationOptions): string {
    const maxCards = options.maxCards;
    const cardTypes = options.cardTypes || [CardType.OneWay];
    const tags = options.tags || [];

    let prompt = options.customPrompt || `Create ${maxCards} educational flashcards from the following content. `;

    prompt += `Generate flashcards of these types: ${cardTypes.join(', ')}. `;

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
      "tags": ${tags.length > 0 ? JSON.stringify(tags) : '[]'}
    }
  ]
}

IMPORTANT INSTRUCTIONS:
- Use EXACTLY the tags provided: ${tags.length > 0 ? tags.join(', ') : 'no tags'}
- Do NOT create or add any other tags beyond those specified
- Each flashcard should have the same tags array: ${JSON.stringify(tags)}
- Focus on creating clear, concise questions that test understanding of key concepts

Card type guidelines:
- "oneway": Simple question-answer format
- "bidirectional": Can be tested in both directions
- "multiline": Multi-line question or answer
- "cloze": Fill-in-the-blank format with ==text== to be hidden

Make sure the JSON is valid and contains ${maxCards ? 'exactly ' + maxCards : 'thorough'} flashcards.`;

    return prompt;
  }

  private parseFlashcardResponse(content: string, options: GenerationOptions): FlashcardResponse {
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
      const cards: RawFlashcard[] = parsed.cards.map((card: any) => ({
        front: card.front.trim(),
        back: card.back.trim(),
        type: this.validateCardType(card.type),
        tags: this.mergeTags(card.tags, options.tags)
      }));

      return { cards };
    } catch (error) {
      // Fallback: try to parse as plain text
      return this.parseAsPlainText(content, options);
    }
  }

  private parseAsPlainText(content: string, options: GenerationOptions): FlashcardResponse {
    // Simple fallback parser for when JSON parsing fails
    const lines = content.split('\n').filter(line => line.trim());
    const cards: RawFlashcard[] = [];

    let currentCard: Partial<RawFlashcard> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().startsWith('q:') || trimmed.toLowerCase().startsWith('question:')) {
        if (currentCard.front && currentCard.back) {
          cards.push(this.completeCard(currentCard, options));
        }
        currentCard = { front: trimmed.replace(/^(q:|question:)/i, '').trim() };
      } else if (trimmed.toLowerCase().startsWith('a:') || trimmed.toLowerCase().startsWith('answer:')) {
        currentCard.back = trimmed.replace(/^(a:|answer:)/i, '').trim();
      } else if (currentCard.front && !currentCard.back && trimmed) {
        currentCard.back = trimmed;
      }
    }

    // Add the last card if complete
    if (currentCard.front && currentCard.back) {
      cards.push(this.completeCard(currentCard, options));
    }

    return { cards };
  }

  private completeCard(partial: Partial<RawFlashcard>, options: GenerationOptions): RawFlashcard {
    return {
      front: partial.front || '',
      back: partial.back || '',
      type: partial.type || options.cardTypes[0] || CardType.OneWay,
      tags: this.mergeTags(partial.tags, options.tags)
    };
  }

  private validateCardType(type: string): CardType {
    const validTypes = Object.values(CardType);
    return validTypes.includes(type as CardType) ? type as CardType : CardType.OneWay;
  }

  private mergeTags(cardTags?: string[], optionTags?: string[]): string[] {
    const tags = new Set<string>();

    if (cardTags) {
      cardTags.forEach(tag => {
        // Ensure tag has '#' prefix
        const cleanTag = tag.replace(/^#+/, '');
        if (cleanTag.length > 0) {
          tags.add(`#${cleanTag}`);
        }
      });
    }

    if (optionTags) {
      optionTags.forEach(tag => {
        // Ensure tag has '#' prefix
        const cleanTag = tag.replace(/^#+/, '');
        if (cleanTag.length > 0) {
          tags.add(`#${cleanTag}`);
        }
      });
    }

    return Array.from(tags);
  }
}