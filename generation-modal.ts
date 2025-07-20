import { App, Modal, Setting } from 'obsidian';
import { CardType, GenerationOptions } from './types';
import { InputValidator } from './input-validator';
import { ErrorHandler } from './error-handler';

export interface GenerationModalOptions {
  maxCards?: number;
  cardTypes: CardType[];
  customPrompt?: string;
  tags?: string[];
  placement: 'cursor' | 'bottom' | 'separate-file';
  customTags?: string[];
}

export class GenerationOptionsModal extends Modal {
  private onSubmit: (options: GenerationModalOptions) => void;
  private defaultOptions: GenerationOptions;
  private defaultPlacement: 'cursor' | 'bottom' | 'separate-file';
  private defaultTags: string[];

  // Form state
  private maxCards?: number;
  private useAutoCards: boolean = true;
  private selectedCardTypes: CardType[] = [CardType.OneWay];
  private customPrompt: string = '';
  private selectedTags: string[] = [];
  private selectedPlacement: 'cursor' | 'bottom' | 'separate-file' = 'cursor';
  private customTagsInput: string = '';

  constructor(
    app: App,
    onSubmit: (options: GenerationModalOptions) => void,
    defaultOptions: GenerationOptions,
    defaultPlacement: 'cursor' | 'bottom' | 'separate-file',
    defaultTags: string[]
  ) {
    super(app);
    this.onSubmit = onSubmit;
    this.defaultOptions = defaultOptions;
    this.defaultPlacement = defaultPlacement;
    this.defaultTags = defaultTags;

    // Initialize form state with defaults
    this.maxCards = defaultOptions.maxCards;
    this.useAutoCards = !defaultOptions.maxCards; // Auto if no maxCards specified
    this.selectedCardTypes = [...defaultOptions.cardTypes];
    this.customPrompt = defaultOptions.customPrompt || '';
    this.selectedTags = [...(defaultOptions.tags || defaultTags)];
    this.selectedPlacement = defaultPlacement;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Generate Flashcards' });
    contentEl.createEl('p', {
      text: 'Configure options for flashcard generation from the current note.',
      cls: 'setting-item-description'
    });

    // Number of cards - Auto vs Manual
    new Setting(contentEl)
      .setName('Number of cards')
      .setDesc('Let AI decide based on content, or set a specific limit')
      .addToggle(toggle => {
        toggle
          .setValue(this.useAutoCards)
          .onChange((value) => {
            this.useAutoCards = value;
            if (value) {
              this.maxCards = undefined;
            } else {
              this.maxCards = 5; // Default when switching to manual
            }
            // Refresh the modal to show/hide slider
            this.refreshCardCountUI();
          });
      })
      .addExtraButton(button => {
        button.setIcon('info');
        button.setTooltip('When enabled, the AI will determine the optimal number of cards based on your content length and complexity');
      });

    // Add description for the toggle
    const toggleDesc = contentEl.createDiv('setting-item-description');
    toggleDesc.style.marginTop = '-10px';
    toggleDesc.style.marginBottom = '15px';
    toggleDesc.textContent = this.useAutoCards ?
      '✨ AI will decide the optimal number of cards' :
      '🎯 You control the maximum number of cards';

    // Manual card count slider (only shown when not using auto)
    if (!this.useAutoCards) {
      const sliderContainer = contentEl.createDiv('manual-card-count');
      new Setting(sliderContainer)
        .setName('Maximum cards')
        .setDesc('Set the maximum number of flashcards to generate (1-50)')
        .addSlider(slider => {
          slider
            .setLimits(1, 50, 1)
            .setValue(this.maxCards || 5)
            .setDynamicTooltip()
            .onChange((value) => {
              this.maxCards = value;
            });
        });
    }

    // Card types selection
    const cardTypesContainer = contentEl.createDiv();
    new Setting(cardTypesContainer)
      .setName('Card types')
      .setDesc('Select which types of flashcards to generate');

    const cardTypeOptions = [
      { type: CardType.OneWay, name: 'One-way (::)', desc: 'Question → Answer' },
      { type: CardType.Bidirectional, name: 'Bidirectional (:::)', desc: 'Question ↔ Answer' },
      { type: CardType.MultiLine, name: 'Multi-line (?)', desc: 'Multi-line questions' },
      { type: CardType.MultiLineBidirectional, name: 'Multi-line Bidirectional', desc: 'Multi-line bidirectional' },
      { type: CardType.Cloze, name: 'Cloze (==)', desc: 'Fill-in-the-blank cards' }
    ];

    cardTypeOptions.forEach(option => {
      new Setting(cardTypesContainer)
        .setName(option.name)
        .setDesc(option.desc)
        .addToggle(toggle => {
          toggle
            .setValue(this.selectedCardTypes.includes(option.type))
            .onChange((value) => {
              if (value) {
                if (!this.selectedCardTypes.includes(option.type)) {
                  this.selectedCardTypes.push(option.type);
                }
              } else {
                this.selectedCardTypes = this.selectedCardTypes.filter(t => t !== option.type);
              }
            });
        });
    });

    // Output placement
    new Setting(contentEl)
      .setName('Output placement')
      .setDesc('Where to place the generated flashcards')
      .addDropdown(dropdown => {
        dropdown.addOption('cursor', 'At cursor position');
        dropdown.addOption('bottom', 'At bottom of note');
        dropdown.addOption('separate-file', 'Create separate file');
        dropdown.setValue(this.selectedPlacement);
        dropdown.onChange((value: 'cursor' | 'bottom' | 'separate-file') => {
          this.selectedPlacement = value;
        });
      });

    // Tags
    new Setting(contentEl)
      .setName('Tags')
      .setDesc('Tags to add to generated flashcards (comma-separated, with # prefix)')
      .addText(text => {
        const currentTags = this.selectedTags.join(', ');
        text.setPlaceholder('#flashcards, #biology, #chapter1');
        text.setValue(currentTags);
        text.onChange((value) => {
          this.customTagsInput = value;
          // Parse tags and ensure '#' prefix
          this.selectedTags = value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .map(tag => {
              // Ensure tag starts with exactly one '#'
              return tag.startsWith('#') ? tag : `#${tag}`;
            })
            .filter(tag => tag.length > 1); // Filter out empty tags after processing
        });
      });

    // Custom prompt (optional)
    new Setting(contentEl)
      .setName('Custom prompt (optional)')
      .setDesc('Override the default prompt template for this generation')
      .addTextArea(text => {
        text.setPlaceholder('Enter custom prompt or leave empty to use default...');
        text.setValue(this.customPrompt);
        text.onChange((value) => {
          this.customPrompt = value;
        });
        // Make textarea larger
        text.inputEl.rows = 4;
        text.inputEl.style.width = '100%';
      });

    // Buttons
    const buttonContainer = contentEl.createDiv('modal-button-container');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => {
      this.close();
    });

