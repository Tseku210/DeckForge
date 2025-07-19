import { Notice } from 'obsidian';
import {
  LLMProvider,
  RawFlashcard,
  FormattedFlashcard,
  GenerationOptions,
  FlashcardResponse,
  CardType,
  LLMError,
  FlashcardValidator
} from './types';
import { SpacedRepetitionFormatter } from './spaced-repetition-formatter';

export interface GenerationResult {
  success: boolean;
  formattedCards?: string;
  rawCards?: RawFlashcard[];
  error?: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    cardsGenerated: number;
  };
}

export class FlashcardGenerator {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  /**
   * Main method to generate flashcards from content
   */
  async generateFlashcards(
    content: string,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      // Validate input
      const inputValidation = this.validateInput(content, options);
      if (!inputValidation.isValid) {
        return {
          success: false,
          error: inputValidation.error
        };
      }

      // Generate flashcards using LLM provider
      const llmResponse = await this.provider.generateFlashcards(content, options);

      // Process and validate LLM response
      const processedCards = await this.processLLMResponse(llmResponse, options);

      if (!processedCards.success) {
        return processedCards;
      }

      // Format cards using SpacedRepetitionFormatter
      const formattedContent = SpacedRepetitionFormatter.formatCards(
        processedCards.rawCards!,
        options.tags || []
      );

      return {
        success: true,
        formattedCards: formattedContent,
        rawCards: processedCards.rawCards,
        metadata: {
          tokensUsed: llmResponse.metadata?.tokensUsed,
          model: llmResponse.metadata?.model,
          cardsGenerated: processedCards.rawCards!.length
        }
      };

    } catch (error) {
      console.error('Error generating flashcards:', error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Validates input parameters
   */
  private validateInput(content: string, options: GenerationOptions): { isValid: boolean; error?: string } {
    // Check content
    if (!content || content.trim().length === 0) {
      return {
        isValid: false,
        error: 'Content cannot be empty. Please provide some text to generate flashcards from.'
      };
    }

    if (content.trim().length < 10) {
      return {
        isValid: false,
        error: 'Content is too short. Please provide more substantial content for flashcard generation.'
      };
    }

    // Check options
    if (!options.cardTypes || options.cardTypes.length === 0) {
      return {
        isValid: false,
        error: 'At least one card type must be specified.'
      };
    }

    // Validate card types
    for (const cardType of options.cardTypes) {
      if (!Object.values(CardType).includes(cardType)) {
        return {
          isValid: false,
          error: `Invalid card type: ${cardType}`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Processes the LLM response and validates flashcards
   */
  private async processLLMResponse(
    response: FlashcardResponse,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      // Check if response has cards
      if (!response.cards || response.cards.length === 0) {
        return {
          success: false,
          error: 'LLM did not generate any flashcards. Try rephrasing your content or adjusting the prompt.'
        };
      }

      // Validate each flashcard
      const validatedCards: RawFlashcard[] = [];
      const errors: string[] = [];

      for (let i = 0; i < response.cards.length; i++) {
        const card = response.cards[i];
        const validation = FlashcardValidator.validateRawFlashcard(card);

        if (validation.isValid) {
          // Ensure card type is allowed
          if (options.cardTypes.includes(card.type)) {
            validatedCards.push(card);
          } else {
            // Try to convert to an allowed type
            const convertedCard = this.convertCardType(card, options.cardTypes[0]);
            if (convertedCard) {
              validatedCards.push(convertedCard);
            }
          }
        } else {
          errors.push(`Card ${i + 1}: ${validation.errors.join(', ')}`);
        }
      }

      // Check if we have any valid cards
      if (validatedCards.length === 0) {
        return {
          success: false,
          error: `No valid flashcards could be generated. Errors: ${errors.join('; ')}`
        };
      }

      // Limit cards if maxCards is specified
      if (options.maxCards && validatedCards.length > options.maxCards) {
        validatedCards.splice(options.maxCards);
      }

      // Show warnings for invalid cards if any
      if (errors.length > 0) {
        new Notice(`Some flashcards had issues and were skipped: ${errors.length} cards`);
      }

      return {
        success: true,
        rawCards: validatedCards
      };

    } catch (error) {
      return {
        success: false,
        error: `Error processing LLM response: ${error.message}`
      };
    }
  }

  /**
   * Converts a card to a different type if possible
   */
  private convertCardType(card: RawFlashcard, targetType: CardType): RawFlashcard | null {
    try {
      // Simple conversion logic - mainly for fallback scenarios
      switch (targetType) {
        case CardType.OneWay:
          return { ...card, type: CardType.OneWay };
        case CardType.Bidirectional:
          return { ...card, type: CardType.Bidirectional };
        case CardType.MultiLine:
          return { ...card, type: CardType.MultiLine };
        case CardType.MultiLineBidirectional:
          return { ...card, type: CardType.MultiLineBidirectional };
        case CardType.Cloze:
          // Only convert to cloze if the content already has cloze markers
          if (card.front.includes('==') && card.front.match(/==[^=]+==/)) {
            return { ...card, type: CardType.Cloze };
          }
          return null;
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Handles different types of errors and returns user-friendly messages
   */
  private handleError(error: any): string {
    if (error.type) {
      // Handle LLMError types
      switch (error.type) {
        case 'authentication':
          return 'Authentication failed. Please check your API key configuration.';
        case 'network':
          return 'Network error occurred. Please check your internet connection and try again.';
        case 'invalid_response':
          return 'The LLM returned an invalid response. Please try again or adjust your prompt.';
        default:
          return `LLM Error: ${error.message}`;
      }
    }

    // Handle generic errors
    if (error.message) {
      return error.message;
    }

    return 'An unexpected error occurred while generating flashcards.';
  }

  /**
   * Updates the LLM provider
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  /**
   * Gets the current provider
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Validates that the current provider is properly configured
   */
  async validateProvider(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const config = this.provider.getConfig();

      if (!this.provider.validateConfig(config)) {
        return {
          isValid: false,
          error: 'Provider configuration is invalid. Please check your settings.'
        };
      }

      // Test authentication
      const authResult = await this.provider.authenticate(config);
      if (!authResult) {
        return {
          isValid: false,
          error: 'Provider authentication failed. Please check your API key and settings.'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Provider validation failed: ${error.message}`
      };
    }
  }
}