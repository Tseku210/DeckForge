# Provider Configuration Examples

## Google Gemini (Recommended)

### Gemini 1.5 Flash (Fast & Cost-effective)

```json
{
  "apiKey": "your-api-key-here",
  "endpoint": "https://generativelanguage.googleapis.com/v1beta",
  "model": "gemini-1.5-flash",
  "customHeaders": {}
}
```

### Gemini 1.5 Pro (High Quality)

```json
{
  "apiKey": "your-api-key-here",
  "endpoint": "https://generativelanguage.googleapis.com/v1beta",
  "model": "gemini-1.5-pro",
  "customHeaders": {}
}
```

## OpenAI

### GPT-4o

```json
{
  "apiKey": "your-api-key-here",
  "endpoint": "https://api.openai.com/v1",
  "model": "gpt-4o",
  "customHeaders": {}
}
```

### GPT-3.5 Turbo

```json
{
  "apiKey": "your-api-key-here",
  "endpoint": "https://api.openai.com/v1",
  "model": "gpt-3.5-turbo",
  "customHeaders": {}
}
```

## Anthropic

### Claude 3 Haiku

```json
{
  "apiKey": "your-api-key-here",
  "endpoint": "https://api.anthropic.com/v1",
  "model": "claude-3-haiku-20240307",
  "customHeaders": {}
}
```

## Custom Prompt Templates

### Academic Study Template

```
Generate academic flashcards from this educational content. Focus on key concepts, definitions, theories, and important details that students should memorize.

Subject: {title}
Content:
{content}

Guidelines:
- Generate {maxCards} high-quality flashcards
- Include definitions, key terms, and important concepts
- Create both factual recall and conceptual understanding questions
- Make questions challenging but fair for students
- Card types to use: {cardTypes}
- Apply these tags: {tags}

For each flashcard, provide:
- Front: [clear, specific question]
- Back: [comprehensive but concise answer]
- Type: [oneway/bidirectional/cloze]
```

### Language Learning Template

```
Create language learning flashcards from this content. Focus on vocabulary, phrases, grammar points, and language patterns.

Topic: {title}
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

### Technical Documentation Template

```
Generate technical flashcards from this documentation or technical content. Focus on APIs, functions, concepts, and practical knowledge.

Topic: {title}
Content:
{content}

Requirements:
- Create {maxCards} technical flashcards
- Include function signatures, API endpoints, key concepts
- Focus on practical, applicable knowledge
- Include code examples where relevant
- Card types: {cardTypes}
- Apply these tags: {tags}

Each flashcard should have:
- Front: [technical question or prompt]
- Back: [detailed technical answer with examples if needed]
- Type: [oneway/bidirectional/cloze]
```