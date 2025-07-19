// LLM Provider Interfaces
export interface LLMProvider {
  name: string;
  authenticate(config: ProviderConfig): Promise<boolean>;
  generateFlashcards(content: string, options: GenerationOptions): Promise<FlashcardResponse>;
  validateConfig(config: ProviderConfig): boolean;
  updateConfig(config: ProviderConfig): void;
  getConfig(): Partial<ProviderConfig>;
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  customHeaders?: Record<string, string>;
}

export interface GenerationOptions {
  maxCards?: number;
  cardTypes: CardType[];
  customPrompt?: string;
  tags?: string[];
}

export interface FlashcardResponse {
  cards: RawFlashcard[];
  metadata?: {
    tokensUsed?: number;
    model?: string;
  };
}

// Flashcard Data Models
export interface RawFlashcard {
  front: string;
  back: string;
  type: CardType;
  tags?: string[];
}

export enum CardType {
  OneWay = 'oneway',
  Bidirectional = 'bidirectional',
  MultiLine = 'multiline',
  MultiLineBidirectional = 'multiline-bidirectional',
  Cloze = 'cloze'
}

export interface FormattedFlashcard {
  content: string;
  tags: string[];
}

// Validation functions for flashcard data
export class FlashcardValidator {
  static validateRawFlashcard(card: RawFlashcard): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!card.front || card.front.trim().length === 0) {
      errors.push('Front content is required and cannot be empty');
    }

    if (!card.back || card.back.trim().length === 0) {
      errors.push('Back content is required and cannot be empty');
    }

    // Validate card type
    if (!Object.values(CardType).includes(card.type)) {
      errors.push(`Invalid card type: ${card.type}`);
    }

    // Validate cloze cards have proper format
    if (card.type === CardType.Cloze) {
      if (!card.front.includes('==') || !card.front.match(/==[^=]+==/)) {
        errors.push('Cloze cards must contain text wrapped in == markers');
      }
    }

    // Validate tags format if present
    if (card.tags) {
      for (const tag of card.tags) {
        if (!tag.startsWith('#')) {
          errors.push(`Tag "${tag}" must start with #`);
        }
        if (tag.includes(' ')) {
          errors.push(`Tag "${tag}" cannot contain spaces`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateFormattedFlashcard(card: FormattedFlashcard): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check content is not empty
    if (!card.content || card.content.trim().length === 0) {
      errors.push('Formatted content cannot be empty');
    }

    // Validate tags format
    for (const tag of card.tags) {
      if (!tag.startsWith('#')) {
        errors.push(`Tag "${tag}" must start with #`);
      }
      if (tag.includes(' ')) {
        errors.push(`Tag "${tag}" cannot contain spaces`);
      }
    }

    // Check if content contains valid spaced repetition syntax
    const hasValidSyntax =
      card.content.includes('::') ||  // One-way
      card.content.includes(':::') || // Bidirectional
      card.content.includes('?') ||   // Multi-line
      card.content.includes('==');    // Cloze

    if (!hasValidSyntax) {
      errors.push('Formatted content must contain valid spaced repetition syntax (::, :::, ?, or ==)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateFlashcardArray(cards: RawFlashcard[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(cards)) {
      errors.push('Cards must be an array');
      return { isValid: false, errors };
    }

    if (cards.length === 0) {
      errors.push('At least one flashcard is required');
      return { isValid: false, errors };
    }

    // Validate each card
    cards.forEach((card, index) => {
      const validation = this.validateRawFlashcard(card);
      if (!validation.isValid) {
        errors.push(`Card ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Plugin Settings Interface
export interface FlashcardPluginSettings {
  providers: Record<string, ProviderConfig>;
  activeProvider: string;
  defaultOptions: GenerationOptions;
  outputPreferences: {
    defaultPlacement: 'cursor' | 'bottom' | 'separate-file';
    fileNamingPattern: string;
    defaultTags: string[];
  };
  promptTemplates: Record<string, string>;
}

// Error Handling
export interface LLMError {
  type: 'authentication' | 'network' | 'invalid_response' | 'unknown';
  message: string;
  details?: any;
}

// Default Settings
export const DEFAULT_SETTINGS: FlashcardPluginSettings = {
  providers: {},
  activeProvider: '',
  defaultOptions: {
    cardTypes: [CardType.OneWay, CardType.Bidirectional],
    tags: ['#flashcards']
  },
  outputPreferences: {
    defaultPlacement: 'cursor',
    fileNamingPattern: '{filename}-fcards.md',
    defaultTags: ['#flashcards']
  },
  promptTemplates: {
    default: `Generate flashcards from the following content. Create clear, concise questions and answers that would be useful for studying. Format each flashcard with a front (question) and back (answer).

Content:
{content}

Please generate an appropriate number of flashcards based on the content length and complexity in the following format:
- Front: [question]
- Back: [answer]
- Type: [oneway/bidirectional/cloze]`
  }
};