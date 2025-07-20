import { App, Editor, MarkdownView, TFile } from 'obsidian';

export interface FileManagerOptions {
  placement: 'cursor' | 'bottom' | 'separate-file';
  fileNamingPattern: string;
  defaultTags: string[];
}

export interface InsertionResult {
  success: boolean;
  message?: string;
  filePath?: string;
  error?: string;
}

export class FileManager {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Main method to handle flashcard placement based on options
   * 
   * @param formattedContent - Formatted flashcard content to place
   * @param editor - Obsidian editor instance
   * @param view - Markdown view instance
   * @param options - Placement options (location, file naming, tags)
   * @returns Promise with insertion result
   */
  async placeFlashcards(
    formattedContent: string,
    editor?: Editor,
    view?: MarkdownView,
    options?: FileManagerOptions
  ): Promise<InsertionResult> {
    try {
      if (!options) {
        return {
          success: false,
          error: 'File manager options are required'
        };
      }

      switch (options.placement) {
        case 'cursor':
          return await this.insertAtCursor(formattedContent, editor);
        case 'bottom':
          return await this.insertAtBottom(formattedContent, editor, view);
        case 'separate-file':
          return await this.createSeparateFile(formattedContent, view, options);
        default:
          return {
            success: false,
            error: `Unknown placement option: ${options.placement}`
          };
      }
    } catch (error) {
      console.error('Error placing flashcards:', error);
      return {
        success: false,
        error: `Failed to place flashcards: ${error.message}`
      };
    }
  }

  /**
   * Inserts flashcards at the current cursor position
   * 
   * @param formattedContent - Formatted flashcard content to insert
   * @param editor - Obsidian editor instance
   * @returns Promise with insertion result
   */
  async insertAtCursor(formattedContent: string, editor?: Editor): Promise<InsertionResult> {
    if (!editor) {
      return {
        success: false,
        error: 'Editor is required for cursor insertion'
      };
    }

    try {
      // Validate insertion won't disrupt existing flashcards
      const validation = this.validateInlineInsertion(editor);
      if (!validation.canInsert) {
        return {
          success: false,
          error: 'Cannot insert at cursor position due to existing flashcard content'
        };
      }

      const cursor = editor.getCursor();
      const currentLine = editor.getLine(cursor.line);

      // Check if we're in the middle of existing content
      const insertionText = this.prepareInlineInsertion(formattedContent, currentLine, cursor.ch);

      editor.replaceRange(insertionText, cursor);

      // Move cursor to end of inserted content
      const lines = insertionText.split('\n');
      const newCursor = {
        line: cursor.line + lines.length - 1,
        ch: lines[lines.length - 1].length
      };
      editor.setCursor(newCursor);

      return {
        success: true,
        message: 'Flashcards inserted at cursor position'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to insert at cursor: ${error.message}`
      };
    }
  }

  /**
   * Inserts flashcards at the bottom of the current note
   * 
   * @param formattedContent - Formatted flashcard content to insert
   * @param editor - Obsidian editor instance
   * @param view - Markdown view instance (unused but kept for API consistency)
   * @returns Promise with insertion result
   */
  async insertAtBottom(
    formattedContent: string,
    editor?: Editor,
    view?: MarkdownView
  ): Promise<InsertionResult> {
    if (!editor) {
      return {
        success: false,
        error: 'Editor is required for bottom insertion'
      };
    }

    try {
      const content = editor.getValue();
      const lines = content.split('\n');

      // Find the last non-empty line to determine proper spacing
      let lastContentLine = lines.length - 1;
      while (lastContentLine >= 0 && lines[lastContentLine].trim() === '') {
        lastContentLine--;
      }

      // Prepare insertion with proper spacing
      let insertionText = '';

      // Add spacing if there's existing content
      if (lastContentLine >= 0) {
        insertionText = '\n\n';
      }

      // Add a section header for flashcards
      insertionText += '## Flashcards\n\n';
      insertionText += formattedContent;

      // Insert at the end of the document
      const endPosition = { line: lines.length - 1, ch: lines[lines.length - 1].length };
      editor.replaceRange(insertionText, endPosition);

      return {
        success: true,
        message: 'Flashcards added to bottom of note'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to insert at bottom: ${error.message}`
      };
    }
  }

