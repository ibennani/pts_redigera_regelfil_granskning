// js/_-----_file_handling.js

// Importer (som tidigare)
import {
    fileInput, contentDisplay, postUploadControlsContainer,
    controlsDivider, dynamicContentArea, saveChangesButton, filterSortRow,
    searchInput, sortOrderSelect, uploadSection
} from './_-----_dom_element_references.js';
import {
    MONITORING_TYPES, STANDARD_REQUIREMENT_KEYS, REQUIREMENT_KEY_DEFAULTS, ICONS
} from './_-----_constants.js'; // Will now include expectedObservation constants
import * as state from './_-----_global_state.js';
import { escapeHtml, getVal, generateKeyFromName, generateRequirementKey } from './_-----_utils__helpers.js';
import { initializeUI, setupContentArea, showError, resetUI, displayConfirmation } from './_-----_ui_functions.js';
// import { saveAs } from 'file-saver'; // Assumed to be loaded via script tag


/**
 * Hanterar händelsen när en fil väljs i filuppladdningsfältet.
 */
export function handleFileUpload(event) { // Exporteras direkt
    const file = event.target.files[0];
    // Reset state on new file upload
    state.setState('jsonData', null); state.setState('currentRequirementKey', null); state.setState('lastFocusedReqKey', null);
    state.setState('isDataModified', false); state.setState('currentSortOrder', 'category-asc'); state.setState('currentSearchTerm', '');
    if (sortOrderSelect) sortOrderSelect.value = state.currentSortOrder; if (searchInput) searchInput.value = '';

    if (!file) { console.log("Ingen fil vald."); resetFileInput(); return; }
    const errorContainer = document.getElementById('uploadSection') || contentDisplay;
    if (file.type !== 'application/json') { showError(`Felaktig filtyp. Välj en .json-fil.`, errorContainer); resetFileInput(); return; } // More specific error

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsedJson = JSON.parse(e.target.result);
            if (!parsedJson || typeof parsedJson !== 'object') throw new Error('JSON-innehållet är inte ett giltigt objekt.');
            if (!parsedJson.metadata || typeof parsedJson.metadata !== 'object') throw new Error('JSON saknar nyckeln "metadata" på toppnivå.');
            if (!parsedJson.requirements || typeof parsedJson.requirements !== 'object') throw new Error('JSON saknar nyckeln "requirements" på toppnivå.');

            // Add default monitoringType if missing (good practice)
            if (!parsedJson.metadata.monitoringType) {
                console.warn("Metadata saknar 'monitoringType'. Lägger till default.");
                const defaultType = MONITORING_TYPES.find(t => t.type === 'web') || MONITORING_TYPES[0];
                parsedJson.metadata.monitoringType = defaultType ? { ...defaultType } : { type: "unknown", text: "Okänd" };
            }
            state.setState('jsonData', parsedJson);
            console.log("JSON-fil parsades framgångsrikt:", state.jsonData);
            state.setState('isDataModified', false); // Reset modification flag on successful load

            // Update UI
            if (contentDisplay) contentDisplay.classList.add('hidden');
            if (postUploadControlsContainer) postUploadControlsContainer.classList.remove('hidden');
            if (controlsDivider) controlsDivider.classList.remove('hidden');
            if (saveChangesButton) saveChangesButton.classList.add('hidden'); // Hide save initially
            if (filterSortRow) filterSortRow.classList.add('hidden'); // Hide filter/sort initially

            if (dynamicContentArea) {
                setupContentArea(true, false); // Clear area, don't show filter/sort yet
                dynamicContentArea.innerHTML = `<p>Regelfil <strong>${escapeHtml(file.name)}</strong> laddades upp.</p><p>Version: ${escapeHtml(state.jsonData?.metadata?.version || 'okänd')}.</p><p>Välj vad du vill visa med knapparna ovan.</p>`; // More guidance
            } else { console.error("Dynamic content area not found!"); alert("Kunde inte visa innehållsområdet."); }
            console.log("UI uppdaterat efter lyckad filuppladdning.");

        } catch (error) {
            console.error("Fel vid parsning av JSON:", error);
            resetUI(); // Reset entire UI on parse error
            // Show error in the initial upload area if possible
            showError(`Kunde inte läsa JSON-filen. Kontrollera att filen är korrekt formaterad. Fel: ${escapeHtml(error.message)}`, uploadSection || contentDisplay);
        }
        finally {
            resetFileInput(); // Always reset file input
        }
    };
    reader.onerror = (e) => {
        console.error("Fel vid läsning av fil:", e);
        resetUI();
        showError('Ett fel uppstod vid läsning av filen.', uploadSection || contentDisplay);
        resetFileInput();
    };
    reader.readAsText(file);
}

