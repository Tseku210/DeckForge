"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.CardType = void 0;
var CardType;
(function (CardType) {
    CardType["OneWay"] = "oneway";
    CardType["Bidirectional"] = "bidirectional";
    CardType["MultiLine"] = "multiline";
    CardType["MultiLineBidirectional"] = "multiline-bidirectional";
    CardType["Cloze"] = "cloze";
})(CardType = exports.CardType || (exports.CardType = {}));
// Default Settings
exports.DEFAULT_SETTINGS = {
    providers: {},
    activeProvider: '',
    defaultOptions: {
        cardTypes: [CardType.OneWay, CardType.Bidirectional],
        tags: ['#flashcards']
    },
    outputPreferences: {
        defaultPlacement: 'cursor',
        fileNamingPattern: '{filename}-fcards.md',
        defaultTags: ['#flashcards']
    },
    promptTemplates: {
        default: `Generate flashcards from the following content. Create clear, concise questions and answers that would be useful for studying. Format each flashcard with a front (question) and back (answer).

Content:
{content}

Please generate an appropriate number of flashcards based on the content length and complexity in the following format:
- Front: [question]
- Back: [answer]
- Type: [oneway/bidirectional/cloze]`
    }
};
