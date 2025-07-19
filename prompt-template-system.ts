import { CardType } from './types';
import { ProcessedContent } from './content-processor';

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  cardTypes: CardType[];
}

export interface TemplateContext {
  content: string;
  title: string;
  wordCount: number;
  maxCards?: number;
  cardTypes: CardType[];
  tags?: string[];
  metadata?: any;
}

export class PromptTemplateSystem {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: PromptTemplate[] = [
      {
        id: 'default',
        name: 'Default Flashcard Generator',
        description: 'General purpose flashcard generation template',
        template: `Generate flashcards from the following content. Create clear, concise questions and answers that would be useful for studying.

Title: {title}
Content:
{content}

Instructions:
- Generate {maxCards} flashcards based on the content
- Focus on key concepts, definitions, and important facts
- Make questions specific and answers complete but concise
- Use the following card types: {cardTypes}
{tagsInstruction}

Format each flashcard as:
- Front: [question or prompt]
- Back: [answer or explanation]
- Type: [oneway/bidirectional/cloze]`,
        variables: ['title', 'content', 'maxCards', 'cardTypes', 'tagsInstruction'],
        cardTypes: [CardType.OneWay, CardType.Bidirectional, CardType.Cloze]
      },
      {
        id: 'academic',
        name: 'Academic Study Cards',
        description: 'Template optimized for academic content and textbook material',
        template: `Create academic flashcards from this educational content. Focus on key concepts, definitions, theories, and important details that students should memorize.

Subject: {title}
Content:
{content}

Guidelines:
- Generate {maxCards} high-quality flashcards
- Include definitions, key terms, and important concepts
- Create both factual recall and conceptual understanding questions
- Make questions challenging but fair for students
- Card types to use: {cardTypes}
{tagsInstruction}

For each flashcard, provide:
- Front: [clear, specific question]
- Back: [comprehensive but concise answer]
- Type: [oneway/bidirectional/cloze]`,
        variables: ['title', 'content', 'maxCards', 'cardTypes', 'tagsInstruction'],
        cardTypes: [CardType.OneWay, CardType.Bidirectional, CardType.Cloze]
      },
      {
        id: 'language-learning',
        name: 'Language Learning Cards',
        description: 'Template for vocabulary and language learning flashcards',
        template: `Create language learning flashcards from this content. Focus on vocabulary, phrases, grammar points, and language patterns.

Topic: {title}
Content:
{content}

Instructions:
- Generate {maxCards} language learning flashcards
- Include vocabulary words, phrases, and grammar concepts
- Create bidirectional cards for vocabulary (word ↔ definition)
- Use cloze deletion for sentence patterns and grammar
- Card types: {cardTypes}
{tagsInstruction}

Format:
- Front: [word/phrase/question]
- Back: [translation/definition/answer]
- Type: [oneway/bidirectional/cloze]`,
        variables: ['title', 'content', 'maxCards', 'cardTypes', 'tagsInstruction'],
        cardTypes: [CardType.Bidirectional, CardType.Cloze, CardType.OneWay]
      },
      {
        id: 'technical',
        name: 'Technical Documentation',
        description: 'Template for technical concepts, APIs, and programming content',
        template: `Generate technical flashcards from this documentation or technical content. Focus on APIs, functions, concepts, and practical knowledge.

Topic: {title}
Content:
{content}

Requirements:
- Create {maxCards} technical flashcards
- Include function signatures, API endpoints, key concepts
- Focus on practical, applicable knowledge
- Include code examples where relevant
- Card types: {cardTypes}
{tagsInstruction}

Each flashcard should have:
- Front: [technical question or prompt]
- Back: [detailed technical answer with examples if needed]
- Type: [oneway/bidirectional/cloze]`,
        variables: ['title', 'content', 'maxCards', 'cardTypes', 'tagsInstruction'],
        cardTypes: [CardType.OneWay, CardType.Cloze, CardType.MultiLine]
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get all available template variables
   */
  getAvailableVariables(): TemplateVariable[] {
    return [
      {
        name: 'content',
        description: 'The processed note content',
        example: 'The main content of your note...'
      },
      {
        name: 'title',
        description: 'The note title or filename',
        example: 'My Study Notes'
      },
      {
        name: 'wordCount',
        description: 'Number of words in the content',
        example: '250'
      },
      {
        name: 'maxCards',
        description: 'Maximum number of cards to generate',
        example: '5'
      },
      {
        name: 'cardTypes',
        description: 'List of card types to generate',
        example: 'one-way, bidirectional, cloze'
      },
      {
        name: 'tags',
        description: 'Tags to apply to the flashcards',
        example: '#biology #flashcards'
      },
      {
        name: 'tagsInstruction',
        description: 'Instruction about tags (auto-generated)',
        example: 'Apply these tags to each card: #biology #flashcards'
      },
      {
        name: 'metadata',
        description: 'Additional metadata about the content',
        example: 'Has images: true, Has links: false'
      }
    ];
  }

  /**
   * Add or update a custom template
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Remove a template
   */
  removeTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Render a template with the provided context
   */
  renderTemplate(templateId: string, context: TemplateContext): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    let rendered = template.template;

    // Replace basic variables
    rendered = rendered.replace(/{content}/g, context.content);
    rendered = rendered.replace(/{title}/g, context.title);
    rendered = rendered.replace(/{wordCount}/g, context.wordCount.toString());
    rendered = rendered.replace(/{maxCards}/g, (context.maxCards || 5).toString());

    // Handle card types
    const cardTypesText = context.cardTypes
      .map(type => this.cardTypeToDisplayName(type))
      .join(', ');
    rendered = rendered.replace(/{cardTypes}/g, cardTypesText);

    // Handle tags
    if (context.tags && context.tags.length > 0) {
      const tagsText = context.tags.join(' ');
      const tagsInstruction = `Apply these tags to each card: ${tagsText}`;
      rendered = rendered.replace(/{tags}/g, tagsText);
      rendered = rendered.replace(/{tagsInstruction}/g, tagsInstruction);
    } else {
      rendered = rendered.replace(/{tags}/g, '');
      rendered = rendered.replace(/{tagsInstruction}/g, '');
    }

    // Handle metadata
    if (context.metadata) {
      const metadataText = Object.entries(context.metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      rendered = rendered.replace(/{metadata}/g, metadataText);
    } else {
      rendered = rendered.replace(/{metadata}/g, '');
    }

    return rendered.trim();
  }

  /**
   * Convert CardType enum to display name
   */
  private cardTypeToDisplayName(cardType: CardType): string {
    switch (cardType) {
      case CardType.OneWay:
        return 'one-way';
      case CardType.Bidirectional:
        return 'bidirectional';
      case CardType.MultiLine:
        return 'multi-line';
      case CardType.MultiLineBidirectional:
        return 'multi-line bidirectional';
      case CardType.Cloze:
        return 'cloze deletion';
      default:
        return cardType;
    }
  }

  /**
   * Validate a template
   */
  validateTemplate(template: PromptTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.id || template.id.trim().length === 0) {
      errors.push('Template ID is required');
    }

    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.template || template.template.trim().length === 0) {
      errors.push('Template content is required');
    }

    // Check for required variables
    if (!template.template.includes('{content}')) {
      errors.push('Template must include {content} variable');
    }

    // Check for unknown variables
    const knownVariables = this.getAvailableVariables().map(v => v.name);
    const templateVariables = template.template.match(/{(\w+)}/g);
    if (templateVariables) {
      const unknownVars = templateVariables
        .map(v => v.replace(/[{}]/g, ''))
        .filter(v => !knownVariables.includes(v));

      if (unknownVars.length > 0) {
        errors.push(`Unknown variables: ${unknownVars.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a template context from processed content
   */
  createContext(
    processedContent: ProcessedContent,
    maxCards?: number,
    cardTypes: CardType[] = [CardType.OneWay],
    tags?: string[]
  ): TemplateContext {
    return {
      content: processedContent.cleanedContent,
      title: processedContent.metadata.title,
      wordCount: processedContent.metadata.wordCount,
      maxCards,
      cardTypes,
      tags,
      metadata: {
        hasImages: processedContent.metadata.hasImages,
        hasLinks: processedContent.metadata.hasLinks,
        hasCodeBlocks: processedContent.metadata.hasCodeBlocks
      }
    };
  }

  /**
   * Get template suggestions based on content type
   */
  suggestTemplate(processedContent: ProcessedContent): string {
    const { metadata } = processedContent;
    const content = processedContent.cleanedContent.toLowerCase();

    // Technical content detection
    if (metadata.hasCodeBlocks ||
      content.includes('function') ||
      content.includes('api') ||
      content.includes('class') ||
      content.includes('method')) {
      return 'technical';
    }

    // Language learning detection
    if (content.includes('vocabulary') ||
      content.includes('translation') ||
      content.includes('grammar') ||
      content.includes('language')) {
      return 'language-learning';
    }

    // Academic content detection
    if (content.includes('definition') ||
      content.includes('theory') ||
      content.includes('concept') ||
      metadata.wordCount > 500) {
      return 'academic';
    }

    return 'default';
  }
}