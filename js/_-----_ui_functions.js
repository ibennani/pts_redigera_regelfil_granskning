// js/_-----_ui_functions.js

// Importer
import {
    contentDisplay, uploadSection, postUploadControlsContainer,
    controlsDivider, dynamicContentArea, filterSortRow, sortOrderSelect,
    searchInput, topBar, bottomBar
} from './_-----_dom_element_references.js';
import { escapeHtml } from './_-----_utils__helpers.js';
import { ICONS } from './_-----_constants.js';
import * as state from './_-----_global_state.js';

// --- NYTT: Funktioner för att dynamiskt hantera spara-knappar ---

/**
 * Skapar en spara-knapp.
 * @param {string} id - Knappens ID (t.ex. 'saveChangesButtonTop')
 * @returns {HTMLButtonElement} Det skapade knappelementet.
 */
// ÄNDRAD: Lade till 'export'
export function createSaveButton(id) {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'save-button';
    button.innerHTML = `Spara filen <span class="icon" aria-hidden="true">${ICONS.save}</span>`;
    return button;
}

/**
 * Tar bort alla spara-knappar från DOM.
 */
export function removeSaveButtons() {
    const buttons = document.querySelectorAll('.save-button');
    buttons.forEach(button => button.remove());
}

// --- Uppdaterade UI-funktioner ---

/**
 * Initialiserar gränssnittet när sidan laddas.
 */
export function initializeUI() {
    console.log("--- Running initializeUI ---");
    if (!contentDisplay || !uploadSection || !postUploadControlsContainer) {
        console.error("InitializeUI: Någon av huvudcontainrarna saknas!");
        return;
    }

    if (uploadSection.parentNode !== contentDisplay) {
        contentDisplay.appendChild(uploadSection);
    }
    uploadSection.classList.remove('hidden');
    contentDisplay.classList.remove('hidden');
    
    postUploadControlsContainer.classList.add('hidden');
    if (controlsDivider) controlsDivider.classList.add('hidden');
    if (dynamicContentArea) {
        dynamicContentArea.innerHTML = '';
        dynamicContentArea.classList.add('hidden');
    }
    if (filterSortRow) filterSortRow.classList.add('hidden');
    
    if (topBar) topBar.classList.remove('hidden');
    if (bottomBar) bottomBar.classList.add('hidden');
    removeSaveButtons();

    if (sortOrderSelect) sortOrderSelect.value = 'ref-asc'; 
    console.log("--- initializeUI Finished ---");
}

/**
 * Förbereder det dynamiska innehållsområdet för nytt innehåll.
 */
export function setupContentArea(clearDynamic = true, showFilterSort = false) {
    if (!dynamicContentArea) {
        console.error("Dynamic Content Area (#dynamicContentArea) not found!");
        showError("Internt fel: Kunde inte hitta innehållsområdet.", contentDisplay);
        return;
    }

    if (clearDynamic) {
        dynamicContentArea.innerHTML = '';
    }
    dynamicContentArea.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
    dynamicContentArea.classList.remove('hidden');

    if (filterSortRow) {
        filterSortRow.classList.toggle('hidden', !showFilterSort);
    } else if (showFilterSort) {
        console.warn("Filter/Sort row (#filterSortRow) not found when trying to show it.");
    }
}

/**
 * Visar ett felmeddelande i angiven container.
 */
export function showError(message, container = dynamicContentArea) {
    if (!container) container = contentDisplay;

    if (container === dynamicContentArea || container === contentDisplay) {
        if (postUploadControlsContainer) postUploadControlsContainer.classList.add('hidden');
        if (controlsDivider) controlsDivider.classList.add('hidden');
        if (filterSortRow) filterSortRow.classList.add('hidden');
        if (bottomBar) bottomBar.classList.add('hidden');
        removeSaveButtons();
        if (dynamicContentArea && container === contentDisplay) {
            dynamicContentArea.classList.add('hidden');
        }
    }

    if (container) {
        container.innerHTML = `<p class="error">${ICONS.warning} ${escapeHtml(message)}</p>`;
        container.classList.remove('hidden');
    } else {
        console.error("Cannot show error message in any container. Message:", message);
        alert("Ett allvarligt fel uppstod: " + message);
    }
}

/**
 * Visar ett bekräftelsemeddelande.
 */
export function displayConfirmation(message, type = 'info', container = dynamicContentArea) {
    if (!container) return;
    const existingConfirmations = container.querySelectorAll('.confirmation-message');
    existingConfirmations.forEach(el => el.remove());
    const confirmation = document.createElement('p');
    const icon = type === 'save' ? ICONS.confirm : type === 'delete' ? ICONS.delete : ICONS.info;
    confirmation.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span> ${escapeHtml(message)}`;
    confirmation.classList.add('confirmation-message', `${type}-confirmation`);
    confirmation.setAttribute('role', 'status');
    const firstHeading = container.querySelector('h2, h3');
    if (firstHeading && firstHeading.parentNode === container) {
        firstHeading.parentNode.insertBefore(confirmation, firstHeading.nextSibling);
    } else {
        container.prepend(confirmation);
    }
    setTimeout(() => { if (confirmation.parentNode) confirmation.remove(); }, 5000);
}

/**
 * Återställer hela gränssnittet till startläget.
 */
export function resetUI() {
    console.log("--- Running resetUI ---");
    initializeUI();
    state.setState('jsonData', null);
    state.setState('currentRequirementKey', null);
    state.setState('lastFocusedReqKey', null);
    state.setState('isDataModified', false);
    state.setState('currentSortOrder', 'category-asc');
    state.setState('currentSearchTerm', '');
    if (sortOrderSelect) sortOrderSelect.value = state.currentSortOrder;
    if (searchInput) searchInput.value = '';
    if (window.history.replaceState) {
       history.replaceState(null, '', window.location.pathname);
    }
    console.log("--- resetUI Finished ---");
}

/**
 * Uppdaterar text och stil på spara-knapparna (om de finns).
 */
export function updateSaveButtonsState() {
    const buttons = document.querySelectorAll('.save-button');
    if (buttons.length === 0) return;

    const hasUnsavedChanges = state.isDataModified;
    const text = hasUnsavedChanges ? "Spara nya ändringar" : "Spara filen";
    const iconHTML = `<span class="icon" aria-hidden="true">${ICONS.save}</span>`;

    buttons.forEach(button => {
        button.innerHTML = `${text} ${iconHTML}`;
        button.classList.toggle('has-unsaved-changes', hasUnsavedChanges);
    });
}