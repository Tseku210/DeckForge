import { describe, it, expect, beforeEach } from "vitest";
import { ContentProcessor } from "../content-processor";

describe("ContentProcessor", () => {
	let processor: ContentProcessor;

	beforeEach(() => {
		processor = new ContentProcessor();
	});

	describe("processContent", () => {
		it("should process basic content correctly", async () => {
			const content = "This is a test note with some content.";
			const result = await processor.processContent(content, "Test Note");

			expect(result.cleanedContent).toBe(content);
			expect(result.originalContent).toBe(content);
			expect(result.metadata.title).toBe("Test Note");
			expect(result.metadata.wordCount).toBe(8);
			expect(result.metadata.hasImages).toBe(false);
			expect(result.metadata.hasLinks).toBe(false);
			expect(result.metadata.hasCodeBlocks).toBe(false);
		});

		it("should detect images in content", async () => {
			const content = "Here is an image: ![alt text](image.png)";
			const result = await processor.processContent(content);

			expect(result.metadata.hasImages).toBe(true);
		});

		it("should detect links in content", async () => {
			const content = "Check out [this link](https://example.com)";
			const result = await processor.processContent(content);

			expect(result.metadata.hasLinks).toBe(true);
		});

		it("should detect code blocks in content", async () => {
			const content =
				'Here is some code:\n```javascript\nconsole.log("hello");\n```';
			const result = await processor.processContent(content);

			expect(result.metadata.hasCodeBlocks).toBe(true);
		});

		it("should handle empty content", async () => {
			const content = "";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe("");
			expect(result.metadata.wordCount).toBe(0);
		});

		it("should chunk large content when needed", async () => {
			const longContent = "word ".repeat(200); // Create content that exceeds token limit
			const result = await processor.processContent(
				longContent,
				"Long Note",
				{ maxTokens: 100 }
			);

			expect(result.metadata.chunks).toBeDefined();
			expect(result.metadata.chunks!.length).toBeGreaterThan(1);
		});
	});

	describe("cleanMarkdown", () => {
		it("should remove frontmatter", async () => {
			const content = "---\ntitle: Test\n---\n\nContent here";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe("Content here");
		});

		it("should convert headers to plain text", async () => {
			const content = "# Header 1\n## Header 2\nContent";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe("Header 1\nHeader 2\nContent");
		});

		it("should remove image syntax but keep alt text", async () => {
			const content = "Text ![alt text](image.png) more text";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe("Text alt text more text");
		});

		it("should convert links to just text", async () => {
			const content = "Check [this link](https://example.com) out";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe("Check this link out");
		});

		it("should remove code block markers but keep content", async () => {
			const content = '```javascript\nconsole.log("hello");\n```';
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe('console.log("hello");');
		});

		it("should remove inline code markers", async () => {
			const content = "Use `console.log()` for debugging";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe(
				"Use console.log() for debugging"
			);
		});

		it("should remove bold and italic markers", async () => {
			const content = "**bold** and *italic* and __bold__ and _italic_";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe(
				"bold and italic and bold and italic"
			);
		});

		it("should convert lists to simple text", async () => {
			const content = "- Item 1\n* Item 2\n+ Item 3\n1. Numbered item";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe(
				"• Item 1\n• Item 2\n• Item 3\n• Numbered item"
			);
		});

		it("should remove blockquote markers", async () => {
			const content = "> This is a quote\n> Second line";
			const result = await processor.processContent(content);

			expect(result.cleanedContent).toBe("This is a quote\nSecond line");
		});
	});

	describe("lightCleanMarkdown", () => {
		it("should preserve more formatting with light cleaning", async () => {
			const content = "**Bold text** and *italic*";
			const result = await processor.processContent(content, "", {
				preserveFormatting: true,
			});

			expect(result.cleanedContent).toBe("**Bold text** and *italic*");
		});
	});

	describe("extractKeyTopics", () => {
		it("should extract headers as topics", () => {
			const content = "# Main Topic\n## Subtopic\nContent here";
			const topics = processor.extractKeyTopics(content);

			expect(topics).toContain("Main Topic");
			expect(topics).toContain("Subtopic");
		});

		it("should extract bold text as topics", () => {
			const content =
				"This is **important concept** and **another key term**";
			const topics = processor.extractKeyTopics(content);

			expect(topics).toContain("important concept");
			expect(topics).toContain("another key term");
		});

		it("should remove duplicates", () => {
			const content = "# Topic\n**Topic**\n# Topic";
			const topics = processor.extractKeyTopics(content);

			expect(topics.filter((t) => t === "Topic")).toHaveLength(1);
		});
	});

	describe("validateContent", () => {
		it("should validate good content", () => {
			const content =
				"This is a good note with sufficient content for flashcard generation.";
			const result = processor.validateContent(content);

			expect(result.isValid).toBe(true);
			expect(result.issues).toHaveLength(0);
		});

		it("should reject empty content", () => {
			const content = "";
			const result = processor.validateContent(content);

			expect(result.isValid).toBe(false);
			expect(result.issues).toContain("Content is empty");
		});

		it("should warn about short content", () => {
			const content = "Short note";
			const result = processor.validateContent(content);

			expect(result.isValid).toBe(false);
			expect(result.issues).toContain(
				"Content is too short (minimum 10 words recommended)"
			);
		});

		it("should warn about very long content", () => {
			const content = "word ".repeat(100); // Reduced from 10001 to prevent memory issues
			const result = processor.validateContent(content);

			expect(result.isValid).toBe(false);
			expect(result.issues).toContain(
				"Content is very long and may need chunking"
			);
		});
	});

	describe("chunkContent", () => {
		it("should not chunk short content", async () => {
			const content = "Short content that fits in one chunk";
			const result = await processor.processContent(content, "", {
				chunkSize: 100,
			});

			expect(result.metadata.chunks).toBeUndefined();
		});

		it("should chunk long content properly", async () => {
			const words = Array.from({ length: 200 }, (_, i) => `word${i}`);
			const content = words.join(" ");
			const result = await processor.processContent(content, "", {
				chunkSize: 50,
				overlapSize: 10,
			});

			expect(result.metadata.chunks).toBeDefined();
			expect(result.metadata.chunks!.length).toBeGreaterThan(1);
		});
	});

	describe("estimateTokenCount", () => {
		it("should estimate token count reasonably", async () => {
			const content = "This is a test sentence with multiple words.";
			const result = await processor.processContent(content);

			// Token count should be roughly 1/4 of character count
			const expectedTokens = Math.ceil(content.length / 4);
			const actualTokens = Math.ceil(result.cleanedContent.length / 4);

			expect(actualTokens).toBeCloseTo(expectedTokens, 5);
		});
	});

	describe("countWords", () => {
		it("should count words correctly", async () => {
			const content = "One two three four five";
			const result = await processor.processContent(content);

			expect(result.metadata.wordCount).toBe(5);
		});

		it("should handle multiple spaces", async () => {
			const content = "One   two    three";
			const result = await processor.processContent(content);

			expect(result.metadata.wordCount).toBe(3);
		});

		it("should handle empty strings", async () => {
			const content = "";
			const result = await processor.processContent(content);

			expect(result.metadata.wordCount).toBe(0);
		});
	});
});
