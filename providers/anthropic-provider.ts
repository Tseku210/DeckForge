import { BaseLLMProvider } from './base-provider';
import { ProviderConfig, GenerationOptions, FlashcardResponse, RawFlashcard, CardType, LLMError } from '../types';

/**
 * Anthropic provider implementation for Claude models
 */
export class AnthropicProvider extends BaseLLMProvider {
  name = 'Anthropic';

  constructor(config: ProviderConfig) {
    super(config);
    // Set default endpoint if not provided
    if (!config.endpoint) {
      config.endpoint = 'https://api.anthropic.com/v1';
    }
    // Set default model if not provided
    if (!config.model) {
      config.model = 'claude-3-haiku-20240307';
    }
  }

  async authenticate(config: ProviderConfig): Promise<boolean> {
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
    } catch (error) {
      console.error('Anthropic authentication failed:', error);
      return false;
    }
  }

  async generateFlashcards(content: string, options: GenerationOptions): Promise<FlashcardResponse> {
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
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error as LLMError;
      }
      throw this.handleHttpError(error, 'generateFlashcards');
    }
  }

  validateConfig(config: ProviderConfig): boolean {
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

  private buildPrompt(content: string, options: GenerationOptions): string {
    const maxCards = options.maxCards || 5;
    const cardTypes = options.cardTypes || [CardType.OneWay];
    const tags = options.tags || [];

    let prompt = options.customPrompt || `I need you to create ${maxCards} educational flashcards from the following content. `;

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

Make sure the JSON is valid and contains exactly ${maxCards} flashcards.`;

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