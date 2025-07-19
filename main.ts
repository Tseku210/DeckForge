import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import {
	FlashcardPluginSettings,
	DEFAULT_SETTINGS,
	CardType,
	GenerationOptions,
	LLMError,
} from "./types";
import { FlashcardSettingTab } from "./settings-tab";
import { LLMServiceManager } from "./llm-service-manager";
import {
	GenerationOptionsModal,
	GenerationModalOptions,
} from "./generation-modal";
import { FlashcardGenerator } from "./flashcard-generator";
import { FileManager } from "./file-manager";
import { ContentProcessor } from "./content-processor";
import { InputValidator } from "./input-validator";
import { ErrorHandler } from "./error-handler";

export default class LLMFlashcardGeneratorPlugin extends Plugin {
	settings: FlashcardPluginSettings;
	llmManager: LLMServiceManager;
	statusBarItem: HTMLElement;

	async onload() {
		await this.loadSettings();

		// Initialize LLM service manager
		this.llmManager = new LLMServiceManager();
		this.initializeLLMProviders();

		// Add ribbon icon for flashcard generation
		const ribbonIconEl = this.addRibbonIcon(
			"brain",
			"Generate Flashcards",
			() => {
				this.generateFlashcards();
			}
		);
		ribbonIconEl.addClass("llm-flashcard-generator-ribbon-class");

		// Add main flashcard generation command
		this.addCommand({
			id: "generate-flashcards",
			name: "Generate flashcards from current note",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.generateFlashcards(editor, view);
			},
		});

