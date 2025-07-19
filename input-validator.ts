import { ProviderConfig, GenerationOptions, CardType } from './types';
import { ErrorHandler, ValidationResult } from './error-handler';

/**
 * Comprehensive input validation system for the LLM Flashcard Generator plugin
 * Validates content, provider configuration, and generation options
 */
export class InputValidator {

  /**
   * Validate note content for flashcard generation
   */
  static validateNoteContent(content: string): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if content is a string
    if (typeof content !== 'string') {
      errors.push('Content must be provided as a string');
      return { isValid: false, errors, warnings, suggestions };
    }

    const trimmedContent = content.trim();

    // Check if content is empty
    if (trimmedContent.length === 0) {
      errors.push('Note content is empty');
      suggestions.push('Add some educational content to your note before generating flashcards');
      return { isValid: false, errors, warnings, suggestions };
    }

    // Check minimum content length
    const wordCount = this.countWords(trimmedContent);
    if (wordCount < 5) {
      errors.push('Content is too short for meaningful flashcard generation');
      suggestions.push('Add at least a few sentences of educational content');
      return { isValid: false, errors, warnings, suggestions };
    }

    // Warnings for content quality
    if (wordCount < 20) {
      warnings.push('Content is quite short - you may get limited flashcards');
      suggestions.push('Consider adding more detailed content for better flashcard generation');
    }

    if (wordCount > 5000) {
      warnings.push('Content is very long - generation may take longer');
      suggestions.push('Consider breaking large notes into smaller sections');
    }

    // Check for meaningful content (not just formatting)
    const cleanContent = this.stripMarkdown(trimmedContent);
    const meaningfulWordCount = this.countWords(cleanContent);

    if (meaningfulWordCount < wordCount * 0.3) {
      warnings.push('Content appears to be mostly formatting with limited text');
      suggestions.push('Ensure your note contains substantial educational content, not just formatting');
    }

