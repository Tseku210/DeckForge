# LLM Flashcard Generator Examples

This document provides practical examples of using the LLM Flashcard Generator plugin with different content types and settings.

## Table of Contents

1. [Basic Usage Examples](#basic-usage-examples)
2. [Card Type Examples](#card-type-examples)
3. [Content Type Examples](#content-type-examples)
4. [Advanced Configuration](#advanced-configuration)
5. [Troubleshooting Examples](#troubleshooting-examples)

## Basic Usage Examples

### Simple Flashcard Generation

1. Open a note with educational content
2. Click the brain icon in the ribbon or use the command palette
3. Use default settings in the modal
4. Click "Generate Flashcards"

### Generating Cards with Custom Tags

1. Open a note with educational content
2. Click the brain icon in the ribbon
3. In the modal, add tags like `#biology`, `#chapter1`
4. Click "Generate Flashcards"

### Generating Cards in a Separate File

1. Open a note with educational content
2. Click the brain icon in the ribbon
3. In the modal, select "Create separate file" for output placement
4. Click "Generate Flashcards"
5. A new file will be created with the flashcards and linked to your original note

## Card Type Examples

### One-way Cards (::)

Best for: Simple question-answer pairs

```markdown
What is the capital of France::Paris
What is the formula for water::H2O
Who wrote "Romeo and Juliet"::William Shakespeare
```

### Bidirectional Cards (:::)

Best for: Term-definition pairs that should be tested in both directions

```markdown
Paris:::Capital of France
H2O:::Chemical formula for water
Photosynthesis:::Process by which plants convert light energy into chemical energy
```

### Multi-line Cards (?)

Best for: Complex questions with detailed answers

```markdown
What are the three branches of the US government?
- Executive (President)
- Legislative (Congress)
- Judicial (Supreme Court)
```

### Cloze Deletion Cards (==)

Best for: Fill-in-the-blank style learning

```markdown
The capital of France is ==Paris==
Water has the chemical formula ==H2O==
The three branches of US government are the ==executive==, ==legislative==, and ==judicial== branches
```

## Content Type Examples

### History Notes

```markdown
# The French Revolution

The French Revolution was a period of radical political and societal change in France that began with the Estates General of 1789 and ended with the formation of the French Consulate in November 1799.

## Causes
- Economic crisis due to French involvement in the American Revolution
- Inequitable taxation system
- Food scarcity and rising bread prices
- Influence of Enlightenment ideas

## Key Events
- Storming of the Bastille (July 14, 1789)
- Declaration of the Rights of Man and of the Citizen (August 26, 1789)
- Women's March on Versailles (October 5-6, 1789)
- Execution of King Louis XVI (January 21, 1793)
- Reign of Terror (1793-1794)

## Outcomes
- Abolition of feudalism
- Separation of church and state
- Declaration of the Republic
- Rise of Napoleon Bonaparte
```

### Science Notes

```markdown
# Photosynthesis

Photosynthesis is the process by which green plants, algae, and some bacteria convert light energy into chemical energy.

## Basic Equation
6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂

## Light-Dependent Reactions
- Occur in the thylakoid membrane
- Capture light energy using chlorophyll
- Convert ADP to ATP
- Split water molecules to release oxygen
- Produce NADPH

## Light-Independent Reactions (Calvin Cycle)
- Occur in the stroma
- Use ATP and NADPH from light-dependent reactions
- Fix carbon dioxide into glucose
- Regenerate RuBP for continued carbon fixation
```

### Programming Notes

```markdown
# JavaScript Promises

Promises in JavaScript represent the eventual completion (or failure) of an asynchronous operation and its resulting value.

## Promise States
- **Pending**: Initial state, neither fulfilled nor rejected
- **Fulfilled**: Operation completed successfully
- **Rejected**: Operation failed

## Creating a Promise
```javascript
const myPromise = new Promise((resolve, reject) => {
  // Asynchronous operation
  if (/* operation successful */) {
    resolve(value); // fulfilled with value
  } else {
    reject(error); // rejected with error
  }
});
```

## Promise Methods
- **then()**: Handles fulfilled promises
- **catch()**: Handles rejected promises
- **finally()**: Executes regardless of promise state
```

## Advanced Configuration

### Custom Prompt Template for Medical Content

```
Generate medical flashcards from the following content. Focus on key concepts, definitions, mechanisms, and clinical correlations.

Topic: {title}
Content:
{content}

Instructions:
- Generate {maxCards} high-quality medical flashcards
- Include definitions, mechanisms, and clinical applications
- Create cards that test both factual recall and conceptual understanding
- Use precise medical terminology
- Card types to use: {cardTypes}
- Apply these tags: {tags}

For each flashcard, provide:
- Front: [clear, specific question]
- Back: [comprehensive but concise answer]
- Type: [oneway/bidirectional/cloze]
```

### Custom Prompt Template for Language Learning

```
Create language learning flashcards from this content. Focus on vocabulary, phrases, grammar points, and language patterns.

Language: {title}
Content:
{content}

Instructions:
- Generate {maxCards} language learning flashcards
- Include vocabulary words, phrases, and grammar concepts
- Create bidirectional cards for vocabulary (word ↔ definition)
- Use cloze deletion for sentence patterns and grammar
- Card types: {cardTypes}
- Apply these tags: {tags}

Format:
- Front: [word/phrase/question]
- Back: [translation/definition/answer]
- Type: [oneway/bidirectional/cloze]
```

## Troubleshooting Examples

### API Key Issues

**Problem**: Authentication failed for OpenAI
**Solution**: 
1. Check your API key in Settings > LLM Flashcard Generator
2. Ensure your API key starts with "sk-"
3. Verify your OpenAI account has sufficient credits

### Generation Issues

**Problem**: Generated flashcards are low quality
**Solution**:
1. Try a different LLM provider (e.g., switch from GPT-3.5 to GPT-4)
2. Customize the prompt template to be more specific
3. Ensure your note content is clear and educational

### Content Issues

**Problem**: Plugin says "Content is too short"
**Solution**:
1. Add more educational content to your note
2. Ensure your note has at least a few paragraphs of meaningful content
3. Focus on factual, educational content rather than personal notes