		// Add settings tab for plugin configuration
		this.addSettingTab(new FlashcardSettingTab(this.app, this));

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar("ready");
	}

	onunload() {}

	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = this.validateAndMigrateSettings(loadedData);
	}

	async saveSettings() {
		// Validate settings before saving
		const validatedSettings = this.validateSettings(this.settings);
		await this.saveData(validatedSettings);

		// Reinitialize LLM providers when settings change
		if (this.llmManager) {
			this.initializeLLMProviders();
		}
	}

	private validateAndMigrateSettings(
		loadedData: any
	): FlashcardPluginSettings {
		// Start with default settings
		let settings = Object.assign({}, DEFAULT_SETTINGS);

		if (loadedData) {
			// Merge loaded data with defaults, ensuring all required fields exist
			settings = Object.assign(settings, loadedData);

			// Validate and migrate settings structure
			settings = this.migrateSettings(settings);
		}

		return this.validateSettings(settings);
	}

	private migrateSettings(settings: any): FlashcardPluginSettings {
		// Handle migration from older versions
		// For now, just ensure the structure matches current version

		// Ensure providers object exists
		if (!settings.providers || typeof settings.providers !== "object") {
			settings.providers = {};
		}

		// Ensure activeProvider is a string
		if (typeof settings.activeProvider !== "string") {
			settings.activeProvider = "";
		}

		// Ensure defaultOptions exists and has correct structure
		if (
			!settings.defaultOptions ||
			typeof settings.defaultOptions !== "object"
		) {
			settings.defaultOptions = DEFAULT_SETTINGS.defaultOptions;
		} else {
			// Validate defaultOptions fields
			if (
				settings.defaultOptions.maxCards !== undefined &&
				(typeof settings.defaultOptions.maxCards !== "number" ||
					settings.defaultOptions.maxCards < 1)
			) {
				delete settings.defaultOptions.maxCards;
			}
			if (!Array.isArray(settings.defaultOptions.cardTypes)) {
				settings.defaultOptions.cardTypes =
					DEFAULT_SETTINGS.defaultOptions.cardTypes;
			}
			if (!Array.isArray(settings.defaultOptions.tags)) {
				settings.defaultOptions.tags =
					DEFAULT_SETTINGS.defaultOptions.tags;
			}
		}

		// Ensure outputPreferences exists and has correct structure
		if (
			!settings.outputPreferences ||
			typeof settings.outputPreferences !== "object"
		) {
			settings.outputPreferences = DEFAULT_SETTINGS.outputPreferences;
		} else {
			const validPlacements = ["cursor", "bottom", "separate-file"];
			if (
				!validPlacements.includes(
					settings.outputPreferences.defaultPlacement
				)
			) {
				settings.outputPreferences.defaultPlacement =
					DEFAULT_SETTINGS.outputPreferences.defaultPlacement;
			}
			if (
				typeof settings.outputPreferences.fileNamingPattern !== "string"
			) {
				settings.outputPreferences.fileNamingPattern =
					DEFAULT_SETTINGS.outputPreferences.fileNamingPattern;
			}
			if (!Array.isArray(settings.outputPreferences.defaultTags)) {
				settings.outputPreferences.defaultTags =
					DEFAULT_SETTINGS.outputPreferences.defaultTags;
			}
		}

		// Ensure promptTemplates exists
		if (
			!settings.promptTemplates ||
			typeof settings.promptTemplates !== "object"
		) {
			settings.promptTemplates = DEFAULT_SETTINGS.promptTemplates;
		}

		return settings;
	}

	private validateSettings(
		settings: FlashcardPluginSettings
	): FlashcardPluginSettings {
		// Validate provider configurations
		Object.keys(settings.providers).forEach((providerName) => {
			const provider = settings.providers[providerName];
			if (!provider || typeof provider !== "object") {
				delete settings.providers[providerName];
				return;
			}

			// Ensure provider has required structure
			if (typeof provider.apiKey !== "string") provider.apiKey = "";
			if (typeof provider.endpoint !== "string") provider.endpoint = "";
			if (typeof provider.model !== "string") provider.model = "";
			if (
				!provider.customHeaders ||
				typeof provider.customHeaders !== "object"
			) {
				provider.customHeaders = {};
			}
		});

		// Validate activeProvider exists in providers
		if (
			settings.activeProvider &&
			!settings.providers[settings.activeProvider]
		) {
			settings.activeProvider = "";
		}

		// Validate card types are valid enum values
		const validCardTypes = Object.values(CardType);
		settings.defaultOptions.cardTypes =
			settings.defaultOptions.cardTypes.filter((cardType) =>
				validCardTypes.includes(cardType)
			);

		// Ensure at least one card type is selected
		if (settings.defaultOptions.cardTypes.length === 0) {
			settings.defaultOptions.cardTypes = [CardType.OneWay];
		}

		// Validate maxCards is within reasonable bounds if it exists
		if (settings.defaultOptions.maxCards !== undefined) {
			if (settings.defaultOptions.maxCards < 1) {
				settings.defaultOptions.maxCards = 1;
			} else if (settings.defaultOptions.maxCards > 100) {
				settings.defaultOptions.maxCards = 100;
			}
		}

		return settings;
	}

	/**
	 * Initialize LLM providers from settings
	 */
	private initializeLLMProviders(): void {
		if (!this.llmManager) return;

		try {
			this.llmManager.initializeFromSettings(
				this.settings.providers,
				this.settings.activeProvider
			);
			this.updateStatusBar("ready");
		} catch (error) {
			console.error("Failed to initialize LLM providers:", error);
			new Notice(
				"Failed to initialize LLM providers. Check your configuration."
			);
			this.updateStatusBar("error");
		}
	}

	/**
	 * Update status bar with current plugin state
	 */
	private updateStatusBar(
		status: "ready" | "generating" | "error" | "disabled"
	): void {
		if (!this.statusBarItem) return;

		switch (status) {
			case "ready":
				if (
					this.settings.activeProvider &&
					this.settings.providers[this.settings.activeProvider]
				) {
					this.statusBarItem.setText(
						`🧠 ${this.settings.activeProvider}`
					);
					this.statusBarItem.title = `LLM Flashcard Generator - Ready (${this.settings.activeProvider})`;
					this.statusBarItem.removeClass("llm-flashcard-error");
					this.statusBarItem.removeClass("llm-flashcard-generating");
				} else {
					this.statusBarItem.setText("🧠 No Provider");
					this.statusBarItem.title =
						"LLM Flashcard Generator - No provider configured";
					this.statusBarItem.addClass("llm-flashcard-error");
				}
				break;
			case "generating":
				this.statusBarItem.setText("🧠 Generating...");
				this.statusBarItem.title =
					"LLM Flashcard Generator - Generating flashcards...";
				this.statusBarItem.removeClass("llm-flashcard-error");
				this.statusBarItem.addClass("llm-flashcard-generating");
				break;
			case "error":
				this.statusBarItem.setText("🧠 Error");
				this.statusBarItem.title =
					"LLM Flashcard Generator - Configuration error";
				this.statusBarItem.addClass("llm-flashcard-error");
				this.statusBarItem.removeClass("llm-flashcard-generating");
				break;
			case "disabled":
				this.statusBarItem.setText("🧠 Disabled");
				this.statusBarItem.title = "LLM Flashcard Generator - Disabled";
				this.statusBarItem.addClass("llm-flashcard-error");
				this.statusBarItem.removeClass("llm-flashcard-generating");
				break;
		}
	}

	/**
	 * Main method to generate flashcards from current note
	 */
	async generateFlashcards(editor?: Editor, view?: MarkdownView) {
		// Check if we have an active editor and view
		if (!editor || !view) {
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				ErrorHandler.handleContentValidationError(
					"Please open a note to generate flashcards from"
				);
				return;
			}
			editor = activeView.editor;
			view = activeView;
		}

		// Check if LLM provider is configured
		if (
			!this.settings.activeProvider ||
			!this.settings.providers[this.settings.activeProvider]
		) {
			ErrorHandler.handleConfigurationError(
				"Please configure an LLM provider in settings first"
			);
			return;
		}

		// Get current note content and validate it
		const content = editor.getValue();
		const contentValidation = InputValidator.validateNoteContent(content);

		if (!contentValidation.isValid) {
			ErrorHandler.handleContentValidationError(
				contentValidation.errors.join(". ")
			);
			if (
				contentValidation.suggestions &&
				contentValidation.suggestions.length > 0
			) {
				ErrorHandler.showInfo(
					`💡 ${contentValidation.suggestions.join(". ")}`,
					8000
				);
			}
			return;
		}

		// Show warnings if any
		if (contentValidation.warnings.length > 0) {
			ErrorHandler.showWarning(
				contentValidation.warnings.join(". "),
				6000
			);
			if (
				contentValidation.suggestions &&
				contentValidation.suggestions.length > 0
			) {
				ErrorHandler.showInfo(
					`💡 ${contentValidation.suggestions.join(". ")}`,
					6000
				);
			}
		}

		// Validate provider configuration
		const providerConfig =
			this.settings.providers[this.settings.activeProvider];
		const configValidation = InputValidator.validateProviderConfig(
			providerConfig,
			this.settings.activeProvider
		);

		if (!configValidation.isValid) {
			ErrorHandler.handleConfigurationError(
				configValidation.errors.join(". "),
				this.settings.activeProvider
			);
			return;
		}

		// Show generation options modal
		const modal = new GenerationOptionsModal(
			this.app,
			(options: GenerationModalOptions) => {
				this.executeFlashcardGeneration(
					content,
					options,
					editor!,
					view!
				);
			},
			this.settings.defaultOptions,
			this.settings.outputPreferences.defaultPlacement,
			this.settings.outputPreferences.defaultTags
		);
		modal.open();
	}

	/**
	 * Execute the actual flashcard generation process
	 */
	private async executeFlashcardGeneration(
		content: string,
		options: GenerationModalOptions,
		editor: Editor,
		view: MarkdownView
	) {
		// Prepare generation options
		const generationOptions: GenerationOptions = {
			maxCards: options.maxCards,
			cardTypes: options.cardTypes,
			customPrompt: options.customPrompt,
			tags: options.tags,
		};

		// Validate generation options
		const optionsValidation =
			InputValidator.validateGenerationOptions(generationOptions);
		if (!optionsValidation.isValid) {
			ErrorHandler.handleFlashcardGenerationError(
				optionsValidation.errors.join(". "),
				"options validation"
			);
			return;
		}

		// Show warnings for generation options if any
		if (optionsValidation.warnings.length > 0) {
			ErrorHandler.showWarning(
				`Generation options: ${optionsValidation.warnings.join(". ")}`,
				6000
			);
		}

		// Validate placement option
		const placementValidation = InputValidator.validatePlacementOption(
			options.placement
		);
		if (!placementValidation.isValid) {
			ErrorHandler.handleFlashcardGenerationError(
				placementValidation.error || "Invalid placement option",
				"placement validation"
			);
			return;
		}

		// Update status bar to show generation in progress
		this.updateStatusBar("generating");

		// Create progress notice with steps
		let statusNotice = new Notice("Processing content...", 0);

		try {
			// Get the active LLM provider
			const provider = this.llmManager.getActiveProvider();
			if (!provider) {
				// Debug information
				console.log(
					"Debug: Active provider name:",
					this.settings.activeProvider
				);
				console.log(
					"Debug: Available providers:",
					this.llmManager.getProviderNames()
				);
				console.log(
					"Debug: Provider status:",
					this.llmManager.getProviderStatus()
				);
				throw new Error(
					`No active LLM provider available. Active: ${
						this.settings.activeProvider
					}, Available: ${this.llmManager
						.getProviderNames()
						.join(", ")}`
				);
			}

			// Process content
			statusNotice.setMessage("Processing note content...");
			const contentProcessor = new ContentProcessor();
			const processedContent = await contentProcessor.processContent(
				content,
				view.file?.basename || "Untitled"
			);

			// Generate flashcards
			statusNotice.setMessage(
				`Generating flashcards with ${this.settings.activeProvider}...`
			);
			const generator = new FlashcardGenerator(provider);
			const result = await generator.generateFlashcards(
				processedContent.cleanedContent,
				generationOptions
			);

			if (!result.success) {
				throw new Error(
					result.error || "Failed to generate flashcards"
				);
			}

			// Handle file placement
			statusNotice.setMessage("Placing flashcards...");
			const fileManager = new FileManager(this.app);
			const placementResult = await fileManager.placeFlashcards(
				result.formattedCards || "",
				editor,
				view,
				{
					placement: options.placement,
					fileNamingPattern:
						this.settings.outputPreferences.fileNamingPattern,
					defaultTags:
						options.customTags ||
						this.settings.outputPreferences.defaultTags,
				}
			);

			// Hide progress notice and restore status bar
			statusNotice.hide();
			this.updateStatusBar("ready");

			if (placementResult.success) {
				const cardsCount = result.metadata?.cardsGenerated || 0;
				let message = `✅ Generated ${cardsCount} flashcard${
					cardsCount !== 1 ? "s" : ""
				}`;

				if (
					options.placement === "separate-file" &&
					placementResult.filePath
				) {
					message += ` in ${placementResult.filePath}`;
				}

				// Show detailed success message with metadata
				if (result.metadata?.tokensUsed) {
					message += `\n📊 Usage: ${result.metadata.tokensUsed} tokens`;
					if (result.metadata.model) {
						message += ` (${result.metadata.model})`;
					}
				}

				// Add tag information if tags were used
				if (options.tags && options.tags.length > 0) {
					message += `\n🏷️ Tags: ${options.tags.join(", ")}`;
				}

				new Notice(message, 8000);
			} else {
				throw new Error(
					placementResult.error || "Failed to place flashcards"
				);
			}
		} catch (error) {
			// Hide progress notice and restore status bar
			statusNotice.hide();
			this.updateStatusBar("ready");

			// Handle different types of errors appropriately
			if (error && typeof error === "object" && "type" in error) {
				// Handle LLM-specific errors
				ErrorHandler.handleLLMError(
					error as LLMError,
					this.settings.activeProvider
				);
			} else if (error instanceof Error) {
				// Handle general errors
				ErrorHandler.handleFlashcardGenerationError(
					error.message,
					"generation process"
				);
			} else {
				// Handle unknown errors
				ErrorHandler.handleFlashcardGenerationError(
					"An unexpected error occurred",
					"generation process"
				);
			}

			// Log error for debugging
			ErrorHandler.logError(error, "executeFlashcardGeneration", {
				provider: this.settings.activeProvider,
				contentLength: content.length,
				options: generationOptions,
			});
		}
	}
}
