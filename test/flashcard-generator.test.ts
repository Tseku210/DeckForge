import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlashcardGenerator, GenerationResult } from '../flashcard-generator';
import { LLMProvider, RawFlashcard, CardType, GenerationOptions, FlashcardResponse, LLMError } from '../types';

// Mock SpacedRepetitionFormatter
vi.mock('../spaced-repetition-formatter', () => ({
  SpacedRepetitionFormatter: {
    formatCards: vi.fn().mockReturnValue('Question::Answer\n\nTerm:::Definition')
  }
}));

// Mock Notice
vi.mock('obsidian', () => ({
  Notice: vi.fn()
}));

describe('FlashcardGenerator', () => {
  let mockProvider: LLMProvider;
  let generator: FlashcardGenerator;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProvider = {
      name: 'MockProvider',
      authenticate: vi.fn().mockResolvedValue(true),
      generateFlashcards: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      updateConfig: vi.fn(),
      getConfig: vi.fn().mockReturnValue({ apiKey: 'test-key' })
    };

    generator = new FlashcardGenerator(mockProvider);
  });

  describe('generateFlashcards', () => {
    it('should generate flashcards successfully', async () => {
      const mockResponse: FlashcardResponse = {
        cards: [
          {
            front: 'What is photosynthesis?',
            back: 'Process of converting light to energy',
            type: CardType.OneWay,
            tags: ['#biology']
          }
        ],
        metadata: { tokensUsed: 100, model: 'gpt-3.5-turbo' }
      };

      mockProvider.generateFlashcards = vi.fn().mockResolvedValue(mockResponse);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay],
        maxCards: 5,
        tags: ['#biology']
      };

      const result = await generator.generateFlashcards('Content about photosynthesis', options);

      expect(result.success).toBe(true);
      expect(result.formattedCards).toBeDefined();
      expect(result.rawCards).toHaveLength(1);
      expect(result.metadata?.cardsGenerated).toBe(1);
      expect(result.metadata?.tokensUsed).toBe(100);
    });

    it('should reject empty content', async () => {
      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      const result = await generator.generateFlashcards('', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content cannot be empty');
    });

    it('should reject very short content', async () => {
      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      const result = await generator.generateFlashcards('Short', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content is too short');
    });

    it('should reject missing card types', async () => {
      const options: GenerationOptions = {
        cardTypes: []
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one card type must be specified');
    });

    it('should reject invalid card types', async () => {
      const options: GenerationOptions = {
        cardTypes: ['invalid' as CardType]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid card type: invalid');
    });

    it('should handle LLM response with no cards', async () => {
      mockProvider.generateFlashcards = vi.fn().mockResolvedValue({ cards: [] });

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('LLM did not generate any flashcards');
    });

    it('should limit cards when maxCards is specified', async () => {
      const mockResponse: FlashcardResponse = {
        cards: [
          { front: 'Q1', back: 'A1', type: CardType.OneWay },
          { front: 'Q2', back: 'A2', type: CardType.OneWay },
          { front: 'Q3', back: 'A3', type: CardType.OneWay }
        ]
      };

      mockProvider.generateFlashcards = vi.fn().mockResolvedValue(mockResponse);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay],
        maxCards: 2
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(true);
      expect(result.rawCards).toHaveLength(2);
    });

    it('should convert card types when needed', async () => {
      const mockResponse: FlashcardResponse = {
        cards: [
          { front: 'Question', back: 'Answer', type: CardType.Bidirectional }
        ]
      };

      mockProvider.generateFlashcards = vi.fn().mockResolvedValue(mockResponse);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay] // Different from response
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(true);
      expect(result.rawCards![0].type).toBe(CardType.OneWay);
    });

    it('should handle authentication errors', async () => {
      const authError: LLMError = {
        type: 'authentication',
        message: 'Invalid API key'
      };

      mockProvider.generateFlashcards = vi.fn().mockRejectedValue(authError);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should handle network errors', async () => {
      const networkError: LLMError = {
        type: 'network',
        message: 'Connection timeout'
      };

      mockProvider.generateFlashcards = vi.fn().mockRejectedValue(networkError);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error occurred');
    });

    it('should handle invalid response errors', async () => {
      const responseError: LLMError = {
        type: 'invalid_response',
        message: 'Malformed JSON'
      };

      mockProvider.generateFlashcards = vi.fn().mockRejectedValue(responseError);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid response');
    });

    it('should handle generic errors', async () => {
      mockProvider.generateFlashcards = vi.fn().mockRejectedValue(new Error('Generic error'));

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Generic error');
    });
  });

  describe('provider management', () => {
    it('should set and get provider', () => {
      const newProvider: LLMProvider = {
        name: 'NewProvider',
        authenticate: vi.fn(),
        generateFlashcards: vi.fn(),
        validateConfig: vi.fn(),
        updateConfig: vi.fn(),
        getConfig: vi.fn()
      };

      generator.setProvider(newProvider);
      expect(generator.getProvider()).toBe(newProvider);
    });

    it('should validate provider successfully', async () => {
      const result = await generator.validateProvider();

      expect(result.isValid).toBe(true);
      expect(mockProvider.validateConfig).toHaveBeenCalled();
      expect(mockProvider.authenticate).toHaveBeenCalled();
    });

    it('should fail validation for invalid config', async () => {
      mockProvider.validateConfig = vi.fn().mockReturnValue(false);

      const result = await generator.validateProvider();

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('configuration is invalid');
    });

    it('should fail validation for authentication failure', async () => {
      mockProvider.authenticate = vi.fn().mockResolvedValue(false);

      const result = await generator.validateProvider();

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('authentication failed');
    });

    it('should handle validation errors', async () => {
      mockProvider.authenticate = vi.fn().mockRejectedValue(new Error('Auth error'));

      const result = await generator.validateProvider();

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('validation failed');
    });
  });

  describe('card type conversion', () => {
    it('should convert to cloze only when appropriate', async () => {
      const mockResponse: FlashcardResponse = {
        cards: [
          { front: 'This is ==cloze== text', back: 'cloze', type: CardType.OneWay }
        ]
      };

      mockProvider.generateFlashcards = vi.fn().mockResolvedValue(mockResponse);

      const options: GenerationOptions = {
        cardTypes: [CardType.Cloze]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(true);
      expect(result.rawCards![0].type).toBe(CardType.Cloze);
    });

    it('should not convert to cloze without markers', async () => {
      const mockResponse: FlashcardResponse = {
        cards: [
          { front: 'Regular question', back: 'Regular answer', type: CardType.OneWay }
        ]
      };

      mockProvider.generateFlashcards = vi.fn().mockResolvedValue(mockResponse);

      const options: GenerationOptions = {
        cardTypes: [CardType.Cloze]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid flashcards could be generated');
    });
  });

  describe('card validation', () => {
    it('should filter out invalid cards', async () => {
      const mockResponse: FlashcardResponse = {
        cards: [
          { front: 'Valid question', back: 'Valid answer', type: CardType.OneWay },
          { front: '', back: 'Invalid - no front', type: CardType.OneWay },
          { front: 'Invalid - no back', back: '', type: CardType.OneWay }
        ]
      };

      mockProvider.generateFlashcards = vi.fn().mockResolvedValue(mockResponse);

      const options: GenerationOptions = {
        cardTypes: [CardType.OneWay]
      };

      const result = await generator.generateFlashcards('Valid content here', options);

      expect(result.success).toBe(true);
      expect(result.rawCards).toHaveLength(1);
      expect(result.rawCards![0].front).toBe('Valid question');
    });
  });
});