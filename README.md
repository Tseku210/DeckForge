# LLM Flashcard Generator for Obsidian

Generate flashcards from your notes using LLM providers (OpenAI, Anthropic, Google Gemini). Compatible with the Spaced Repetition plugin.

## Features

- **Multiple LLM Providers**: OpenAI, Anthropic, Google Gemini
- **Card Types**: One-way, bidirectional, multi-line, and cloze deletion
- **Flexible Output**: Insert at cursor, bottom of note, or separate file
- **Customizable**: Custom prompts and tags

## Installation

1. Open Obsidian and go to Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click "Browse" and search for "LLM Flashcard Generator"
4. Install the plugin and enable it

## Quick Start

1. **Set up a provider**: Go to Settings > LLM Flashcard Generator and add an LLM provider (OpenAI, Anthropic, or Gemini)
2. **Test connection**: Use the command "Test LLM provider connection" to verify your setup
3. **Generate flashcards**: Open a note with educational content and click the brain icon in the ribbon
4. **Configure options**: Choose your card types, output location, and tags in the modal
5. **Review results**: Check the generated flashcards and edit if needed

## Configuration

### Setting Up LLM Providers

1. Go to Settings > LLM Flashcard Generator
2. Click "Add Provider" and select your preferred LLM service (OpenAI, Anthropic, or Google Gemini)
3. Enter your API key and configure the endpoint and model
4. Select your active provider from the dropdown

### Default Settings

- **Output Preferences**: Choose where flashcards are placed by default
- **Card Types**: Select which types of flashcards to generate
- **Tags**: Configure default tags for organizing your flashcards
- **Prompt Templates**: Customize the prompt used for flashcard generation

## Usage

1. Open a note with educational content
2. Click the brain icon in the ribbon or use the command "Generate flashcards from current note"
3. Configure generation options in the modal:
   - Number of cards to generate (optional)
   - Card types to include
   - Output placement
   - Tags
4. Click "Generate Flashcards"
5. Review and study your generated flashcards using the Spaced Repetition plugin

## Card Types

- **One-way (::)**: Question → Answer format
- **Bidirectional (:::)**: Term ↔ Definition format (tests in both directions)
- **Multi-line (?)**: For questions with multi-line answers
- **Multi-line Bidirectional (???)**: For bidirectional cards with multi-line content
- **Cloze Deletion (==)**: Fill-in-the-blank format with ==highlighted== text

## Requirements

- Obsidian v0.15.0 or higher
- **Spaced Repetition plugin**: This plugin generates flashcards compatible with the [Spaced Repetition plugin](https://www.stephenmwangi.com/obsidian-spaced-repetition/). Install it from the Community Plugins to study your generated flashcards.
- An API key for at least one supported LLM provider:
  - OpenAI (GPT-3.5, GPT-4)
  - Anthropic (Claude)
  - Google Gemini

## Development

This plugin was primarily developed with "vibe coding" to rapidly prototype and implement features.

## Support

If you encounter any issues or have feature requests, please submit them on the [GitHub repository](https://github.com/Tseku210/DeckForge/issues).

## License

This project is licensed under the MIT License - see the LICENSE file for details.