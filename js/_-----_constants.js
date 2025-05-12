// js/_-----_constants.js

// Gemensamma språkkoder och namn
export const commonLanguages = {
    "sv": "Svenska",
    "en": "English",
    "de": "Deutsch",
    "fr": "Français",
    "es": "Español",
    "fi": "Suomi",
    "no": "Norsk (Bokmål)",
    "nn": "Norsk (Nynorsk)",
    "da": "Dansk",
    "is": "Íslenska"
};

// Ikoner för knappar etc.
export const ICONS = {
    upload: '⬆️',
    info: 'ℹ️',
    list: '📋',
    add: '➕',
    save: '💾',
    edit: '✏️',
    delete: '🗑️',
    view: '👁️',
    cancel: '❌',
    back: '⬅️',
    confirm: '✔️',
    keep: '↩️',
    warning: '⚠️',
    search: '🔍'
};

// Standardnycklar som förväntas för varje krav vid sparande
// Används i downloadJsonFile för att säkerställa att nycklar finns
export const STANDARD_REQUIREMENT_KEYS = [
    "metadata", "id", "title", "standardReference", "instructions", "checks",
    "exceptions", "examples", "tips", "commonErrors", "contentType", "key",
    "expectedObservation" // *** ADDED expectedObservation ***
];

// Standardvärden för nycklar om de saknas vid sparande
export const REQUIREMENT_KEY_DEFAULTS = {
    metadata: { // Hanteras specifikt för att säkerställa nästlad struktur
        mainCategory: { key: "", text: "" },
        subCategory: { key: "", text: "" },
        impact: { isCritical: false, primaryScore: 0, secondaryScore: 0, assumedCompliance: false }
    },
    id: "", // Genererad UUID, bör finnas
    title: "",
    standardReference: { text: "", url: "" }, // Säkerställ objektstruktur
    instructions: [],
    checks: [],
    exceptions: "",
    examples: "",
    tips: "",
    commonErrors: "",
    contentType: [],
    key: "", // Genererad nyckel, bör finnas
    expectedObservation: "" // *** ADDED expectedObservation default ***
};

// Definiera möjliga tillsynstyper
export const MONITORING_TYPES = [
    { type: 'web', text: 'Webbplats' },
    { type: 'app', text: 'Mobilapp' },
    { type: 'product', text: 'Produkt' } // Lägg till fler vid behov
];

console.log("Module loaded: constants"); // För felsökning