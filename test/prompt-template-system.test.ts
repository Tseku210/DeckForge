import { describe, it, expect, beforeEach } from 'vitest';
import { PromptTemplateSystem, PromptTemplate, TemplateContext } from '../prompt-template-system';
import { CardType } from '../types';
import { ProcessedContent } from '../content-processor';

describe('PromptTemplateSystem', () => {
  let templateSystem: PromptTemplateSystem;

  beforeEach(() => {
    templateSystem = new PromptTemplateSystem();
  });

  describe('initialization', () => {
    it('should initialize with default templates', () => {
      const templates = templateSystem.getAllTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.id === 'default')).toBe(true);
      expect(templates.some(t => t.id === 'academic')).toBe(true);
      expect(templates.some(t => t.id === 'language-learning')).toBe(true);
      expect(templates.some(t => t.id === 'technical')).toBe(true);
    });

    it('should have valid default templates', () => {
      const defaultTemplate = templateSystem.getTemplate('default');

      expect(defaultTemplate).toBeDefined();
      expect(defaultTemplate!.name).toBe('Default Flashcard Generator');
      expect(defaultTemplate!.template).toContain('{content}');
      expect(defaultTemplate!.variables).toContain('content');
    });
  });

  describe('template management', () => {
    it('should add custom template', () => {
      const customTemplate: PromptTemplate = {
        id: 'custom',
        name: 'Custom Template',
        description: 'A custom template for testing',
        template: 'Generate cards from: {content}',
        variables: ['content'],
        cardTypes: [CardType.OneWay]
      };

      templateSystem.addTemplate(customTemplate);
      const retrieved = templateSystem.getTemplate('custom');

      expect(retrieved).toEqual(customTemplate);
    });

    it('should update existing template', () => {
      const updatedTemplate: PromptTemplate = {
        id: 'default',
        name: 'Updated Default',
        description: 'Updated description',
        template: 'Updated template: {content}',
        variables: ['content'],
        cardTypes: [CardType.OneWay]
      };

      templateSystem.addTemplate(updatedTemplate);
      const retrieved = templateSystem.getTemplate('default');

      expect(retrieved!.name).toBe('Updated Default');
    });

    it('should remove template', () => {
      const result = templateSystem.removeTemplate('default');
      const retrieved = templateSystem.getTemplate('default');

      expect(result).toBe(true);
      expect(retrieved).toBeUndefined();
    });

    it('should return false when removing non-existent template', () => {
      const result = templateSystem.removeTemplate('non-existent');

      expect(result).toBe(false);
    });

    it('should return undefined for non-existent template', () => {
      const template = templateSystem.getTemplate('non-existent');

      expect(template).toBeUndefined();
    });
  });

  describe('template rendering', () => {
    it('should render template with basic context', () => {
      const context: TemplateContext = {
        content: 'Test content about biology',
        title: 'Biology Notes',
        wordCount: 4,
        cardTypes: [CardType.OneWay],
        maxCards: 5
      };

      const rendered = templateSystem.renderTemplate('default', context);

      expect(rendered).toContain('Test content about biology');
      expect(rendered).toContain('Biology Notes');
      expect(rendered).toContain('5');
      expect(rendered).toContain('one-way');
    });

    it('should render template with tags', () => {
      const context: TemplateContext = {
        content: 'Test content',
        title: 'Test',
        wordCount: 2,
        cardTypes: [CardType.OneWay],
        tags: ['#biology', '#flashcards']
      };

      const rendered = templateSystem.renderTemplate('default', context);

      expect(rendered).toContain('#biology #flashcards');
      expect(rendered).toContain('Apply these tags to each card');
    });

    it('should render template without tags', () => {
      const context: TemplateContext = {
        content: 'Test content',
        title: 'Test',
        wordCount: 2,
        cardTypes: [CardType.OneWay]
      };

      const rendered = templateSystem.renderTemplate('default', context);

      expect(rendered).not.toContain('Apply these tags');
    });

    it('should render template with metadata', () => {
      const context: TemplateContext = {
        content: 'Test content',
        title: 'Test',
        wordCount: 2,
        cardTypes: [CardType.OneWay],
        metadata: {
          hasImages: true,
          hasLinks: false
        }
      };

      const rendered = templateSystem.renderTemplate('default', context);

      expect(rendered).toContain('hasImages: true');
      expect(rendered).toContain('hasLinks: false');
    });

    it('should handle multiple card types', () => {
      const context: TemplateContext = {
        content: 'Test content',
        title: 'Test',
        wordCount: 2,
        cardTypes: [CardType.OneWay, CardType.Bidirectional, CardType.Cloze]
      };

      const rendered = templateSystem.renderTemplate('default', context);

      expect(rendered).toContain('one-way, bidirectional, cloze deletion');
    });

    it('should throw error for non-existent template', () => {
      const context: TemplateContext = {
        content: 'Test content',
        title: 'Test',
        wordCount: 2,
        cardTypes: [CardType.OneWay]
      };

      expect(() => templateSystem.renderTemplate('non-existent', context))
        .toThrow("Template 'non-existent' not found");
    });
  });

  describe('template validation', () => {
    it('should validate correct template', () => {
      const template: PromptTemplate = {
        id: 'valid',
        name: 'Valid Template',
        description: 'A valid template',
        template: 'Generate cards from: {content}',
        variables: ['content'],
        cardTypes: [CardType.OneWay]
      };

      const result = templateSystem.validateTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject template without ID', () => {
      const template: PromptTemplate = {
        id: '',
        name: 'Template',
        description: 'Description',
        template: 'Template: {content}',
        variables: ['content'],
        cardTypes: [CardType.OneWay]
      };

      const result = templateSystem.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template ID is required');
    });

    it('should reject template without name', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: '',
        description: 'Description',
        template: 'Template: {content}',
        variables: ['content'],
        cardTypes: [CardType.OneWay]
      };

      const result = templateSystem.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template name is required');
    });

    it('should reject template without content', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        description: 'Description',
        template: '',
        variables: [],
        cardTypes: [CardType.OneWay]
      };

      const result = templateSystem.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template content is required');
    });

    it('should reject template without content variable', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        description: 'Description',
        template: 'Generate cards from: {title}',
        variables: ['title'],
        cardTypes: [CardType.OneWay]
      };

      const result = templateSystem.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template must include {content} variable');
    });

    it('should reject template with unknown variables', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test',
        description: 'Description',
        template: 'Generate cards from: {content} with {unknownVar}',
        variables: ['content', 'unknownVar'],
        cardTypes: [CardType.OneWay]
      };

      const result = templateSystem.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown variables: unknownVar');
    });
  });

  describe('available variables', () => {
    it('should return list of available variables', () => {
      const variables = templateSystem.getAvailableVariables();

      expect(variables.length).toBeGreaterThan(0);
      expect(variables.some(v => v.name === 'content')).toBe(true);
      expect(variables.some(v => v.name === 'title')).toBe(true);
      expect(variables.some(v => v.name === 'wordCount')).toBe(true);
      expect(variables.some(v => v.name === 'maxCards')).toBe(true);
      expect(variables.some(v => v.name === 'cardTypes')).toBe(true);
      expect(variables.some(v => v.name === 'tags')).toBe(true);
    });

    it('should have descriptions and examples for variables', () => {
      const variables = templateSystem.getAvailableVariables();
      const contentVar = variables.find(v => v.name === 'content');

      expect(contentVar).toBeDefined();
      expect(contentVar!.description).toBeDefined();
      expect(contentVar!.example).toBeDefined();
    });
  });

  describe('context creation', () => {
    it('should create context from processed content', () => {
      const processedContent: ProcessedContent = {
        originalContent: 'Original content',
        cleanedContent: 'Cleaned content',
        metadata: {
          title: 'Test Note',
          wordCount: 2,
          hasImages: false,
          hasLinks: true,
          hasCodeBlocks: false
        }
      };

      const context = templateSystem.createContext(
        processedContent,
        10,
        [CardType.OneWay, CardType.Bidirectional],
        ['#test']
      );

      expect(context.content).toBe('Cleaned content');
      expect(context.title).toBe('Test Note');
      expect(context.wordCount).toBe(2);
      expect(context.maxCards).toBe(10);
      expect(context.cardTypes).toEqual([CardType.OneWay, CardType.Bidirectional]);
      expect(context.tags).toEqual(['#test']);
      expect(context.metadata.hasImages).toBe(false);
      expect(context.metadata.hasLinks).toBe(true);
    });

    it('should create context with defaults', () => {
      const processedContent: ProcessedContent = {
        originalContent: 'Original',
        cleanedContent: 'Cleaned',
        metadata: {
          title: 'Test',
          wordCount: 1,
          hasImages: false,
          hasLinks: false,
          hasCodeBlocks: false
        }
      };

      const context = templateSystem.createContext(processedContent);

      expect(context.cardTypes).toEqual([CardType.OneWay]);
      expect(context.maxCards).toBeUndefined();
      expect(context.tags).toBeUndefined();
    });
  });

  describe('template suggestions', () => {
    it('should suggest technical template for code content', () => {
      const processedContent: ProcessedContent = {
        originalContent: 'function test() { return "hello"; }',
        cleanedContent: 'function test() { return "hello"; }',
        metadata: {
          title: 'Code',
          wordCount: 5,
          hasImages: false,
          hasLinks: false,
          hasCodeBlocks: true
        }
      };

      const suggestion = templateSystem.suggestTemplate(processedContent);
      expect(suggestion).toBe('technical');
    });

    it('should suggest language-learning template for vocabulary', () => {
      const processedContent: ProcessedContent = {
        originalContent: 'vocabulary words and grammar rules',
        cleanedContent: 'vocabulary words and grammar rules',
        metadata: {
          title: 'Language',
          wordCount: 5,
          hasImages: false,
          hasLinks: false,
          hasCodeBlocks: false
        }
      };

      const suggestion = templateSystem.suggestTemplate(processedContent);
      expect(suggestion).toBe('language-learning');
    });

    it('should suggest academic template for definitions', () => {
      const processedContent: ProcessedContent = {
        originalContent: 'definition of photosynthesis and theory',
        cleanedContent: 'definition of photosynthesis and theory',
        metadata: {
          title: 'Biology',
          wordCount: 5,
          hasImages: false,
          hasLinks: false,
          hasCodeBlocks: false
        }
      };

      const suggestion = templateSystem.suggestTemplate(processedContent);
      expect(suggestion).toBe('academic');
    });

    it('should suggest academic template for long content', () => {
      const longContent = 'word '.repeat(100);
      const processedContent: ProcessedContent = {
        originalContent: longContent,
        cleanedContent: longContent,
        metadata: {
          title: 'Long Note',
          wordCount: 600,
          hasImages: false,
          hasLinks: false,
          hasCodeBlocks: false
        }
      };

      const suggestion = templateSystem.suggestTemplate(processedContent);
      expect(suggestion).toBe('academic');
    });

    it('should suggest default template for general content', () => {
      const processedContent: ProcessedContent = {
        originalContent: 'general content about various topics',
        cleanedContent: 'general content about various topics',
        metadata: {
          title: 'General',
          wordCount: 5,
          hasImages: false,
          hasLinks: false,
          hasCodeBlocks: false
        }
      };

      const suggestion = templateSystem.suggestTemplate(processedContent);
      expect(suggestion).toBe('default');
    });
  });

  describe('card type display names', () => {
    it('should convert card types to display names correctly', () => {
      const context: TemplateContext = {
        content: 'Test',
        title: 'Test',
        wordCount: 1,
        cardTypes: [
          CardType.OneWay,
          CardType.Bidirectional,
          CardType.MultiLine,
          CardType.MultiLineBidirectional,
          CardType.Cloze
        ]
      };

      const rendered = templateSystem.renderTemplate('default', context);

      expect(rendered).toContain('one-way');
      expect(rendered).toContain('bidirectional');
      expect(rendered).toContain('multi-line');
      expect(rendered).toContain('multi-line bidirectional');
      expect(rendered).toContain('cloze deletion');
    });
  });
});