import { describe, it, expect } from 'vitest';
import { FlashcardValidator, RawFlashcard, FormattedFlashcard, CardType } from '../types';

describe('FlashcardValidator', () => {
  describe('validateRawFlashcard', () => {
    it('should validate correct flashcard', () => {
      const card: RawFlashcard = {
        front: 'What is photosynthesis?',
        back: 'Process of converting light to energy',
        type: CardType.OneWay,
        tags: ['#biology']
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject card with empty front', () => {
      const card: RawFlashcard = {
        front: '',
        back: 'Answer',
        type: CardType.OneWay
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Front content is required and cannot be empty');
    });

    it('should reject card with whitespace-only front', () => {
      const card: RawFlashcard = {
        front: '   ',
        back: 'Answer',
        type: CardType.OneWay
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Front content is required and cannot be empty');
    });

    it('should reject card with empty back', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: '',
        type: CardType.OneWay
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Back content is required and cannot be empty');
    });

    it('should reject card with whitespace-only back', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: '   ',
        type: CardType.OneWay
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Back content is required and cannot be empty');
    });

    it('should reject card with invalid type', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: 'invalid' as CardType
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid card type: invalid');
    });

    it('should validate cloze card with proper format', () => {
      const card: RawFlashcard = {
        front: 'Plants use ==photosynthesis== to convert light',
        back: 'photosynthesis',
        type: CardType.Cloze
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject cloze card without proper markers', () => {
      const card: RawFlashcard = {
        front: 'Plants use photosynthesis to convert light',
        back: 'photosynthesis',
        type: CardType.Cloze
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cloze cards must contain text wrapped in == markers');
    });

    it('should reject cloze card with incomplete markers', () => {
      const card: RawFlashcard = {
        front: 'Plants use ==photosynthesis to convert light',
        back: 'photosynthesis',
        type: CardType.Cloze
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cloze cards must contain text wrapped in == markers');
    });

    it('should reject cloze card with empty markers', () => {
      const card: RawFlashcard = {
        front: 'Plants use ==== to convert light',
        back: 'photosynthesis',
        type: CardType.Cloze
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cloze cards must contain text wrapped in == markers');
    });

    it('should validate tags with proper format', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: CardType.OneWay,
        tags: ['#biology', '#flashcards', '#study']
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject tags without # symbol', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: CardType.OneWay,
        tags: ['biology', '#flashcards']
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tag "biology" must start with #');
    });

    it('should reject tags with spaces', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: CardType.OneWay,
        tags: ['#flash cards', '#biology']
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tag "#flash cards" cannot contain spaces');
    });

    it('should handle card without tags', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: CardType.OneWay
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple errors', () => {
      const card: RawFlashcard = {
        front: '',
        back: '',
        type: 'invalid' as CardType,
        tags: ['invalid-tag', '#valid']
      };

      const result = FlashcardValidator.validateRawFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Front content is required and cannot be empty');
      expect(result.errors).toContain('Back content is required and cannot be empty');
      expect(result.errors).toContain('Invalid card type: invalid');
      expect(result.errors).toContain('Tag "invalid-tag" must start with #');
    });
  });

  describe('validateFormattedFlashcard', () => {
    it('should validate correct formatted flashcard', () => {
      const card: FormattedFlashcard = {
        content: 'Question::Answer',
        tags: ['#biology']
      };

      const result = FlashcardValidator.validateFormattedFlashcard(card);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const card: FormattedFlashcard = {
        content: '',
        tags: []
      };

      const result = FlashcardValidator.validateFormattedFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Formatted content cannot be empty');
    });

    it('should reject whitespace-only content', () => {
      const card: FormattedFlashcard = {
        content: '   ',
        tags: []
      };

      const result = FlashcardValidator.validateFormattedFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Formatted content cannot be empty');
    });

    it('should validate different spaced repetition syntaxes', () => {
      const testCases = [
        'Question::Answer',
        'Term:::Definition',
        'Question?\nAnswer',
        'Text with ==cloze== deletion'
      ];

      testCases.forEach(content => {
        const card: FormattedFlashcard = { content, tags: [] };
        const result = FlashcardValidator.validateFormattedFlashcard(card);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject content without valid syntax', () => {
      const card: FormattedFlashcard = {
        content: 'Just plain text without any markers',
        tags: []
      };

      const result = FlashcardValidator.validateFormattedFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Formatted content must contain valid spaced repetition syntax');
    });

    it('should reject invalid tags', () => {
      const card: FormattedFlashcard = {
        content: 'Question::Answer',
        tags: ['invalid-tag', '#valid']
      };

      const result = FlashcardValidator.validateFormattedFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tag "invalid-tag" must start with #');
    });

    it('should reject tags with spaces', () => {
      const card: FormattedFlashcard = {
        content: 'Question::Answer',
        tags: ['#flash cards']
      };

      const result = FlashcardValidator.validateFormattedFlashcard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tag "#flash cards" cannot contain spaces');
    });
  });

  describe('validateFlashcardArray', () => {
    it('should validate array of correct flashcards', () => {
      const cards: RawFlashcard[] = [
        {
          front: 'Question 1',
          back: 'Answer 1',
          type: CardType.OneWay
        },
        {
          front: 'Question 2',
          back: 'Answer 2',
          type: CardType.Bidirectional
        }
      ];

      const result = FlashcardValidator.validateFlashcardArray(cards);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-array input', () => {
      const result = FlashcardValidator.validateFlashcardArray('not an array' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cards must be an array');
    });

    it('should reject empty array', () => {
      const result = FlashcardValidator.validateFlashcardArray([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one flashcard is required');
    });

    it('should validate each card in array', () => {
      const cards: RawFlashcard[] = [
        {
          front: 'Valid question',
          back: 'Valid answer',
          type: CardType.OneWay
        },
        {
          front: '',
          back: 'Invalid - no front',
          type: CardType.OneWay
        },
        {
          front: 'Invalid - no back',
          back: '',
          type: CardType.OneWay
        }
      ];

      const result = FlashcardValidator.validateFlashcardArray(cards);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some(e => e.includes('Card 2:'))).toBe(true);
      expect(result.errors.some(e => e.includes('Card 3:'))).toBe(true);
    });

    it('should handle mixed valid and invalid cards', () => {
      const cards: RawFlashcard[] = [
        {
          front: 'Valid question',
          back: 'Valid answer',
          type: CardType.OneWay
        },
        {
          front: '',
          back: 'Invalid',
          type: CardType.OneWay
        }
      ];

      const result = FlashcardValidator.validateFlashcardArray(cards);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Card 2: Front content is required and cannot be empty');
    });
  });

  describe('CardType enum', () => {
    it('should have all expected card types', () => {
      expect(CardType.OneWay).toBe('oneway');
      expect(CardType.Bidirectional).toBe('bidirectional');
      expect(CardType.MultiLine).toBe('multiline');
      expect(CardType.MultiLineBidirectional).toBe('multiline-bidirectional');
      expect(CardType.Cloze).toBe('cloze');
    });

    it('should be usable in validation', () => {
      const validTypes = Object.values(CardType);
      expect(validTypes).toContain('oneway');
      expect(validTypes).toContain('bidirectional');
      expect(validTypes).toContain('multiline');
      expect(validTypes).toContain('multiline-bidirectional');
      expect(validTypes).toContain('cloze');
    });
  });
});