/**
 * Återställer filinput-fältet.
 */
export function resetFileInput() { // Exporteras direkt
    if (fileInput) {
        fileInput.value = ''; // Clear the selected file
    }
}

/**
 * Uppdaterar versionsnumret i metadata enligt formatet ÅÅÅÅ.M.rSeq.
 */
function updateVersion() {
    if (!state.jsonData?.metadata) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // Månader är 1-12

    const existingVersion = state.jsonData.metadata.version || '0.0.r0'; // Fallback med nya formatet
    let existingYear = 0;
    let existingMonth = 0;
    let existingSeq = 0;

    // Försök tolka befintlig version (ÅÅÅÅ.M.rSeq) med regex
    const versionRegex = /^(\d{4})\.(\d{1,2})\.r(\d+)$/;
    const match = existingVersion.match(versionRegex);

    if (match) {
        const yearPart = parseInt(match[1], 10);
        const monthPart = parseInt(match[2], 10);
        const seqPart = parseInt(match[3], 10);

        // Check if parts are valid numbers and month is within range
        if (!isNaN(yearPart) && !isNaN(monthPart) && !isNaN(seqPart) && monthPart >= 1 && monthPart <= 12) {
            existingYear = yearPart;
            existingMonth = monthPart;
            existingSeq = seqPart;
        } else {
            console.warn(`Ogiltigt värde i befintligt versionsformat: "${existingVersion}". Återställer sekvens.`);
            existingYear = 0; existingMonth = 0; // Force reset
        }
    } else {
        console.warn(`Oväntat befintligt versionsformat: "${existingVersion}". Försöker inte återanvända, återställer sekvens.`);
        existingYear = 0; existingMonth = 0; // Force reset
    }

    let newSeq;
    // Jämför med nuvarande år och månad
    if (currentYear === existingYear && currentMonth === existingMonth) {
        // Samma år och månad: öka sekvens
        newSeq = existingSeq + 1;
    } else {
        // Nytt år eller månad: återställ sekvens till 1
        newSeq = 1;
    }

    // Skapa ny versionsträng med det nya formatet
    const newVersion = `${currentYear}.${currentMonth}.r${newSeq}`;
    state.jsonData.metadata.version = newVersion; // Uppdatera state
    console.log(`Version uppdaterad till: ${state.jsonData.metadata.version}`);
}


/**
 * Uppdaterar datumet för senaste ändring i metadata till dagens datum (YYYY-MM-DD).
 */
function updateDateModified() { // Ingen ändring här
    if (!state.jsonData?.metadata) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    state.jsonData.metadata.dateModified = `${year}-${month}-${day}`;
    console.log(`DateModified uppdaterad till: ${state.jsonData.metadata.dateModified}`);
}

/**
 * Förbereder JSON-datan för nedladdning, säkerställer att alla standardnycklar finns,
 * uppdaterar version/datum, och triggar nedladdningen.
 * Implicit uppdaterad genom ändrade konstanter.
 */
