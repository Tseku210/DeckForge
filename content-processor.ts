import { TFile } from "obsidian";
import { ErrorHandler } from "./error-handler";

export interface ContentMetadata {
	title: string;
	wordCount: number;
	hasImages: boolean;
	hasLinks: boolean;
	hasCodeBlocks: boolean;
	chunks?: string[];
}

export interface ProcessedContent {
	cleanedContent: string;
	originalContent: string;
	metadata: ContentMetadata;
}

export interface ContentProcessingOptions {
	maxTokens?: number;
	preserveFormatting?: boolean;
	includeMetadata?: boolean;
	chunkSize?: number;
	overlapSize?: number;
}

export class ContentProcessor {
	private readonly DEFAULT_MAX_TOKENS = 4000;
	private readonly DEFAULT_CHUNK_SIZE = 3000;
	private readonly DEFAULT_OVERLAP_SIZE = 200;

	/**
	 * Process note content for LLM consumption
	 */
	async processContent(
		content: string,
		title: string = "",
		options: ContentProcessingOptions = {}
	): Promise<ProcessedContent> {
		const {
			maxTokens = this.DEFAULT_MAX_TOKENS,
			preserveFormatting = false,
			includeMetadata = true,
			chunkSize = this.DEFAULT_CHUNK_SIZE,
			overlapSize = this.DEFAULT_OVERLAP_SIZE,
		} = options;

		// Extract metadata first
		const metadata = this.extractMetadata(content, title);

		// Clean the content
		let cleanedContent = preserveFormatting
			? this.lightCleanMarkdown(content)
			: this.cleanMarkdown(content);

		// Handle large content with chunking if necessary
		const estimatedTokens = this.estimateTokenCount(cleanedContent);
		if (estimatedTokens > maxTokens) {
			const chunks = this.chunkContent(
				cleanedContent,
				chunkSize,
				overlapSize
			);
			metadata.chunks = chunks;
			// For now, use the first chunk as the main content
			// In a full implementation, you might want to process all chunks
			cleanedContent = chunks[0] || cleanedContent;
		}

		return {
			cleanedContent,
			originalContent: content,
			metadata,
		};
	}

	/**
	 * Extract metadata from content
	 */
	private extractMetadata(content: string, title: string): ContentMetadata {
		const wordCount = this.countWords(content);
		const hasImages = /!\[.*?\]\(.*?\)/.test(content);
		const hasLinks = /\[.*?\]\(.*?\)/.test(content);
		const hasCodeBlocks = /```[\s\S]*?```|`[^`]+`/.test(content);

		return {
			title: title || "Untitled",
			wordCount,
			hasImages,
			hasLinks,
			hasCodeBlocks,
		};
	}

	/**
	 * Clean markdown formatting while preserving important content
	 */
	private cleanMarkdown(content: string): string {
		let cleaned = content;

		// Remove frontmatter
		cleaned = cleaned.replace(/^---[\s\S]*?---\n?/m, "");

		// Convert headers to plain text with context
		cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, "$1");

		// Remove image syntax but keep alt text
		cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

		// Convert links to just the text
		cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

		// Remove code block markers but keep content
		cleaned = cleaned.replace(/```[\w]*\n([\s\S]*?)\n```/g, "$1");

		// Remove inline code markers
		cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

		// Remove bold/italic markers
		cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
		cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
		cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
		cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

		// Remove strikethrough
		cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");

		// Convert lists to simple text
		cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "• ");
		cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, "• ");

		// Remove blockquote markers
		cleaned = cleaned.replace(/^>\s*/gm, "");

		// Clean up excessive whitespace
		cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
		cleaned = cleaned.replace(/[ \t]+/g, " ");
		cleaned = cleaned.trim();

		return cleaned;
	}

	/**
	 * Light cleaning that preserves more formatting
	 */
	private lightCleanMarkdown(content: string): string {
		let cleaned = content;

		// Remove frontmatter
		cleaned = cleaned.replace(/^---[\s\S]*?---\n?/m, "");

		// Clean up excessive whitespace
		cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
		cleaned = cleaned.trim();

		return cleaned;
	}

	/**
	 * Chunk content into smaller pieces for large documents
	 */
	private chunkContent(
		content: string,
		chunkSize: number,
		overlapSize: number
	): string[] {
		const words = content.split(/\s+/);
		const chunks: string[] = [];

		if (words.length <= chunkSize) {
			return [content];
		}

		let startIndex = 0;
		while (startIndex < words.length) {
			const endIndex = Math.min(startIndex + chunkSize, words.length);
			const chunk = words.slice(startIndex, endIndex).join(" ");
			chunks.push(chunk);

			// Move start index forward, accounting for overlap
			startIndex = endIndex - overlapSize;
			if (startIndex >= words.length) break;
		}

		return chunks;
	}

	/**
	 * Estimate token count (rough approximation)
	 */
	private estimateTokenCount(text: string): number {
		// Rough estimation: 1 token ≈ 4 characters for English text
		return Math.ceil(text.length / 4);
	}

	/**
	 * Count words in content
	 */
	private countWords(content: string): number {
		return content
			.trim()
			.split(/\s+/)
			.filter((word) => word.length > 0).length;
	}

	/**
	 * Extract key topics or sections from content
	 */
	extractKeyTopics(content: string): string[] {
		const topics: string[] = [];

		// Extract headers as topics
		const headerMatches = content.match(/^#{1,6}\s+(.+)$/gm);
		if (headerMatches) {
			topics.push(
				...headerMatches.map((header) => header.replace(/^#+\s+/, ""))
			);
		}

		// Extract bold text as potential key terms
		const boldMatches = content.match(/\*\*([^*]+)\*\*/g);
		if (boldMatches) {
			topics.push(
				...boldMatches.map((bold) => bold.replace(/\*\*/g, ""))
			);
		}

		return [...new Set(topics)]; // Remove duplicates
	}

	/**
	 * Validate content for flashcard generation
	 * @deprecated Use InputValidator.validateNoteContent instead
	 */
	validateContent(
		content: string,
		longContentThreshold: number = 10000
	): { isValid: boolean; issues: string[] } {
		// This method is kept for backward compatibility
		// New code should use InputValidator.validateNoteContent
		const issues: string[] = [];

		if (!content || content.trim().length === 0) {
			issues.push("Content is empty");
		}

		const wordCount = this.countWords(content);
		if (wordCount < 10) {
			issues.push("Content is too short (minimum 10 words recommended)");
		}

		if (wordCount > longContentThreshold) {
			issues.push("Content is very long and may need chunking");
		}

		return {
			isValid: issues.length === 0,
			issues,
		};
	}
}
