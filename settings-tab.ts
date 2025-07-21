import { App, PluginSettingTab, Setting, Modal, Notice } from 'obsidian';
import LLMFlashcardGeneratorPlugin from './main';
import { CardType, ProviderConfig } from './types';

export class FlashcardSettingTab extends PluginSettingTab {
  plugin: LLMFlashcardGeneratorPlugin;

  constructor(app: App, plugin: LLMFlashcardGeneratorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'LLM Flashcard Generator Settings' });

    // LLM Provider Configuration Section
    this.createProviderSection(containerEl);

    // Output Preferences Section
    this.createOutputPreferencesSection(containerEl);

    // Default Generation Options Section
    this.createGenerationOptionsSection(containerEl);

    // Prompt Templates Section
    this.createPromptTemplatesSection(containerEl);
  }

  private createProviderSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'LLM Provider Configuration' });

    // Show available provider types
    const infoDiv = containerEl.createDiv('provider-info');
    infoDiv.createEl('p', {
      text: 'Supported providers: OpenAI (GPT-3.5, GPT-4), Anthropic (Claude), Google Gemini',
      cls: 'setting-item-description'
    });

    // Active Provider Selection
    new Setting(containerEl)
      .setName('Active Provider')
      .setDesc('Select which LLM provider to use for flashcard generation')
      .addDropdown(dropdown => {
        dropdown.addOption('', 'Select a provider...');

        // Add configured providers
        Object.keys(this.plugin.settings.providers).forEach(providerName => {
          dropdown.addOption(providerName, providerName);
        });

        dropdown.setValue(this.plugin.settings.activeProvider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.activeProvider = value;
          await this.plugin.saveSettings();
        });
      });

    // Add Provider Button
    new Setting(containerEl)
      .setName('Add New Provider')
      .setDesc('Configure a new LLM provider (OpenAI, Anthropic, or Gemini)')
      .addButton(button => {
        button.setButtonText('Add Provider');
        button.onClick(() => {
          this.showAddProviderModal();
        });
      });

    // Display configured providers
    this.displayConfiguredProviders(containerEl);
  } private displayConfiguredProviders(containerEl: HTMLElement): void {
    const providersContainer = containerEl.createDiv();
    providersContainer.empty();

    Object.entries(this.plugin.settings.providers).forEach(([name, config]) => {
      const providerDiv = providersContainer.createDiv('provider-config');
      providerDiv.createEl('h4', { text: name });

      new Setting(providerDiv)
        .setName('API Key')
        .setDesc('Your API key for this provider')
        .addText(text => {
          text.setPlaceholder('Enter API key...');
          text.setValue(config.apiKey || '');
          text.inputEl.type = 'password';
          text.onChange(async (value) => {
            this.plugin.settings.providers[name].apiKey = value;
            await this.plugin.saveSettings();
          });
        });

      new Setting(providerDiv)
        .setName('API Endpoint')
        .setDesc('API endpoint URL (leave empty for default)')
        .addText(text => {
          text.setPlaceholder('https://api.example.com/v1');
          text.setValue(config.endpoint || '');
          text.onChange(async (value) => {
            this.plugin.settings.providers[name].endpoint = value;
            await this.plugin.saveSettings();
          });
        });

      new Setting(providerDiv)
        .setName('Model')
        .setDesc('Model name to use for this provider')
        .addText(text => {
          text.setPlaceholder('gpt-3.5-turbo');
          text.setValue(config.model || '');
          text.onChange(async (value) => {
            this.plugin.settings.providers[name].model = value;
            await this.plugin.saveSettings();
          });
        });

      new Setting(providerDiv)
        .setName('Remove Provider')
        .setDesc('Delete this provider configuration')
        .addButton(button => {
          button.setButtonText('Remove');
          button.setWarning();
          button.onClick(async () => {
            delete this.plugin.settings.providers[name];
            if (this.plugin.settings.activeProvider === name) {
              this.plugin.settings.activeProvider = '';
            }
            await this.plugin.saveSettings();
            this.display(); // Refresh the settings display
          });
        });
    });
  }

  private createOutputPreferencesSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Output Preferences' });

    new Setting(containerEl)
      .setName('Default Placement')
      .setDesc('Where to place generated flashcards by default')
      .addDropdown(dropdown => {
        dropdown.addOption('cursor', 'At cursor position');
        dropdown.addOption('bottom', 'At bottom of note');
        dropdown.addOption('separate-file', 'In separate file');
        dropdown.setValue(this.plugin.settings.outputPreferences.defaultPlacement);
        dropdown.onChange(async (value: 'cursor' | 'bottom' | 'separate-file') => {
          this.plugin.settings.outputPreferences.defaultPlacement = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('File Naming Pattern')
      .setDesc('Pattern for naming separate flashcard files ({filename} will be replaced)')
      .addText(text => {
        text.setPlaceholder('{filename}-fcards.md');
        text.setValue(this.plugin.settings.outputPreferences.fileNamingPattern);
        text.onChange(async (value) => {
          this.plugin.settings.outputPreferences.fileNamingPattern = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Default Tags')
      .setDesc('Default tags to add to flashcards (comma-separated)')
      .addText(text => {
        text.setPlaceholder('#flashcards, #study');
        text.setValue(this.plugin.settings.outputPreferences.defaultTags.join(', '));
        text.onChange(async (value) => {
          this.plugin.settings.outputPreferences.defaultTags =
            value.split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
              .map(tag => {
                // Ensure tag starts with exactly one '#'
                return tag.startsWith('#') ? tag : `#${tag}`;
              })
              .filter(tag => tag.length > 1); // Filter out empty tags after processing
          await this.plugin.saveSettings();
        });
      });
  }
  private createGenerationOptionsSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Default Generation Options' });

    new Setting(containerEl)
      .setName('Maximum Cards (Optional)')
      .setDesc('Limit the number of flashcards to generate. Leave empty to let the LLM decide based on content.')
      .addText(text => {
        text.setPlaceholder('Leave empty for auto');
        text.setValue(this.plugin.settings.defaultOptions.maxCards?.toString() || '');
        text.onChange(async (value) => {
          const numValue = parseInt(value.trim());
          if (value.trim() === '' || isNaN(numValue)) {
            delete this.plugin.settings.defaultOptions.maxCards;
          } else {
            this.plugin.settings.defaultOptions.maxCards = Math.max(1, Math.min(100, numValue));
          }
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Card Types')
      .setDesc('Default types of flashcards to generate')
      .setClass('card-types-setting');

    // Create checkboxes for each card type
    const cardTypesContainer = containerEl.createDiv('card-types-container');

    Object.values(CardType).forEach(cardType => {
      new Setting(cardTypesContainer)
        .setName(this.getCardTypeDisplayName(cardType))
        .setDesc(this.getCardTypeDescription(cardType))
        .addToggle(toggle => {
          toggle.setValue(this.plugin.settings.defaultOptions.cardTypes.includes(cardType));
          toggle.onChange(async (value) => {
            if (value) {
              if (!this.plugin.settings.defaultOptions.cardTypes.includes(cardType)) {
                this.plugin.settings.defaultOptions.cardTypes.push(cardType);
              }
            } else {
              this.plugin.settings.defaultOptions.cardTypes =
                this.plugin.settings.defaultOptions.cardTypes.filter(type => type !== cardType);
            }
            await this.plugin.saveSettings();
          });
        });
    });

    new Setting(containerEl)
      .setName('Default Tags')
      .setDesc('Default tags for generated flashcards (comma-separated)')
      .addText(text => {
        text.setPlaceholder('#flashcards, #study');
        text.setValue((this.plugin.settings.defaultOptions.tags || []).join(', '));
        text.onChange(async (value) => {
          this.plugin.settings.defaultOptions.tags =
            value.split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
              .map(tag => {
                return tag.startsWith('#') ? tag : `#${tag}`;
              })
              .filter(tag => tag.length > 1); // Filter out empty tags after processing
          await this.plugin.saveSettings();
        });
      });
  }

  private createPromptTemplatesSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Prompt Templates' });

    new Setting(containerEl)
      .setName('Default Prompt Template')
      .setDesc('Template used to generate flashcards. Use {content} as a placeholder for the note content.')
      .addTextArea(textArea => {
        textArea.setPlaceholder('Enter your prompt template...');
        textArea.setValue(this.plugin.settings.promptTemplates.default || '');
        textArea.inputEl.rows = 8;
        textArea.inputEl.addClass('custom-textarea');
        textArea.onChange(async (value) => {
          this.plugin.settings.promptTemplates.default = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private getCardTypeDisplayName(cardType: CardType): string {
    switch (cardType) {
      case CardType.OneWay:
        return 'One-way (Question → Answer)';
      case CardType.Bidirectional:
        return 'Bidirectional (Question ↔ Answer)';
      case CardType.MultiLine:
        return 'Multi-line';
      case CardType.MultiLineBidirectional:
        return 'Multi-line Bidirectional';
      case CardType.Cloze:
        return 'Cloze Deletion';
      default:
        return cardType;
    }
  }

  private getCardTypeDescription(cardType: CardType): string {
    switch (cardType) {
      case CardType.OneWay:
        return 'Question::Answer format';
      case CardType.Bidirectional:
        return 'Term:::Definition format (both directions)';
      case CardType.MultiLine:
        return 'Multi-line format with ? separator';
      case CardType.MultiLineBidirectional:
        return 'Multi-line bidirectional format';
      case CardType.Cloze:
        return 'Text with ==cloze deletion== format';
      default:
        return '';
    }
  }

  private showAddProviderModal(): void {
    const modal = new AddProviderModal(this.app, (providerType: string, providerName: string) => {
      if (!this.plugin.settings.providers[providerName]) {
        // Get default config for the provider type
        const defaultConfig = this.getDefaultConfigForProvider(providerType);
        this.plugin.settings.providers[providerName] = defaultConfig;
        this.plugin.saveSettings().then(() => {
          this.display(); // Refresh the settings display
        });
      } else {
        new Notice('A provider with this name already exists.');
      }
    });
    modal.open();
  }

  private getDefaultConfigForProvider(providerType: string): ProviderConfig {
    switch (providerType.toLowerCase()) {
      case 'openai':
        return {
          apiKey: '',
          endpoint: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        };
      case 'anthropic':
        return {
          apiKey: '',
          endpoint: 'https://api.anthropic.com/v1',
          model: 'claude-3-haiku-20240307'
        };
      case 'gemini':
        return {
          apiKey: '',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta',
          model: 'gemini-1.5-flash'
        };
      default:
        return {
          apiKey: '',
          endpoint: '',
          model: ''
        };
    }
  }
}

class AddProviderModal extends Modal {
  private onSubmit: (providerType: string, providerName: string) => void;

  constructor(app: App, onSubmit: (providerType: string, providerName: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Add New LLM Provider' });

    let selectedProviderType = '';
    let providerName = '';

    // Provider Type Selection
    new Setting(contentEl)
      .setName('Provider Type')
      .setDesc('Select the type of LLM provider to add')
      .addDropdown(dropdown => {
        dropdown.addOption('', 'Select provider type...');
        dropdown.addOption('openai', 'OpenAI (GPT-3.5, GPT-4)');
        dropdown.addOption('anthropic', 'Anthropic (Claude)');
        dropdown.addOption('gemini', 'Google Gemini');

        dropdown.onChange((value) => {
          selectedProviderType = value;
          // Auto-fill provider name based on type
          if (value && !providerName) {
            const nameInput = contentEl.querySelector('input[placeholder="Enter provider name..."]') as HTMLInputElement;
            if (nameInput) {
              const defaultName = value.charAt(0).toUpperCase() + value.slice(1);
              nameInput.value = defaultName;
              providerName = defaultName;
            }
          }
        });
      });

    // Provider Name Input
    new Setting(contentEl)
      .setName('Provider Name')
      .setDesc('Give this provider configuration a name (e.g., "OpenAI", "My Claude")')
      .addText(text => {
        text.setPlaceholder('Enter provider name...');
        text.onChange((value) => {
          providerName = value.trim();
        });
      });

    // Buttons
    const buttonContainer = contentEl.createDiv('modal-button-container');

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => {
      this.close();
    });

    const addButton = buttonContainer.createEl('button', { text: 'Add Provider' });
    addButton.addClass('mod-cta');
    addButton.addEventListener('click', () => {
      if (!selectedProviderType) {
        new Notice('Please select a provider type');
        return;
      }
      if (!providerName) {
        new Notice('Please enter a provider name');
        return;
      }

      this.onSubmit(selectedProviderType, providerName);
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}