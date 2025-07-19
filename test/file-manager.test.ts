import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileManager, FileManagerOptions } from '../file-manager';

// Mock Obsidian classes
const mockEditor = {
  getCursor: vi.fn(),
  getLine: vi.fn(),
  replaceRange: vi.fn(),
  setCursor: vi.fn(),
  getValue: vi.fn()
};

const mockView = {
  editor: mockEditor,
  file: {
    basename: 'test-note',
    parent: { path: 'folder' }
  }
};

const mockApp = {
  vault: {
    create: vi.fn(),
    read: vi.fn(),
    modify: vi.fn(),
    getAbstractFileByPath: vi.fn()
  }
};

vi.mock('obsidian', () => ({
  App: vi.fn(),
  Editor: vi.fn(),
  MarkdownView: vi.fn(),
  TFile: vi.fn()
}));

describe('FileManager', () => {
  let fileManager: FileManager;
  let options: FileManagerOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    fileManager = new FileManager(mockApp as any);
    options = {
      placement: 'cursor',
      fileNamingPattern: '{filename}-fcards.md',
      defaultTags: ['#flashcards']
    };
  });

  describe('placeFlashcards', () => {
    it('should handle cursor placement', async () => {
      mockEditor.getCursor.mockReturnValue({ line: 0, ch: 0 });
      mockEditor.getLine.mockReturnValue('');

      const result = await fileManager.placeFlashcards(
        'Question::Answer',
        mockEditor as any,
        mockView as any,
        { ...options, placement: 'cursor' }
      );

      expect(result.success).toBe(true);
      expect(mockEditor.replaceRange).toHaveBeenCalled();
      expect(mockEditor.setCursor).toHaveBeenCalled();
    });

    it('should handle bottom placement', async () => {
      mockEditor.getValue.mockReturnValue('Existing content');

      const result = await fileManager.placeFlashcards(
        'Question::Answer',
        mockEditor as any,
        mockView as any,
        { ...options, placement: 'bottom' }
      );

      expect(result.success).toBe(true);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        expect.stringContaining('## Flashcards'),
        expect.any(Object)
      );
    });

    it('should handle separate file placement', async () => {
      mockApp.vault.create.mockResolvedValue({ basename: 'test-note-fcards' });

      const result = await fileManager.placeFlashcards(
        'Question::Answer',
        mockEditor as any,
        mockView as any,
        { ...options, placement: 'separate-file' }
      );

      expect(result.success).toBe(true);
      expect(mockApp.vault.create).toHaveBeenCalled();
      expect(result.filePath).toBeDefined();
    });

    it('should return error for missing options', async () => {
      const result = await fileManager.placeFlashcards(
        'Question::Answer',
        mockEditor as any,
        mockView as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('File manager options are required');
    });

    it('should return error for unknown placement option', async () => {
      const result = await fileManager.placeFlashcards(
        'Question::Answer',
        mockEditor as any,
        mockView as any,
        { ...options, placement: 'unknown' as any }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown placement option');
    });
  });

  describe('insertAtCursor', () => {
    it('should insert at beginning of line', async () => {
      mockEditor.getCursor.mockReturnValue({ line: 0, ch: 0 });
      mockEditor.getLine.mockReturnValue('');

      const result = await fileManager.insertAtCursor('Question::Answer', mockEditor as any);

      expect(result.success).toBe(true);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        'Question::Answer\n\n',
        { line: 0, ch: 0 }
      );
    });

    it('should insert at end of line with content', async () => {
      mockEditor.getCursor.mockReturnValue({ line: 0, ch: 12 });
      mockEditor.getLine.mockReturnValue('Some content');

      const result = await fileManager.insertAtCursor('Question::Answer', mockEditor as any);

      expect(result.success).toBe(true);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        '\n\nQuestion::Answer\n\n',
        { line: 0, ch: 12 }
      );
    });

    it('should insert in middle of line', async () => {
      mockEditor.getCursor.mockReturnValue({ line: 0, ch: 5 });
      mockEditor.getLine.mockReturnValue('Some content here');

      const result = await fileManager.insertAtCursor('Question::Answer', mockEditor as any);

      expect(result.success).toBe(true);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        '\n\nQuestion::Answer\n\n',
        { line: 0, ch: 5 }
      );
    });

    it('should return error when editor is missing', async () => {
      const result = await fileManager.insertAtCursor('Question::Answer');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Editor is required for cursor insertion');
    });
  });

  describe('insertAtBottom', () => {
    it('should insert at bottom of empty document', async () => {
      mockEditor.getValue.mockReturnValue('');

      const result = await fileManager.insertAtBottom('Question::Answer', mockEditor as any);

      expect(result.success).toBe(true);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        '## Flashcards\n\nQuestion::Answer',
        { line: 0, ch: 0 }
      );
    });

    it('should insert at bottom of document with content', async () => {
      mockEditor.getValue.mockReturnValue('Existing content\nMore content');

      const result = await fileManager.insertAtBottom('Question::Answer', mockEditor as any);

      expect(result.success).toBe(true);
      expect(mockEditor.replaceRange).toHaveBeenCalledWith(
        expect.stringContaining('\n\n## Flashcards\n\nQuestion::Answer'),
        { line: 1, ch: 12 }
      );
    });

    it('should return error when editor is missing', async () => {
      const result = await fileManager.insertAtBottom('Question::Answer');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Editor is required for bottom insertion');
    });
  });

  describe('createSeparateFile', () => {
    it('should create new flashcard file', async () => {
      mockApp.vault.create.mockResolvedValue({ basename: 'test-note-fcards' });

      const result = await fileManager.createSeparateFile(
        'Question::Answer',
        mockView as any,
        options
      );

      expect(result.success).toBe(true);
      expect(mockApp.vault.create).toHaveBeenCalledWith(
        'folder/test-note-fcards.md',
        expect.stringContaining('#flashcards')
      );
      expect(mockEditor.replaceRange).toHaveBeenCalled(); // For adding link
    });

    it('should handle existing file by appending', async () => {
      const error = new Error('File already exists');
      error.message = 'already exists';
      mockApp.vault.create.mockRejectedValue(error);

      mockApp.vault.getAbstractFileByPath.mockReturnValue({ basename: 'test-note-fcards' });
      mockApp.vault.read.mockResolvedValue('Existing content');
      mockApp.vault.modify.mockResolvedValue(undefined);

      const result = await fileManager.createSeparateFile(
        'Question::Answer',
        mockView as any,
        options
      );

      expect(result.success).toBe(true);
      expect(mockApp.vault.modify).toHaveBeenCalled();
    });

    it('should return error when view is missing', async () => {
      const result = await fileManager.createSeparateFile('Question::Answer');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Active file is required for separate file creation');
    });

    it('should return error when file is missing', async () => {
      const viewWithoutFile = { ...mockView, file: null };

      const result = await fileManager.createSeparateFile(
        'Question::Answer',
        viewWithoutFile as any,
        options
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Active file is required for separate file creation');
    });
  });

  describe('getInsertionContext', () => {
    it('should return context information', () => {
      mockEditor.getCursor.mockReturnValue({ line: 5, ch: 10 });

      const context = fileManager.getInsertionContext(mockEditor as any, mockView as any);

      expect(context.hasEditor).toBe(true);
      expect(context.hasView).toBe(true);
      expect(context.hasFile).toBe(true);
      expect(context.cursorPosition).toEqual({ line: 5, ch: 10 });
      expect(context.fileName).toBe('test-note');
    });

    it('should handle missing editor and view', () => {
      const context = fileManager.getInsertionContext();

      expect(context.hasEditor).toBe(false);
      expect(context.hasView).toBe(false);
      expect(context.hasFile).toBe(false);
      expect(context.cursorPosition).toBeUndefined();
      expect(context.fileName).toBeUndefined();
    });
  });

  describe('file naming and paths', () => {
    it('should generate correct flashcard file name', async () => {
      mockApp.vault.create.mockResolvedValue({ basename: 'my-note-fcards' });

      await fileManager.createSeparateFile(
        'Question::Answer',
        mockView as any,
        { ...options, fileNamingPattern: '{filename}-fcards.md' }
      );

      expect(mockApp.vault.create).toHaveBeenCalledWith(
        'folder/test-note-fcards.md',
        expect.any(String)
      );
    });

    it('should handle custom file naming pattern', async () => {
      mockApp.vault.create.mockResolvedValue({ basename: 'flashcards-my-note' });

      await fileManager.createSeparateFile(
        'Question::Answer',
        mockView as any,
        { ...options, fileNamingPattern: 'flashcards-{filename}.md' }
      );

      expect(mockApp.vault.create).toHaveBeenCalledWith(
        'folder/flashcards-test-note.md',
        expect.any(String)
      );
    });

    it('should handle files in root directory', async () => {
      const rootView = {
        ...mockView,
        file: { basename: 'root-note', parent: null }
      };
      mockApp.vault.create.mockResolvedValue({ basename: 'root-note-fcards' });

      await fileManager.createSeparateFile(
        'Question::Answer',
        rootView as any,
        options
      );

      expect(mockApp.vault.create).toHaveBeenCalledWith(
        'root-note-fcards.md',
        expect.any(String)
      );
    });
  });

  describe('flashcard file content creation', () => {
    it('should create proper file content with metadata', async () => {
      mockApp.vault.create.mockResolvedValue({ basename: 'test-note-fcards' });

      await fileManager.createSeparateFile(
        'Question::Answer',
        mockView as any,
        { ...options, defaultTags: ['#flashcards', '#biology'] }
      );

      const createCall = mockApp.vault.create.mock.calls[0];
      const fileContent = createCall[1];

      expect(fileContent).toContain('#flashcards');
      expect(fileContent).toContain('source: "[[test-note]]"');
      expect(fileContent).toContain('created:');
      expect(fileContent).toContain('tags: ["#biology"]');
      expect(fileContent).toContain('# Flashcards from test-note');
      expect(fileContent).toContain('Question::Answer');
    });

    it('should handle tags correctly in frontmatter', async () => {
      mockApp.vault.create.mockResolvedValue({ basename: 'test-note-fcards' });

      await fileManager.createSeparateFile(
        'Question::Answer',
        mockView as any,
        { ...options, defaultTags: ['#flashcards'] }
      );

      const createCall = mockApp.vault.create.mock.calls[0];
      const fileContent = createCall[1];

      // Should not duplicate flashcard tag in frontmatter
      expect(fileContent).not.toContain('tags: ["#flashcards"]');
      expect(fileContent).toContain('#flashcards\n\n---');
    });
  });

  describe('error handling', () => {
    it('should handle vault creation errors', async () => {
      mockApp.vault.create.mockRejectedValue(new Error('Permission denied'));

      const result = await fileManager.createSeparateFile(
        'Question::Answer',
        mockView as any,
        options
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create separate file');
    });

    it('should handle editor errors', async () => {
      mockEditor.replaceRange.mockImplementation(() => {
        throw new Error('Editor error');
      });

      const result = await fileManager.insertAtCursor('Question::Answer', mockEditor as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to insert at cursor');
    });
  });
});