    // Check for educational indicators
    const hasEducationalContent = this.hasEducationalIndicators(cleanContent);
    if (!hasEducationalContent) {
      warnings.push('Content may not be well-suited for flashcard generation');
      suggestions.push('Educational content with concepts, definitions, or facts works best for flashcards');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metadata: {
        wordCount,
        meaningfulWordCount,
        hasEducationalContent
      }
    };
  }

  /**
   * Validate provider configuration before generation
   */
  static validateProviderConfig(config: ProviderConfig, providerName: string): ValidationResult {
    return ErrorHandler.validateProviderConfiguration(config, providerName);
  }

  /**
   * Validate generation options
   */
  static validateGenerationOptions(options: GenerationOptions): GenerationOptionsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate card types
    if (!options.cardTypes || !Array.isArray(options.cardTypes)) {
      errors.push('Card types must be provided as an array');
    } else if (options.cardTypes.length === 0) {
      errors.push('At least one card type must be selected');
      suggestions.push('Select one or more card types: one-way, bidirectional, multi-line, or cloze');
    } else {
      // Validate each card type
      const validCardTypes = Object.values(CardType);
      const invalidTypes = options.cardTypes.filter(type => !validCardTypes.includes(type));
      if (invalidTypes.length > 0) {
        errors.push(`Invalid card types: ${invalidTypes.join(', ')}`);
        suggestions.push(`Valid card types are: ${validCardTypes.join(', ')}`);
      }
    }

    // Validate maxCards if provided
    if (options.maxCards !== undefined) {
      if (typeof options.maxCards !== 'number') {
        errors.push('Maximum cards must be a number');
      } else if (options.maxCards < 1) {
        errors.push('Maximum cards must be at least 1');
      } else if (options.maxCards > 100) {
        warnings.push('Generating more than 100 cards may take a very long time');
        suggestions.push('Consider generating fewer cards or breaking content into smaller sections');
      } else if (options.maxCards > 50) {
        warnings.push('Generating many cards may take longer and use more API credits');
      }
    }

    // Validate tags if provided
    if (options.tags) {
      if (!Array.isArray(options.tags)) {
        errors.push('Tags must be provided as an array');
      } else {
        const tagValidation = this.validateTags(options.tags);
        errors.push(...tagValidation.errors);
        warnings.push(...tagValidation.warnings);
        suggestions.push(...tagValidation.suggestions);
      }
    }

    // Validate custom prompt if provided
    if (options.customPrompt !== undefined) {
      if (typeof options.customPrompt !== 'string') {
        errors.push('Custom prompt must be a string');
      } else if (options.customPrompt.trim().length > 0) {
        const promptValidation = this.validateCustomPrompt(options.customPrompt);
        warnings.push(...promptValidation.warnings);
        suggestions.push(...promptValidation.suggestions);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate tags format and content
   */
  static validateTags(tags: string[]): TagValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const tag of tags) {
      if (typeof tag !== 'string') {
        errors.push(`Tag must be a string, got: ${typeof tag}`);
        continue;
      }

      const trimmedTag = tag.trim();

      if (trimmedTag.length === 0) {
        warnings.push('Empty tag found and will be ignored');
        continue;
      }

      if (!trimmedTag.startsWith('#')) {
        errors.push(`Tag "${trimmedTag}" must start with #`);
        suggestions.push('All tags should start with # (e.g., #flashcards, #biology)');
        continue;
      }

      if (trimmedTag.length === 1) {
        errors.push('Tag cannot be just a # symbol');
        suggestions.push('Tags need content after the # symbol (e.g., #flashcards)');
        continue;
      }

      if (trimmedTag.includes(' ')) {
        errors.push(`Tag "${trimmedTag}" cannot contain spaces`);
        suggestions.push('Use hyphens or underscores instead of spaces in tags (e.g., #my-tag or #my_tag)');
        continue;
      }

      if (trimmedTag.length > 50) {
        warnings.push(`Tag "${trimmedTag}" is very long and may not display well`);
        suggestions.push('Consider using shorter, more concise tag names');
      }

      // Check for common tag formatting issues
      if (trimmedTag.includes('##')) {
        warnings.push(`Tag "${trimmedTag}" contains multiple # symbols`);
        suggestions.push('Tags should start with a single # symbol');
      }

      if (/[^a-zA-Z0-9#_-]/.test(trimmedTag)) {
        warnings.push(`Tag "${trimmedTag}" contains special characters that may cause issues`);
        suggestions.push('Use only letters, numbers, hyphens, and underscores in tags');
      }
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Validate custom prompt content
   */
  static validateCustomPrompt(prompt: string): PromptValidationResult {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length < 10) {
      warnings.push('Custom prompt is very short');
      suggestions.push('Provide more detailed instructions for better flashcard generation');
    }

    if (trimmedPrompt.length > 2000) {
      warnings.push('Custom prompt is very long');
      suggestions.push('Consider shortening the prompt to avoid token limits');
    }

    // Check for common prompt issues
    if (!trimmedPrompt.toLowerCase().includes('flashcard')) {
      warnings.push('Custom prompt does not mention flashcards');
      suggestions.push('Include instructions about generating flashcards in your prompt');
    }

    if (trimmedPrompt.toLowerCase().includes('json') && !trimmedPrompt.includes('{')) {
      warnings.push('Prompt mentions JSON but does not show expected format');
      suggestions.push('Include an example of the expected JSON format in your prompt');
    }

    return { warnings, suggestions };
  }

  /**
   * Validate placement options
   */
  static validatePlacementOption(placement: string): PlacementValidationResult {
    const validPlacements = ['cursor', 'bottom', 'separate-file'];

    if (!validPlacements.includes(placement)) {
      return {
        isValid: false,
        error: `Invalid placement option: ${placement}`,
        suggestion: `Valid options are: ${validPlacements.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Comprehensive validation before flashcard generation
   */
  static validateBeforeGeneration(
    content: string,
    config: ProviderConfig,
    providerName: string,
    options: GenerationOptions
  ): ComprehensiveValidationResult {
    const contentValidation = this.validateNoteContent(content);
    const configValidation = this.validateProviderConfig(config, providerName);
    const optionsValidation = this.validateGenerationOptions(options);

    const allErrors = [
      ...contentValidation.errors,
      ...configValidation.errors,
      ...optionsValidation.errors
    ];

    const allWarnings = [
      ...contentValidation.warnings,
      ...configValidation.warnings,
      ...optionsValidation.warnings
    ];

    const allSuggestions = [
      ...(contentValidation.suggestions || []),
      ...(optionsValidation.suggestions || [])
    ];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions,
      contentValidation,
      configValidation,
      optionsValidation
    };
  }

  /**
   * Show validation results to user
   */
  static showValidationResults(result: ComprehensiveValidationResult): void {
    if (!result.isValid) {
      const errorMessage = `❌ Validation failed:\n${result.errors.join('\n')}`;
      ErrorHandler.handleContentValidationError(errorMessage);

      if (result.suggestions.length > 0) {
        const suggestionMessage = `💡 Suggestions:\n${result.suggestions.join('\n')}`;
        ErrorHandler.showInfo(suggestionMessage, 8000);
      }
      return;
    }

    if (result.warnings.length > 0) {
      const warningMessage = `⚠️ Warnings:\n${result.warnings.join('\n')}`;
      ErrorHandler.showWarning(warningMessage, 6000);

      if (result.suggestions.length > 0) {
        const suggestionMessage = `💡 Suggestions:\n${result.suggestions.join('\n')}`;
        ErrorHandler.showInfo(suggestionMessage, 6000);
      }
    }
  }

  // Helper methods

  private static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private static stripMarkdown(text: string): string {
    return text
      .replace(/^#{1,6}\s+/gm, '') // Headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/^[-*+]\s+/gm, '') // Lists
      .replace(/^\d+\.\s+/gm, '') // Numbered lists
      .replace(/^>\s*/gm, '') // Blockquotes
      .trim();
  }

  private static hasEducationalIndicators(text: string): boolean {
    const educationalKeywords = [
      'definition', 'concept', 'theory', 'principle', 'law', 'rule',
      'example', 'formula', 'equation', 'process', 'method', 'technique',
      'cause', 'effect', 'reason', 'because', 'therefore', 'thus',
      'important', 'key', 'main', 'primary', 'secondary', 'major',
      'characteristic', 'feature', 'property', 'attribute', 'function',
      'purpose', 'goal', 'objective', 'result', 'outcome', 'conclusion'
    ];

    const lowerText = text.toLowerCase();
    return educationalKeywords.some(keyword => lowerText.includes(keyword));
  }
}

// Validation result interfaces

export interface ContentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
  metadata?: {
    wordCount: number;
    meaningfulWordCount: number;
    hasEducationalContent: boolean;
  };
}

export interface GenerationOptionsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface TagValidationResult {
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface PromptValidationResult {
  warnings: string[];
  suggestions: string[];
}

export interface PlacementValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export interface ComprehensiveValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  contentValidation: ContentValidationResult;
  configValidation: ValidationResult;
  optionsValidation: GenerationOptionsValidationResult;
}