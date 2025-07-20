import { RawFlashcard, FormattedFlashcard, CardType } from './types';

export class SpacedRepetitionFormatter {
  /**
   * Converts a RawFlashcard to the Spaced Repetition plugin format
   */
  static formatCard(card: RawFlashcard): FormattedFlashcard {
    let content = '';

    switch (card.type) {
      case CardType.OneWay:
        content = this.formatOneWayCard(card);
        break;
      case CardType.Bidirectional:
        content = this.formatBidirectionalCard(card);
        break;
      case CardType.MultiLine:
        content = this.formatMultiLineCard(card);
        break;
      case CardType.MultiLineBidirectional:
        content = this.formatMultiLineBidirectionalCard(card);
        break;
      case CardType.Cloze:
        content = this.formatClozeCard(card);
        break;
      default:
        throw new Error(`Unsupported card type: ${card.type}`);
    }

    return {
      content,
      tags: card.tags || []
    };
  }

  /**
   * Formats a one-way flashcard using :: syntax
   */
  private static formatOneWayCard(card: RawFlashcard): string {
    const front = this.cleanText(card.front);
    const back = this.cleanText(card.back);
    return `${front}::${back}`;
  }

  /**
   * Formats a bidirectional flashcard using ::: syntax
   */
  private static formatBidirectionalCard(card: RawFlashcard): string {
    const front = this.cleanText(card.front);
    const back = this.cleanText(card.back);
    return `${front}:::${back}`;
  }

  /**
   * Formats a multi-line flashcard using ? syntax
   */
  private static formatMultiLineCard(card: RawFlashcard): string {
    const front = this.cleanText(card.front);
    const back = this.cleanText(card.back);
    return `${front}?\n${back}`;
  }

  /**
   * Formats a multi-line bidirectional flashcard using ??? syntax
   */
  private static formatMultiLineBidirectionalCard(card: RawFlashcard): string {
    const front = this.cleanText(card.front);
    const back = this.cleanText(card.back);
    return `${front}???\n${back}`;
  }

  /**
   * Formats a cloze deletion flashcard using == syntax
   */
  private static formatClozeCard(card: RawFlashcard): string {
    // For cloze cards, the front should already contain the == markers
    // We just need to clean and return it
    return this.cleanText(card.front);
  }

  /**
   * Formats multiple flashcards with proper spacing
   * 
   * @param cards - Array of raw flashcards to format
   * @param tags - Global tags to apply (used for metadata but not in content)
   * @returns Formatted flashcard content as string
   */
  static formatCards(cards: RawFlashcard[], tags: string[] = []): string {
    if (cards.length === 0) {
      return '';
    }

    // Format cards without individual tags - tags are handled at file level
    const formattedCards = cards.map(card => {
      const formatted = this.formatCard(card);
      return formatted.content;
    });

    // Join cards with double newlines for proper spacing
    return formattedCards.join('\n\n');
  }

  /**
   * Cleans text by removing extra whitespace and ensuring proper formatting
   */
  private static cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n'); // Remove empty lines but preserve intentional line breaks
  }

  /**
   * Validates that a card can be properly formatted
   */
  static canFormat(card: RawFlashcard): boolean {
    try {
      this.formatCard(card);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the appropriate separator for a card type
   */
  static getSeparator(cardType: CardType): string {
    switch (cardType) {
      case CardType.OneWay:
        return '::';
      case CardType.Bidirectional:
        return ':::';
      case CardType.MultiLine:
        return '?';
      case CardType.MultiLineBidirectional:
        return '???';
      case CardType.Cloze:
        return '==';
      default:
        throw new Error(`Unknown card type: ${cardType}`);
    }
  }

  /**
   * Detects the card type from formatted content
   */
  static detectCardType(content: string): CardType | null {
    if (content.includes('???')) {
      return CardType.MultiLineBidirectional;
    } else if (content.includes(':::')) {
      return CardType.Bidirectional;
    } else if (content.includes('::')) {
      return CardType.OneWay;
    } else if (content.includes('?')) {
      return CardType.MultiLine;
    } else if (content.includes('==') && content.match(/==[^=]+==/)) {
      return CardType.Cloze;
    }

    return null;
  }
}