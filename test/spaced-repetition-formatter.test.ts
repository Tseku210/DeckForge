import { describe, it, expect } from 'vitest';
import { SpacedRepetitionFormatter } from '../spaced-repetition-formatter';
import { RawFlashcard, CardType } from '../types';

describe('SpacedRepetitionFormatter', () => {
  describe('formatCard', () => {
    it('should format one-way cards correctly', () => {
      const card: RawFlashcard = {
        front: 'What is photosynthesis?',
        back: 'The process by which plants convert light into energy',
        type: CardType.OneWay,
        tags: ['#biology']
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('What is photosynthesis?::The process by which plants convert light into energy');
      expect(result.tags).toEqual(['#biology']);
    });

    it('should format bidirectional cards correctly', () => {
      const card: RawFlashcard = {
        front: 'Photosynthesis',
        back: 'Process of converting light to energy in plants',
        type: CardType.Bidirectional,
        tags: ['#biology']
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('Photosynthesis:::Process of converting light to energy in plants');
      expect(result.tags).toEqual(['#biology']);
    });

    it('should format multi-line cards correctly', () => {
      const card: RawFlashcard = {
        front: 'What are the steps of photosynthesis?',
        back: '1. Light absorption\n2. Water splitting\n3. CO2 fixation',
        type: CardType.MultiLine,
        tags: ['#biology']
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('What are the steps of photosynthesis??\n1. Light absorption 2. Water splitting 3. CO2 fixation');
      expect(result.tags).toEqual(['#biology']);
    });

    it('should format multi-line bidirectional cards correctly', () => {
      const card: RawFlashcard = {
        front: 'Photosynthesis steps',
        back: 'Light absorption\nWater splitting\nCO2 fixation',
        type: CardType.MultiLineBidirectional,
        tags: ['#biology']
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('Photosynthesis steps???\nLight absorption Water splitting CO2 fixation');
      expect(result.tags).toEqual(['#biology']);
    });

    it('should format cloze cards correctly', () => {
      const card: RawFlashcard = {
        front: 'Plants use ==photosynthesis== to convert light into energy',
        back: 'photosynthesis',
        type: CardType.Cloze,
        tags: ['#biology']
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('Plants use ==photosynthesis== to convert light into energy');
      expect(result.tags).toEqual(['#biology']);
    });

    it('should handle cards without tags', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: CardType.OneWay
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('Question::Answer');
      expect(result.tags).toEqual([]);
    });

    it('should clean text by removing extra whitespace', () => {
      const card: RawFlashcard = {
        front: '  What is   photosynthesis?  ',
        back: '  The process by which plants convert light into energy  ',
        type: CardType.OneWay
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('What is photosynthesis?::The process by which plants convert light into energy');
    });

    it('should throw error for unsupported card type', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: 'unsupported' as CardType
      };

      expect(() => SpacedRepetitionFormatter.formatCard(card)).toThrow('Unsupported card type: unsupported');
    });
  });

  describe('formatCards', () => {
    it('should format multiple cards with proper spacing', () => {
      const cards: RawFlashcard[] = [
        {
          front: 'Question 1',
          back: 'Answer 1',
          type: CardType.OneWay,
          tags: ['#test']
        },
        {
          front: 'Question 2',
          back: 'Answer 2',
          type: CardType.Bidirectional,
          tags: ['#test']
        }
      ];

      const result = SpacedRepetitionFormatter.formatCards(cards);

      expect(result).toBe('Question 1::Answer 1\n\nQuestion 2:::Answer 2');
    });

    it('should handle empty card array', () => {
      const result = SpacedRepetitionFormatter.formatCards([]);

      expect(result).toBe('');
    });

    it('should handle single card', () => {
      const cards: RawFlashcard[] = [
        {
          front: 'Single question',
          back: 'Single answer',
          type: CardType.OneWay
        }
      ];

      const result = SpacedRepetitionFormatter.formatCards(cards);

      expect(result).toBe('Single question::Single answer');
    });
  });

  describe('canFormat', () => {
    it('should return true for valid cards', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: CardType.OneWay
      };

      expect(SpacedRepetitionFormatter.canFormat(card)).toBe(true);
    });

    it('should return false for invalid cards', () => {
      const card: RawFlashcard = {
        front: 'Question',
        back: 'Answer',
        type: 'invalid' as CardType
      };

      expect(SpacedRepetitionFormatter.canFormat(card)).toBe(false);
    });
  });

  describe('getSeparator', () => {
    it('should return correct separators for each card type', () => {
      expect(SpacedRepetitionFormatter.getSeparator(CardType.OneWay)).toBe('::');
      expect(SpacedRepetitionFormatter.getSeparator(CardType.Bidirectional)).toBe(':::');
      expect(SpacedRepetitionFormatter.getSeparator(CardType.MultiLine)).toBe('?');
      expect(SpacedRepetitionFormatter.getSeparator(CardType.MultiLineBidirectional)).toBe('???');
      expect(SpacedRepetitionFormatter.getSeparator(CardType.Cloze)).toBe('==');
    });

    it('should throw error for unknown card type', () => {
      expect(() => SpacedRepetitionFormatter.getSeparator('unknown' as CardType))
        .toThrow('Unknown card type: unknown');
    });
  });

  describe('detectCardType', () => {
    it('should detect one-way cards', () => {
      const content = 'Question::Answer';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBe(CardType.OneWay);
    });

    it('should detect bidirectional cards', () => {
      const content = 'Term:::Definition';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBe(CardType.Bidirectional);
    });

    it('should detect multi-line cards', () => {
      const content = 'Question?\nAnswer';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBe(CardType.MultiLine);
    });

    it('should detect multi-line bidirectional cards', () => {
      const content = 'Term???\nDefinition';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBe(CardType.MultiLineBidirectional);
    });

    it('should detect cloze cards', () => {
      const content = 'This is a ==cloze== deletion';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBe(CardType.Cloze);
    });

    it('should prioritize multi-line bidirectional over bidirectional', () => {
      const content = 'Term???Definition:::Also';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBe(CardType.MultiLineBidirectional);
    });

    it('should prioritize bidirectional over one-way', () => {
      const content = 'Term:::Definition::Also';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBe(CardType.Bidirectional);
    });

    it('should return null for unrecognized content', () => {
      const content = 'Just plain text without any markers';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBeNull();
    });

    it('should not detect invalid cloze format', () => {
      const content = 'This has == but not proper == format';
      expect(SpacedRepetitionFormatter.detectCardType(content)).toBe(CardType.Cloze);
    });
  });

  describe('text cleaning', () => {
    it('should remove excessive whitespace', () => {
      const card: RawFlashcard = {
        front: 'Question   with    extra     spaces',
        back: 'Answer\n\n\nwith\n\n\nextra\n\n\nlines',
        type: CardType.OneWay
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('Question with extra spaces::Answer with extra lines');
    });

    it('should preserve intentional line breaks', () => {
      const card: RawFlashcard = {
        front: 'Multi-line\nquestion',
        back: 'Multi-line\nanswer',
        type: CardType.MultiLine
      };

      const result = SpacedRepetitionFormatter.formatCard(card);

      expect(result.content).toBe('Multi-line question?\nMulti-line answer');
    });
  });
});