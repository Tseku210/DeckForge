# Developer Documentation for LLM Flashcard Generator

This document provides technical details about the LLM Flashcard Generator plugin architecture, components, and implementation details.

## Architecture Overview

The plugin follows a modular architecture with clear separation of concerns:

```
LLMFlashcardGeneratorPlugin (main.ts)
├── LLMServiceManager
│   ├── OpenAIProvider
│   ├── AnthropicProvider
│   └── GeminiProvider
├── ContentProcessor
├── FlashcardGenerator
├── SpacedRepetitionFormatter
├── FileManager
├── InputValidator
└── ErrorHandler
```

## Core Components

### LLMFlashcardGeneratorPlugin (main.ts)

The main plugin class that:
- Initializes all components
- Registers commands and UI elements
- Manages settings and lifecycle
- Orchestrates the flashcard generation process

### LLM Provider System

#### LLMServiceManager (llm-service-manager.ts)

Manages multiple LLM providers and handles provider switching:
- Provider registration and configuration
- Authentication and API communication
- Provider selection and validation

#### Provider Classes

Each provider implements the `LLMProvider` interface:
- `OpenAIProvider`: Integration with OpenAI API (GPT models)
- `AnthropicProvider`: Integration with Anthropic API (Claude models)
- `GeminiProvider`: Integration with Google's Gemini API

### Content Processing

#### ContentProcessor (content-processor.ts)

Prepares note content for LLM consumption:
- Cleans markdown formatting
- Extracts metadata
- Handles large content with chunking

#### PromptTemplateSystem (prompt-template-system.ts)

Manages prompt templates for flashcard generation:
- Template rendering with variables
- Default templates for different use cases
- Template validation and customization

### Flashcard Generation

#### FlashcardGenerator (flashcard-generator.ts)

Processes LLM responses and creates formatted flashcards:
- Validates LLM responses
- Converts raw responses to structured flashcards
- Handles error cases and edge conditions

#### SpacedRepetitionFormatter (spaced-repetition-formatter.ts)

Formats flashcards according to Spaced Repetition plugin syntax:
- One-way (::) format
- Bidirectional (:::) format
- Multi-line (?) format
- Cloze deletion (==) format

### File Management

#### FileManager (file-manager.ts)

Handles flashcard placement options:
- Insertion at cursor position
- Insertion at bottom of note
- Creation of separate linked files

### User Interface

#### FlashcardSettingTab (settings-tab.ts)

Settings UI for plugin configuration:
- Provider configuration
- Default options
- Output preferences
- Prompt templates

#### GenerationOptionsModal (generation-modal.ts)

Modal dialog for flashcard generation options:
- Card count selection
- Card type selection
- Output placement options
- Tag configuration

### Validation and Error Handling

#### InputValidator (input-validator.ts)

Validates user input and configuration:
- Content validation
- Provider configuration validation
- Generation options validation

#### ErrorHandler (error-handler.ts)

Comprehensive error handling system:
- User-friendly error messages
- Troubleshooting guidance
- Error logging and categorization

## Data Models

### Core Interfaces

- `LLMProvider`: Interface for LLM providers
- `ProviderConfig`: Configuration for LLM providers
- `GenerationOptions`: Options for flashcard generation
- `FlashcardResponse`: Response from LLM providers
- `RawFlashcard`: Internal flashcard representation
- `FormattedFlashcard`: Flashcard formatted for output
- `FlashcardPluginSettings`: Plugin settings structure

## Implementation Details

### Provider Detection

The plugin automatically detects the appropriate provider type based on:
- Provider name
- API endpoint URL
- Model name

### Content Processing Pipeline

1. **Input**: Current note content from Obsidian editor
2. **Preprocessing**: Clean markdown, extract relevant text
3. **LLM Request**: Format content with prompt template, send to provider
4. **Response Processing**: Parse LLM response, validate flashcard format
5. **Formatting**: Convert to Spaced Repetition plugin syntax
6. **Output**: Insert into note or create separate file with linking

### Error Handling Strategy

The plugin uses a comprehensive error handling strategy:
- Provider-specific error messages
- User-friendly notifications
- Detailed troubleshooting guidance
- Graceful fallbacks for common issues

## Adding a New Provider

To add support for a new LLM provider:

1. Create a new provider class that implements the `LLMProvider` interface
2. Add provider detection logic in `LLMServiceManager.determineProviderType()`
3. Add default configuration in `LLMServiceManager.getDefaultConfig()`
4. Add provider-specific error handling in `ErrorHandler`

## Testing

The plugin includes comprehensive tests for all components:
- Unit tests for individual components
- Integration tests for the complete workflow
- Mock LLM responses for consistent testing

## Development Approach

This plugin was primarily developed using AI-assisted coding techniques ("vibe coding") to rapidly prototype and implement features. The codebase emphasizes functionality and user experience while maintaining clean architecture patterns.

## Best Practices

- Always validate user input before sending to LLM
- Handle API errors gracefully with user-friendly messages
- Respect token limits and implement chunking for large content
- Provide detailed feedback during the generation process
- Ensure proper cleanup of resources in the `onunload()` method