export function downloadJsonFile() { // Exporteras direkt
    if (!state.jsonData) { showError("Ingen data att spara.", dynamicContentArea || contentDisplay); return; }

    try {
        updateVersion(); // Update version number
        updateDateModified(); // Update modification date

        const currentVersion = state.jsonData.metadata.version || 'okänd-version';
        const title = state.jsonData.metadata?.title || 'kravdata';

        // Create safe filename parts
        let safeTitle = title.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o');
        safeTitle = safeTitle.replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
        safeTitle = safeTitle || 'kravdata'; // Fallback if title becomes empty
        const safeVersion = String(currentVersion).replace(/\./g, '_'); // Replace dots with underscores

        const filename = `${safeTitle}_${safeVersion}.json`;
        console.log(`Förbereder nedladdning. Filnamn: ${filename}`);

        // Process requirements to ensure all standard keys exist and have defaults if missing
        const processedRequirements = {};
        if (state.jsonData.requirements && typeof state.jsonData.requirements === 'object') {
            for (const key in state.jsonData.requirements) {
                if (Object.prototype.hasOwnProperty.call(state.jsonData.requirements, key)) {
                    const originalReq = state.jsonData.requirements[key];
                    // Skip if requirement is not a valid object
                    if (typeof originalReq !== 'object' || originalReq === null) {
                        console.warn(`Requirement with key "${key}" is not an object, skipping.`);
                        continue;
                    }

                    const processedReq = {};
                    // Ensure all STANDARD keys are present
                    STANDARD_REQUIREMENT_KEYS.forEach(stdKey => {
                        // Check if the key exists and has a non-null/undefined value in the original
                        if (Object.prototype.hasOwnProperty.call(originalReq, stdKey) && originalReq[stdKey] !== null && originalReq[stdKey] !== undefined) {
                             // Specific handling for complex nested structures (metadata, standardReference)
                            if (stdKey === 'metadata') {
                                const origMeta = originalReq.metadata || {};
                                const defaultMeta = REQUIREMENT_KEY_DEFAULTS.metadata;
                                // Deep clone default impact first
                                processedReq.metadata = {
                                    // Ensure category objects exist or use defaults
                                    mainCategory: {},
                                    subCategory: {},
                                    impact: JSON.parse(JSON.stringify(defaultMeta.impact)) // Start with default impact
                                };
                                // Populate impact from original if it exists and is an object
                                if(origMeta.impact && typeof origMeta.impact === 'object') {
                                    processedReq.metadata.impact.isCritical = origMeta.impact.isCritical ?? defaultMeta.impact.isCritical;
                                    processedReq.metadata.impact.primaryScore = origMeta.impact.primaryScore ?? defaultMeta.impact.primaryScore;
                                    processedReq.metadata.impact.secondaryScore = origMeta.impact.secondaryScore ?? defaultMeta.impact.secondaryScore;
                                    processedReq.metadata.impact.assumedCompliance = origMeta.impact.assumedCompliance ?? defaultMeta.impact.assumedCompliance;
                                }
                                 // Handle categories (ensure object format {text, key})
                                ['mainCategory', 'subCategory'].forEach(catKey => {
                                    let catValue = origMeta[catKey];
                                    const defaultCat = defaultMeta[catKey]; // {text:"", key:""}
                                     if (typeof catValue === 'string') {
                                         // Convert string to object format
                                        processedReq.metadata[catKey] = { text: catValue, key: generateKeyFromName(catValue) || "" };
                                     } else if (typeof catValue === 'object' && catValue !== null) {
                                         // Ensure text and key exist in the object
                                         processedReq.metadata[catKey] = {
                                            text: catValue.text ?? "",
                                            key: catValue.key ?? (catValue.text ? generateKeyFromName(catValue.text) : "")
                                        };
                                    } else {
                                        // Use default if missing or invalid type
                                         processedReq.metadata[catKey] = JSON.parse(JSON.stringify(defaultCat));
                                    }
                                     // Special case: subCategory object with empty text should become ""
                                     if (catKey === 'subCategory' && !processedReq.metadata.subCategory?.text) {
                                         processedReq.metadata.subCategory = "";
                                     }
                                });

                            } else if (stdKey === 'standardReference') {
                                // Handle potential string or object format
                                if (typeof originalReq.standardReference === 'object' && originalReq.standardReference !== null) {
                                    processedReq.standardReference = {
                                        text: originalReq.standardReference.text ?? "",
                                        url: originalReq.standardReference.url ?? ""
                                    };
                                    // If both are empty, save as empty string instead of empty object
                                    if (!processedReq.standardReference.text && !processedReq.standardReference.url) {
                                        processedReq.standardReference = "";
                                    }
                                } else if (typeof originalReq.standardReference === 'string') {
                                    // Keep string if it was originally a string
                                    processedReq.standardReference = originalReq.standardReference;
                                } else {
                                    // Default to empty string if missing or invalid
                                    processedReq.standardReference = "";
                                }
                             } else if (Array.isArray(originalReq[stdKey])) {
                                // Deep clone arrays
                                processedReq[stdKey] = JSON.parse(JSON.stringify(originalReq[stdKey]));
                            } else if (typeof originalReq[stdKey] === 'object' && originalReq[stdKey] !== null) {
                                // Deep clone other objects
                                processedReq[stdKey] = JSON.parse(JSON.stringify(originalReq[stdKey]));
                            } else {
                                // Copy primitive values directly
                                processedReq[stdKey] = originalReq[stdKey];
                            }
                        } else {
                            // Key does not exist or is null/undefined in original, use default
                            const defaultValue = REQUIREMENT_KEY_DEFAULTS[stdKey];
                            // Deep clone default if it's an object/array to avoid reference issues
                            processedReq[stdKey] = (typeof defaultValue === 'object' && defaultValue !== null)
                                ? JSON.parse(JSON.stringify(defaultValue))
                                : defaultValue;
                        }
                    });

                    // Copy any non-standard keys from the original requirement
                     for (const originalKey in originalReq) {
                         if (Object.prototype.hasOwnProperty.call(originalReq, originalKey) &&
                             !Object.prototype.hasOwnProperty.call(processedReq, originalKey)) {
                            // Deep clone if object/array
                            processedReq[originalKey] = (typeof originalReq[originalKey] === 'object' && originalReq[originalKey] !== null)
                                ? JSON.parse(JSON.stringify(originalReq[originalKey]))
                                : originalReq[originalKey];
                         }
                    }

                    processedRequirements[key] = processedReq;
                }
            }
        }

        // Create the final data object to save
        const dataToSave = { ...state.jsonData, requirements: processedRequirements };
        const jsonString = JSON.stringify(dataToSave, null, 2); // Pretty print JSON
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

        // Trigger download using FileSaver.js if available, else fallback
        if (typeof saveAs === 'function') {
            saveAs(blob, filename);
            console.log(`FileSaver.js: Nedladdning av "${filename}" initierad.`);
        } else {
            console.warn("FileSaver.js (saveAs) hittades inte. Använder fallback-metod.");
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log(`Fallback Link Method: Nedladdning av "${filename}" initierad.`);
        }

        // Reset modification flag and UI after successful save attempt
        state.setState('isDataModified', false);
        if (saveChangesButton) saveChangesButton.classList.add('hidden');

        // Display inline confirmation message near the save button
        const controlsContainer = postUploadControlsContainer;
        if (controlsContainer) {
             // Remove any existing inline confirmation first
            const existingSpan = controlsContainer.querySelector('.save-confirmation-inline');
            if(existingSpan) existingSpan.remove();

            const confirmationSpan = document.createElement('span');
            confirmationSpan.innerHTML = `${ICONS.confirm} Fil sparad (v ${escapeHtml(currentVersion)})!`;
            confirmationSpan.style.color = 'var(--success-color)';
            confirmationSpan.style.fontWeight = 'bold';
            confirmationSpan.style.marginLeft = '1em';
            confirmationSpan.classList.add('save-confirmation-inline'); // Add class for potential removal

            // Try to insert after the save button within the secondary controls
            const secondaryControls = controlsContainer.querySelector('.secondary-controls');
             if (secondaryControls && saveChangesButton && secondaryControls.contains(saveChangesButton)) {
                 // Insert after save button if it's inside secondary controls
                 saveChangesButton.parentNode.insertBefore(confirmationSpan, saveChangesButton.nextSibling);
             } else if (saveChangesButton && controlsContainer.contains(saveChangesButton)) {
                 // Fallback: insert after save button if it's directly under the main container
                 saveChangesButton.parentNode.insertBefore(confirmationSpan, saveChangesButton.nextSibling);
             } else {
                 // Fallback: append to the main container if save button isn't found or positioned weirdly
                 controlsContainer.appendChild(confirmationSpan);
             }
            // Remove the confirmation after a delay
            setTimeout(() => {
                confirmationSpan.remove();
            }, 4000); // 4 seconds
        } else {
            // Fallback alert if the container isn't found
             alert(`Filen sparades med version ${escapeHtml(currentVersion)}!`);
        }

    } catch (error) {
        console.error("Fel vid förberedelse eller start av JSON-nedladdning:", error);
        showError(`Kunde inte skapa filen för nedladdning. Fel: ${escapeHtml(error.message)}`, dynamicContentArea || contentDisplay);
    }
}

// INGEN export { ... } här eftersom alla exporterade funktioner
// (handleFileUpload, resetFileInput, downloadJsonFile)
// redan har 'export' vid sin definition.

console.log("Module loaded: file_handling");