  /**
   * Creates a separate file for flashcards with proper naming and linking
   * 
   * @param formattedContent - Formatted flashcard content to save
   * @param view - Markdown view instance
   * @param options - File manager options for naming and tags
   * @returns Promise with insertion result
   */
  async createSeparateFile(
    formattedContent: string,
    view?: MarkdownView,
    options?: FileManagerOptions
  ): Promise<InsertionResult> {
    if (!view || !view.file) {
      return {
        success: false,
        error: 'Active file is required for separate file creation'
      };
    }

    try {
      const sourceFile = view.file;
      const flashcardFileName = this.generateFlashcardFileName(sourceFile, options?.fileNamingPattern);
      const flashcardFilePath = this.getFlashcardFilePath(sourceFile, flashcardFileName);

      // Create flashcard file content
      const fileContent = this.createFlashcardFileContent(
        formattedContent,
        sourceFile.basename,
        options?.defaultTags || []
      );

      // Create the flashcard file
      const flashcardFile = await this.app.vault.create(flashcardFilePath, fileContent);

      // Add link to flashcard file in source note
      await this.addFlashcardLink(view, flashcardFile);

      return {
        success: true,
        message: `Flashcards created in separate file: ${flashcardFileName}`,
        filePath: flashcardFilePath
      };
    } catch (error) {
      // Handle case where file already exists
      if (error.message.includes('already exists')) {
        return await this.handleExistingFlashcardFile(formattedContent, view, options);
      }

      return {
        success: false,
        error: `Failed to create separate file: ${error.message}`
      };
    }
  }

  /**
   * Prepares content for inline insertion with proper spacing
   * 
   * @param content - Formatted flashcard content to insert
   * @param currentLine - Current line text at cursor position
   * @param cursorPosition - Cursor position within the line
   * @returns Properly formatted text with appropriate spacing
   */
  private prepareInlineInsertion(content: string, currentLine: string, cursorPosition: number): string {
    let insertionText = '';

    // Check if cursor is at the beginning of a line
    if (cursorPosition === 0) {
      insertionText = content + '\n\n';
    }
    // Check if cursor is at the end of a line
    else if (cursorPosition === currentLine.length) {
      // Add spacing if the current line has content
      if (currentLine.trim().length > 0) {
        insertionText = '\n\n' + content + '\n\n';
      } else {
        insertionText = content + '\n\n';
      }
    }
    // Cursor is in the middle of a line
    else {
      insertionText = '\n\n' + content + '\n\n';
    }

    return insertionText;
  }

  /**
   * Generates the flashcard file name based on the pattern
   * 
   * @param sourceFile - Source file to generate name from
   * @param pattern - Optional naming pattern with {filename} placeholder
   * @returns Generated filename for flashcards
   */
  private generateFlashcardFileName(sourceFile: TFile, pattern?: string): string {
    const defaultPattern = '{filename}-fcards.md';
    const filePattern = pattern || defaultPattern;

    const baseName = sourceFile.basename;
    return filePattern.replace('{filename}', baseName);
  }

  /**
   * Gets the full path for the flashcard file in the same directory as source
   * 
   * @param sourceFile - Source file to determine directory
   * @param fileName - Generated flashcard file name
   * @returns Full path for the flashcard file
   */
  private getFlashcardFilePath(sourceFile: TFile, fileName: string): string {
    const sourceDir = sourceFile.parent?.path || '';
    return sourceDir ? `${sourceDir}/${fileName}` : fileName;
  }

  /**
   * Creates the content for the flashcard file
   * 
   * @param flashcardContent - Formatted flashcard content to include
   * @param sourceFileName - Name of the source file
   * @param defaultTags - Tags to apply to the flashcards
   * @returns Complete content for the flashcard file
   */
  private createFlashcardFileContent(
    flashcardContent: string,
    sourceFileName: string,
    defaultTags: string[]
  ): string {
    let content = '';

    // Add #flashcards tag at the very top for Spaced Repetition plugin recognition
    content += '#flashcards\n\n';

    // Add frontmatter with metadata
    content += '---\n';
    content += `source: "[[${sourceFileName}]]"\n`;
    content += `created: ${new Date().toISOString().split('T')[0]}\n`;
    if (defaultTags.length > 1 || (defaultTags.length === 1 && !defaultTags[0].includes('flashcard'))) {
      // Only add other tags to frontmatter, not the #flashcard tag since it's already at the top
      const otherTags = defaultTags.filter(tag => !tag.toLowerCase().includes('flashcard'));
      if (otherTags.length > 0) {
        content += `tags: [${otherTags.map(tag => `"${tag}"`).join(', ')}]\n`;
      }
    }
    content += '---\n\n';

    // Add title
    content += `# Flashcards from ${sourceFileName}\n\n`;

    // Add link back to source
    content += `> Generated from [[${sourceFileName}]]\n\n`;

    // Add the flashcard content
    content += flashcardContent;

    return content;
  }

