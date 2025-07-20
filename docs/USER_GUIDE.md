# User Guide

Quick guide to set up and use the LLM Flashcard Generator plugin.

## Installation

### Prerequisites

Before installing the LLM Flashcard Generator, you'll need:

1. **Spaced Repetition plugin**: This plugin generates flashcards compatible with the [Spaced Repetition plugin](https://www.stephenmwangi.com/obsidian-spaced-repetition/). Install it first from the Community Plugins.

### Installing LLM Flashcard Generator

1. Open Obsidian and go to Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click "Browse" and search for "LLM Flashcard Generator"
4. Install the plugin and enable it

## Setting Up LLM Providers

The plugin supports multiple LLM providers. You'll need to set up at least one provider before you can generate flashcards.

### OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/) and create an account or sign in
2. Navigate to API Keys and create a new API key
3. In Obsidian, go to Settings > LLM Flashcard Generator
4. Click "Add Provider" and select "OpenAI"
5. Enter a name for the provider (e.g., "OpenAI GPT-4")
6. Enter your API key
7. Set the endpoint to `https://api.openai.com/v1` (default)
8. Choose a model (e.g., `gpt-3.5-turbo` or `gpt-4`)
9. Click "Save"

### Anthropic Setup

1. Go to [Anthropic Console](https://console.anthropic.com/) and create an account or sign in
2. Generate an API key
3. In Obsidian, go to Settings > LLM Flashcard Generator
4. Click "Add Provider" and select "Anthropic"
5. Enter a name for the provider (e.g., "Claude")
6. Enter your API key
7. Set the endpoint to `https://api.anthropic.com/v1` (default)
8. Choose a model (e.g., `claude-3-haiku-20240307` or `claude-3-opus-20240229`)
9. Click "Save"

### Google Gemini Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey) and create an account or sign in
2. Generate an API key
3. In Obsidian, go to Settings > LLM Flashcard Generator
4. Click "Add Provider" and select "Gemini"
5. Enter a name for the provider (e.g., "Gemini")
6. Enter your API key
7. Set the endpoint to `https://generativelanguage.googleapis.com/v1beta` (default)
8. Choose a model (e.g., `gemini-1.5-flash` or `gemini-1.5-pro`)
9. Click "Save"

## Basic Usage

1. Open a note with educational content
2. Click the brain icon in the ribbon or use the command "Generate flashcards from current note"
3. Configure generation options in the modal
4. Click "Generate Flashcards"
5. Review the generated flashcards

## Generation Options

When you trigger flashcard generation, a modal will appear with the following options:

- **Number of cards**: Choose between automatic (AI decides) or manual (you specify)
- **Card types**: Select which types of flashcards to generate
- **Output placement**: Choose where to place the generated flashcards
- **Tags**: Add tags to organize your flashcards
- **Custom prompt**: Optionally override the default prompt template

## Output Options

You can place generated flashcards in three different ways:

1. **At cursor position**: Inserts flashcards where your cursor is in the note
2. **At bottom of note**: Appends flashcards to the end of your note
3. **In separate file**: Creates a new file with the flashcards and links it to your original note

## Card Types

The plugin supports multiple flashcard formats compatible with the Spaced Repetition plugin:

- **One-way (::)**: Question on front, answer on back
  ```
  What is the capital of France::Paris
  ```

- **Bidirectional (:::)**: Tests in both directions
  ```
  Paris:::Capital of France
  ```

- **Multi-line (?)**: For questions with multi-line answers
  ```
  What are the three branches of government?
  - Executive
  - Legislative
  - Judicial
  ```

- **Multi-line Bidirectional (???)**: Bidirectional with multi-line content
  ```
  Three branches of government???
  - Executive
  - Legislative
  - Judicial
  ```

- **Cloze Deletion (==)**: Fill-in-the-blank format
  ```
  The capital of France is ==Paris==
  ```

## Customizing Prompts

You can customize the prompt template used for flashcard generation:

1. Go to Settings > LLM Flashcard Generator
2. Scroll down to "Prompt Templates"
3. Edit the default prompt template

Available variables:
- `{content}`: The note content
- `{title}`: The note title
- `{maxCards}`: Maximum number of cards to generate
- `{cardTypes}`: Selected card types
- `{tags}`: Selected tags

## Tips and Best Practices

- **Content quality**: The better your note content, the better the flashcards
- **Chunk large notes**: For very long notes, consider generating flashcards from sections
- **Review generated cards**: Always review and edit generated flashcards for accuracy
- **Use specific card types**: Choose card types appropriate for your content
- **Customize prompts**: Tailor prompts for specific subjects or learning goals
- **Test provider connection**: Use the "Test LLM provider connection" command to verify your API setup

## Troubleshooting

### API Key Issues

- **Authentication failed**: Double-check your API key and ensure it's active
- **Invalid API key format**: Ensure your API key follows the correct format
- **Rate limits**: If you hit rate limits, try a different provider or wait

### Generation Issues

- **Empty response**: Ensure your note has sufficient educational content
- **Poor quality cards**: Try a different provider or customize the prompt
- **Timeout errors**: Try generating fewer cards or using a faster model

### Plugin Issues

- **Plugin not responding**: Restart Obsidian
- **Settings not saving**: Check Obsidian permissions
- **Flashcards not formatted correctly**: Ensure the Spaced Repetition plugin is installed

For additional help, please submit an issue on the [GitHub repository](https://github.com/Tseku210/DeckForge/issues).