    const generateButton = buttonContainer.createEl('button', { text: 'Generate Flashcards' });
    generateButton.addClass('mod-cta');
    generateButton.addEventListener('click', () => {
      if (!this.validateForm()) {
        return;
      }

      const options: GenerationModalOptions = {
        maxCards: this.maxCards,
        cardTypes: this.selectedCardTypes,
        customPrompt: this.customPrompt || undefined,
        tags: this.selectedTags,
        placement: this.selectedPlacement,
        customTags: this.selectedTags
      };

      this.onSubmit(options);
      this.close();
    });
  }

  private refreshCardCountUI(): void {
    // Simply re-render the entire modal to update the UI
    this.onOpen();
  }

  private validateForm(): boolean {
    // Create generation options for validation
    const generationOptions = {
      maxCards: this.maxCards,
      cardTypes: this.selectedCardTypes,
      customPrompt: this.customPrompt || undefined,
      tags: this.selectedTags
    };

    // Validate generation options
    const optionsValidation = InputValidator.validateGenerationOptions(generationOptions);
    if (!optionsValidation.isValid) {
      ErrorHandler.handleFlashcardGenerationError(optionsValidation.errors.join('. '), 'form validation');
      return false;
    }

    // Show warnings if any
    if (optionsValidation.warnings.length > 0) {
      ErrorHandler.showWarning(optionsValidation.warnings.join('. '), 6000);
    }

    // Validate placement option
    const placementValidation = InputValidator.validatePlacementOption(this.selectedPlacement);
    if (!placementValidation.isValid) {
      ErrorHandler.handleFlashcardGenerationError(placementValidation.error || 'Invalid placement option', 'form validation');
      return false;
    }

    // Show suggestions if any
    if (optionsValidation.suggestions.length > 0) {
      ErrorHandler.showInfo(`💡 ${optionsValidation.suggestions.join('. ')}`, 6000);
    }

    return true;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}