  /**
   * Adds a link to the flashcard file in the source note
   * 
   * @param view - Markdown view instance
   * @param flashcardFile - The created flashcard file
   * @returns Promise that resolves when the link is added
   */
  private async addFlashcardLink(view: MarkdownView, flashcardFile: TFile): Promise<void> {
    const editor = view.editor;
    const content = editor.getValue();

    // Check if link already exists
    const linkText = `[[${flashcardFile.basename}]]`;
    if (content.includes(linkText)) {
      return; // Link already exists
    }

    // Add link at the bottom of the file
    const lines = content.split('\n');
    let insertionText = '';

    // Add proper spacing
    if (content.trim().length > 0) {
      insertionText = '\n\n';
    }

    insertionText += `## Related\n\n📚 **Flashcards**: ${linkText}\n`;

    const endPosition = { line: lines.length - 1, ch: lines[lines.length - 1].length };
    editor.replaceRange(insertionText, endPosition);
  }

  /**
   * Handles the case where a flashcard file already exists
   * 
   * @param formattedContent - New flashcard content to append
   * @param view - Markdown view instance
   * @param options - File manager options
   * @returns Promise with insertion result
   */
  private async handleExistingFlashcardFile(
    formattedContent: string,
    view: MarkdownView,
    options?: FileManagerOptions
  ): Promise<InsertionResult> {
    try {
      const sourceFile = view.file!;
      const flashcardFileName = this.generateFlashcardFileName(sourceFile, options?.fileNamingPattern);
      const flashcardFilePath = this.getFlashcardFilePath(sourceFile, flashcardFileName);

      // Get existing file
      const existingFile = this.app.vault.getAbstractFileByPath(flashcardFilePath) as TFile;
      if (!existingFile) {
        throw new Error('File exists but cannot be found');
      }

      // Read existing content
      const existingContent = await this.app.vault.read(existingFile);

      // Append new flashcards to existing file
      const updatedContent = this.appendToExistingFlashcardFile(existingContent, formattedContent);

      // Update the file
      await this.app.vault.modify(existingFile, updatedContent);

      return {
        success: true,
        message: `Flashcards appended to existing file: ${flashcardFileName}`,
        filePath: flashcardFilePath
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update existing flashcard file: ${error.message}`
      };
    }
  }

  /**
   * Appends new flashcards to existing flashcard file content
   * 
   * @param existingContent - Current content of the flashcard file
   * @param newContent - New flashcard content to append
   * @returns Updated file content with appended flashcards
   */
  private appendToExistingFlashcardFile(existingContent: string, newContent: string): string {
    // Add separator and new content
    let updatedContent = existingContent.trim();

    // Add timestamp for new additions
    updatedContent += '\n\n---\n';
    updatedContent += `*Added on ${new Date().toISOString().split('T')[0]}*\n\n`;
    updatedContent += newContent;

    return updatedContent;
  }

  /**
   * Validates that inline insertion won't disrupt existing flashcards
   * 
   * @param editor - Obsidian editor instance
   * @returns Object with validation result and optional warning
   */
  private validateInlineInsertion(editor: Editor): { canInsert: boolean; warning?: string } {
    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);

    // Check if current line contains flashcard syntax
    const flashcardPatterns = ['::', ':::', '?', '=='];
    const hasFlashcardSyntax = flashcardPatterns.some(pattern => currentLine.includes(pattern));

    if (hasFlashcardSyntax) {
      return {
        canInsert: true,
        warning: 'Current line contains flashcard syntax. New flashcards will be inserted with spacing to avoid conflicts.'
      };
    }

    return { canInsert: true };
  }

  /**
   * Gets information about the current file and cursor position
   * 
   * @param editor - Obsidian editor instance (optional)
   * @param view - Markdown view instance (optional)
   * @returns Object with context information about the current editing state
   */
  getInsertionContext(editor?: Editor, view?: MarkdownView): {
    hasEditor: boolean;
    hasView: boolean;
    hasFile: boolean;
    cursorPosition?: { line: number; ch: number };
    fileName?: string;
  } {
    return {
      hasEditor: !!editor,
      hasView: !!view,
      hasFile: !!(view?.file),
      cursorPosition: editor?.getCursor(),
      fileName: view?.file?.basename
    };
  }
}