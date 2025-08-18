// js/_-----_file_handling.js

// Importer (som tidigare)
import {
    fileInput, contentDisplay, postUploadControlsContainer,
    controlsDivider, dynamicContentArea, saveChangesButton, filterSortRow,
    searchInput, sortOrderSelect, uploadSection
} from './_-----_dom_element_references.js';
import {
    MONITORING_TYPES, STANDARD_REQUIREMENT_KEYS, REQUIREMENT_KEY_DEFAULTS, ICONS
} from './_-----_constants.js';
import * as state from './_-----_global_state.js';
import { escapeHtml, getVal, generateKeyFromName, generateRequirementKey } from './_-----_utils__helpers.js';
import { initializeUI, setupContentArea, showError, resetUI, displayConfirmation } from './_-----_ui_functions.js';
// import { saveAs } from 'file-saver'; // Assumed to be loaded via script tag


/**
 * Hanterar händelsen när en fil väljs i filuppladdningsfältet.
 */
export function handleFileUpload(event) {
    const file = event.target.files[0];
    state.setState('jsonData', null); state.setState('currentRequirementKey', null); state.setState('lastFocusedReqKey', null);
    state.setState('isDataModified', false); state.setState('currentSortOrder', 'ref-asc'); state.setState('currentSearchTerm', '');
    if (sortOrderSelect) sortOrderSelect.value = state.currentSortOrder; if (searchInput) searchInput.value = '';

    if (!file) { console.log("Ingen fil vald."); resetFileInput(); return; }
    const errorContainer = document.getElementById('uploadSection') || contentDisplay;
    if (file.type !== 'application/json') { showError(`Felaktig filtyp. Välj en .json-fil.`, errorContainer); resetFileInput(); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsedJson = JSON.parse(e.target.result);
            if (!parsedJson || typeof parsedJson !== 'object') throw new Error('JSON-innehållet är inte ett giltigt objekt.');
            if (!parsedJson.metadata || typeof parsedJson.metadata !== 'object') throw new Error('JSON saknar nyckeln "metadata" på toppnivå.');
            if (!parsedJson.requirements || typeof parsedJson.requirements !== 'object') throw new Error('JSON saknar nyckeln "requirements" på toppnivå.');

            if (!parsedJson.metadata.monitoringType) {
                console.warn("Metadata saknar 'monitoringType'. Lägger till default.");
                const defaultType = MONITORING_TYPES.find(t => t.type === 'web') || MONITORING_TYPES[0];
                parsedJson.metadata.monitoringType = defaultType ? { ...defaultType } : { type: "unknown", text: "Okänd" };
            }
            // Konvertera pageTypes från sträng till array om den finns som sträng vid inladdning
            if (parsedJson.metadata.pageTypes && typeof parsedJson.metadata.pageTypes === 'string') {
                console.log("Konverterar metadata.pageTypes från sträng till array vid inladdning.");
                parsedJson.metadata.pageTypes = parsedJson.metadata.pageTypes.split(',').map(pt => pt.trim()).filter(Boolean);
            } else if (!parsedJson.metadata.pageTypes) {
                parsedJson.metadata.pageTypes = []; // Säkerställ att det är en array om det saknas
            }


            state.setState('jsonData', parsedJson);
            console.log("JSON-fil parsades framgångsrikt:", state.jsonData);
            state.setState('isDataModified', false);

            if (contentDisplay) contentDisplay.classList.add('hidden');
            if (postUploadControlsContainer) postUploadControlsContainer.classList.remove('hidden');
            if (controlsDivider) controlsDivider.classList.remove('hidden');
            if (saveChangesButton) saveChangesButton.classList.add('hidden');
            if (filterSortRow) filterSortRow.classList.add('hidden');

            if (dynamicContentArea) {
                setupContentArea(true, false);
                dynamicContentArea.innerHTML = `<p>Regelfil <strong>${escapeHtml(file.name)}</strong> laddades upp.</p><p>Version: ${escapeHtml(state.jsonData?.metadata?.version || 'okänd')}.</p><p>Välj vad du vill visa med knapparna ovan.</p>`;
            } else { console.error("Dynamic content area not found!"); alert("Kunde inte visa innehållsområdet."); }
            console.log("UI uppdaterat efter lyckad filuppladdning.");

        } catch (error) {
            console.error("Fel vid parsning av JSON:", error);
            resetUI();
            showError(`Kunde inte läsa JSON-filen. Kontrollera att filen är korrekt formaterad. Fel: ${escapeHtml(error.message)}`, uploadSection || contentDisplay);
        }
        finally {
            resetFileInput();
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
export function resetFileInput() {
    if (fileInput) {
        fileInput.value = '';
    }
}

/**
 * Uppdaterar versionsnumret i metadata enligt formatet ÅÅÅÅ.M.rSeq.
 */
function updateVersion() {
    if (!state.jsonData?.metadata) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const existingVersion = state.jsonData.metadata.version || '0.0.r0';
    let existingYear = 0, existingMonth = 0, existingSeq = 0;
    const versionRegex = /^(\d{4})\.(\d{1,2})\.r(\d+)$/;
    const match = existingVersion.match(versionRegex);
    if (match) {
        const yearPart = parseInt(match[1], 10);
        const monthPart = parseInt(match[2], 10);
        const seqPart = parseInt(match[3], 10);
        if (!isNaN(yearPart) && !isNaN(monthPart) && !isNaN(seqPart) && monthPart >= 1 && monthPart <= 12) {
            existingYear = yearPart; existingMonth = monthPart; existingSeq = seqPart;
        } else {
            console.warn(`Ogiltigt värde i befintligt versionsformat: "${existingVersion}". Återställer sekvens.`);
            existingYear = 0; existingMonth = 0;
        }
    } else {
        console.warn(`Oväntat befintligt versionsformat: "${existingVersion}". Försöker inte återanvända, återställer sekvens.`);
        existingYear = 0; existingMonth = 0;
    }
    let newSeq = (currentYear === existingYear && currentMonth === existingMonth) ? existingSeq + 1 : 1;
    state.jsonData.metadata.version = `${currentYear}.${currentMonth}.r${newSeq}`;
    console.log(`Version uppdaterad till: ${state.jsonData.metadata.version}`);
}

/**
 * Uppdaterar datumet för senaste ändring i metadata till dagens datum (YYYY-MM-DD).
 */
function updateDateModified() {
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
 * UPPDATERAD för att följa de nya kraven på JSON-struktur.
 */
export function downloadJsonFile() {
    if (!state.jsonData) { showError("Ingen data att spara.", dynamicContentArea || contentDisplay); return; }

    try {
        updateVersion();
        updateDateModified();

        const currentVersion = state.jsonData.metadata.version || 'okänd-version';
        const title = state.jsonData.metadata?.title || 'kravdata';
        let safeTitle = title.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o');
        safeTitle = safeTitle.replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
        safeTitle = safeTitle || 'kravdata';
        const safeVersion = String(currentVersion).replace(/\./g, '_');
        const filename = `${safeTitle}_${safeVersion}.json`;
        console.log(`Förbereder nedladdning. Filnamn: ${filename}`);

        const dataToSave = JSON.parse(JSON.stringify(state.jsonData));

        if (dataToSave.metadata.pageTypes && typeof dataToSave.metadata.pageTypes === 'string') {
            dataToSave.metadata.pageTypes = dataToSave.metadata.pageTypes.split(/\r?\n|,/)
                .map(pt => pt.trim()).filter(Boolean);
        } else if (!Array.isArray(dataToSave.metadata.pageTypes)) {
            dataToSave.metadata.pageTypes = [];
        }
        dataToSave.metadata.pageTypes = dataToSave.metadata.pageTypes.map(pt => String(pt).trim()).filter(Boolean);

        if (Array.isArray(dataToSave.metadata.contentTypes)) {
            dataToSave.metadata.contentTypes = dataToSave.metadata.contentTypes.map(ct => {
                let text = '';
                let id = '';
                if (typeof ct === 'object' && ct !== null) {
                    text = String(ct.text || '').trim();
                    id = String(ct.id || '').trim();
                } else if (typeof ct === 'string') {
                    text = ct.trim();
                }

                if (!text) return null;

                text = text.charAt(0).toUpperCase() + text.slice(1);
                
                if (!id || id !== generateKeyFromName(text)) {
                    id = generateKeyFromName(text);
                }
                
                return { id: id, text: text };
            }).filter(Boolean);
        } else {
            dataToSave.metadata.contentTypes = [];
        }

        if (!dataToSave.metadata.monitoringType ||
            typeof dataToSave.metadata.monitoringType.type !== 'string' ||
            typeof dataToSave.metadata.monitoringType.text !== 'string') {
            console.warn("metadata.monitoringType har felaktig struktur eller saknas. Sätter default.");
            const defaultMonType = MONITORING_TYPES.find(t => t.type === 'web') || MONITORING_TYPES[0] || {type: "unknown", text: "Okänd"};
            dataToSave.metadata.monitoringType = { ...defaultMonType };
        }

        const processedRequirements = {};
        if (dataToSave.requirements && typeof dataToSave.requirements === 'object') {
            for (const key in dataToSave.requirements) {
                if (Object.prototype.hasOwnProperty.call(dataToSave.requirements, key)) {
                    const originalReq = dataToSave.requirements[key];
                    if (typeof originalReq !== 'object' || originalReq === null) {
                        console.warn(`Requirement with key "${key}" är inte ett objekt, skippar.`);
                        continue;
                    }

                    const processedReq = { ...originalReq };

                    processedReq.metadata = processedReq.metadata || {};
                    processedReq.metadata.mainCategory = processedReq.metadata.mainCategory || REQUIREMENT_KEY_DEFAULTS.metadata.mainCategory;
                    processedReq.title = processedReq.title || REQUIREMENT_KEY_DEFAULTS.title;

                    if (typeof processedReq.standardReference !== 'object' || processedReq.standardReference === null) {
                        processedReq.standardReference = { text: "", url: "" };
                    }
                    processedReq.standardReference.text = processedReq.standardReference.text || "";
                    processedReq.standardReference.url = processedReq.standardReference.url || "";

                    processedReq.instructions = Array.isArray(processedReq.instructions) ? processedReq.instructions : [];
                    processedReq.instructions = processedReq.instructions.map((instr, idx) => {
                        if (typeof instr === 'object' && instr !== null) {
                            return { id: String(instr.id || idx + 1), text: String(instr.text || '') };
                        }
                        return { id: String(idx + 1), text: String(instr || '') };
                    });

                    // ** START: KORRIGERING **
                    processedReq.checks = Array.isArray(processedReq.checks) ? processedReq.checks : [];
                    processedReq.checks = processedReq.checks.map((chk, idx) => {
                        if (typeof chk !== 'object' || chk === null) return null;

                        const cleanCheck = { ...chk, id: String(chk.id || idx + 1) };
                        
                        cleanCheck.passCriteria = (Array.isArray(chk.passCriteria) ? chk.passCriteria : []).map((crit, cIdx) => {
                            if (typeof crit !== 'object' || crit === null) return { id: `${idx+1}.${cIdx+1}`, requirement: String(crit || ''), failureStatementTemplate: '' };
                            return {
                                id: String(crit.id || `${idx+1}.${cIdx+1}`),
                                requirement: String(crit.requirement || ''),
                                failureStatementTemplate: String(crit.failureStatementTemplate || '') // Säkerställ att fältet bevaras
                            };
                        });
                        
                        cleanCheck.ifNo = (Array.isArray(chk.ifNo) ? chk.ifNo : []).map((crit, cIdx) => {
                             if (typeof crit !== 'object' || crit === null) return { id: `${idx+1}.no.${cIdx+1}`, requirement: String(crit || ''), failureStatementTemplate: '' };
                            return {
                                id: String(crit.id || `${idx+1}.no.${cIdx+1}`),
                                requirement: String(crit.requirement || ''),
                                failureStatementTemplate: String(crit.failureStatementTemplate || '') // Säkerställ att fältet bevaras
                            };
                        });

                        return cleanCheck;
                    }).filter(Boolean);
                    // ** SLUT: KORRIGERING **

                    processedReq.contentType = Array.isArray(processedReq.contentType) ? processedReq.contentType : [];
                    processedReq.contentType = processedReq.contentType.map(ct => String(ct)).filter(Boolean);
                    const validContentTypeIds = new Set(dataToSave.metadata.contentTypes.map(ct => ct.id));
                    processedReq.contentType = processedReq.contentType.filter(id => {
                        if (!validContentTypeIds.has(id)) {
                            console.warn(`Krav ${key} refererar till ogiltigt contentType ID: ${id}. Tas bort.`);
                            return false;
                        }
                        return true;
                    });

                    STANDARD_REQUIREMENT_KEYS.forEach(stdKey => {
                        if (!Object.prototype.hasOwnProperty.call(processedReq, stdKey) || processedReq[stdKey] === null || processedReq[stdKey] === undefined) {
                            console.log(`Lägger till defaultvärde för saknad nyckel '${stdKey}' i krav '${key}'`);
                            const defaultValue = REQUIREMENT_KEY_DEFAULTS[stdKey];
                            processedReq[stdKey] = (typeof defaultValue === 'object' && defaultValue !== null)
                                ? JSON.parse(JSON.stringify(defaultValue))
                                : defaultValue;
                        }
                    });
                    processedRequirements[key] = processedReq;
                }
            }
        }
        dataToSave.requirements = processedRequirements;


        const jsonString = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

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

        state.setState('isDataModified', false);
        if (saveChangesButton) saveChangesButton.classList.add('hidden');

        const controlsContainer = postUploadControlsContainer;
        if (controlsContainer) {
            const existingSpan = controlsContainer.querySelector('.save-confirmation-inline');
            if(existingSpan) existingSpan.remove();
            const confirmationSpan = document.createElement('span');
            confirmationSpan.innerHTML = `${ICONS.confirm} Fil sparad (v ${escapeHtml(currentVersion)})!`;
            confirmationSpan.style.color = 'var(--success-color)';
            confirmationSpan.style.fontWeight = 'bold';
            confirmationSpan.style.marginLeft = '1em';
            confirmationSpan.classList.add('save-confirmation-inline');
            const secondaryControls = controlsContainer.querySelector('.secondary-controls');
             if (secondaryControls && saveChangesButton && secondaryControls.contains(saveChangesButton)) {
                 saveChangesButton.parentNode.insertBefore(confirmationSpan, saveChangesButton.nextSibling);
             } else if (saveChangesButton && controlsContainer.contains(saveChangesButton)) {
                 saveChangesButton.parentNode.insertBefore(confirmationSpan, saveChangesButton.nextSibling);
             } else {
                 controlsContainer.appendChild(confirmationSpan);
             }
            setTimeout(() => { confirmationSpan.remove(); }, 4000);
        } else {
             alert(`Filen sparades med version ${escapeHtml(currentVersion)}!`);
        }

    } catch (error) {
        console.error("Fel vid förberedelse eller start av JSON-nedladdning:", error);
        showError(`Kunde inte skapa filen för nedladdning. Fel: ${escapeHtml(error.message)}`, dynamicContentArea || contentDisplay);
    }
}

console.log("Module loaded: file_handling");