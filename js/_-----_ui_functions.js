// js/_-----_ui_functions.js

// Importera nödvändiga DOM-referenser och hjälpfunktioner/konstanter
import {
    contentDisplay, uploadSection, postUploadControlsContainer,
    controlsDivider, dynamicContentArea, filterSortRow, sortOrderSelect,
    searchInput, saveChangesButton
} from './_-----_dom_element_references.js';
import { escapeHtml } from './_-----_utils__helpers.js';
import { ICONS } from './_-----_constants.js';
import * as state from './_-----_global_state.js'; // Importera allt från state för att kunna återställa

/**
 * Initialiserar gränssnittet när sidan laddas.
 * Visar uppladdningsvyn och döljer resten.
 */
export function initializeUI() {
    console.log("--- Running initializeUI ---");

    // Kontrollera att huvudcontainrar finns (bör finnas om HTML är korrekt)
    if (!contentDisplay) console.error("initializeUI: contentDisplay not found!");
    if (!uploadSection) console.error("initializeUI: uploadSection not found!");
    if (!postUploadControlsContainer) console.error("initializeUI: postUploadControlsContainer not found!");
    if (!controlsDivider) console.error("initializeUI: controlsDivider not found!");
    if (!dynamicContentArea) console.error("initializeUI: dynamicContentArea not found!");
    if (!filterSortRow) console.warn("initializeUI: filterSortRow not found."); // Kan vara ok om designen ändras

    // Visa uppladdningsvyn inuti contentDisplay
    if (contentDisplay) {
        contentDisplay.innerHTML = ''; // Rensa först
        if (uploadSection) {
            // Se till att uploadSection är ett barn till contentDisplay
            if (uploadSection.parentNode !== contentDisplay) {
                console.log("Appending uploadSection to contentDisplay.");
                contentDisplay.appendChild(uploadSection);
            }
            uploadSection.classList.remove('hidden');
            console.log("uploadSection should be visible.");
        }
        contentDisplay.classList.remove('hidden');
        console.log("contentDisplay should be visible.");
    }

    // Dölj externa kontroller och dynamiskt område
    if (postUploadControlsContainer) postUploadControlsContainer.classList.add('hidden');
    if (controlsDivider) controlsDivider.classList.add('hidden');
    if (dynamicContentArea) {
        dynamicContentArea.innerHTML = '';
        dynamicContentArea.classList.add('hidden');
        // Ta bort alla potentiella view-klasser
        dynamicContentArea.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
    }
    if (filterSortRow) filterSortRow.classList.add('hidden'); // Göm filter/sorteringsraden explicit

    // Återställ klasser på contentDisplay ifall de finns kvar
    contentDisplay?.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view');

    // Återställ sorteringsvalet till default
    if (sortOrderSelect) sortOrderSelect.value = 'category-asc'; // Default sort

    console.log("--- initializeUI Finished ---");
}

/**
 * Förbereder det dynamiska innehållsområdet för nytt innehåll.
 * @param {boolean} [clearDynamic=true] Området ska rensas på innehåll.
 * @param {boolean} [showFilterSort=false] Om filter/sorteringsraden ska visas.
 */
export function setupContentArea(clearDynamic = true, showFilterSort = false) {
    if (!dynamicContentArea) {
        console.error("Dynamic Content Area (#dynamicContentArea) not found!");
        // Försök visa ett fel i huvudfönstret om möjligt
        showError("Internt fel: Kunde inte hitta innehållsområdet.", contentDisplay);
        return;
    }

    if (clearDynamic) {
        dynamicContentArea.innerHTML = '';
    }
    // Ta bort alla specifika view-klasser
    dynamicContentArea.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
    // Se till att området är synligt
    dynamicContentArea.classList.remove('hidden');

    // Hantera synlighet för filter/sorteringsraden explicit
    if (filterSortRow) {
        filterSortRow.classList.toggle('hidden', !showFilterSort);
        // console.log(`Filter/Sort row visibility set to: ${showFilterSort ? 'visible' : 'hidden'}. Current classes: ${filterSortRow.className}`);
    } else if (showFilterSort) {
        // Logga en varning bara om den *förväntas* visas men inte finns
        console.warn("Filter/Sort row (#filterSortRow) not found when trying to show it.");
    }
}

/**
 * Visar ett felmeddelande i angiven container.
 * @param {string} message Felmeddelandet som ska visas.
 * @param {HTMLElement} [container=dynamicContentArea] Containern där felet ska visas.
 */
export function showError(message, container = dynamicContentArea) {
    // Fallback till contentDisplay om dynamicContentArea inte finns (t.ex. tidigt fel)
    if (!container) container = contentDisplay;

    // Om felet visas i ett huvudområde, dölj andra kontroller för tydlighet
    if (container === dynamicContentArea || container === contentDisplay) {
        if (postUploadControlsContainer) postUploadControlsContainer.classList.add('hidden');
        if (controlsDivider) controlsDivider.classList.add('hidden');
        if (filterSortRow) filterSortRow.classList.add('hidden');
        // Dölj dynamicContentArea om felet visas i contentDisplay
        if (dynamicContentArea && container === contentDisplay) {
            dynamicContentArea.classList.add('hidden');
        }
    }

    if (container) {
        container.innerHTML = `<p class="error">${ICONS.warning} ${escapeHtml(message)}</p>`;
        container.classList.remove('hidden');
        // Ta bort specifika view-klasser om felet visas här
        if (container === dynamicContentArea || container === contentDisplay) {
            container.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
        }
    } else {
        // Fallback om ingen container alls finns
        console.error("Cannot show error message in any container. Message:", message);
        alert("Ett allvarligt fel uppstod: " + message); // Sista utväg
    }
}

/**
 * Visar ett bekräftelsemeddelande (t.ex. "Sparad!", "Raderad!") i en container.
 * @param {string} message Bekräftelsetexten.
 * @param {'save'|'delete'|'info'} [type='info'] Typ av bekräftelse (för styling).
 * @param {HTMLElement} [container=dynamicContentArea] Containern där meddelandet ska visas.
 */
export function displayConfirmation(message, type = 'info', container = dynamicContentArea) {
    if (!container) {
        console.error("Confirmation container not found when trying to display:", message);
        return; // Kan inte visa meddelandet
    }
    // console.log(`Displaying confirmation (type: ${type}) in container:`, container);

    // Ta bort eventuella tidigare bekräftelser i samma container
    const existingConfirmations = container.querySelectorAll('.confirmation-message');
    existingConfirmations.forEach(el => el.remove());

    const confirmation = document.createElement('p');
    // Välj ikon baserat på typ
    const icon = type === 'save' ? ICONS.confirm : type === 'delete' ? ICONS.delete : ICONS.info;
    confirmation.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span> ${escapeHtml(message)}`;
    confirmation.classList.add('confirmation-message', `${type}-confirmation`);
    confirmation.setAttribute('role', 'status'); // Bra för skärmläsare

    // Försök infoga meddelandet efter första rubriken (H2/H3) om sådan finns direkt under containern
    const firstHeading = container.querySelector('h2, h3');
    if (firstHeading && firstHeading.parentNode === container) {
        // Insert after the heading element
        firstHeading.parentNode.insertBefore(confirmation, firstHeading.nextSibling);
    } else {
        // Annars, lägg det högst upp i containern
        container.prepend(confirmation);
    }

    // Ta bort meddelandet efter en stund
    setTimeout(() => {
        // Kolla om elementet fortfarande finns innan borttagning
        if (confirmation && confirmation.parentNode) {
            confirmation.remove();
        }
    }, 5000); // 5 sekunder
}


/**
 * Återställer hela gränssnittet till startläget (uppladdningsvyn).
 * Återställer även global state.
 */
export function resetUI() {
    console.log("--- Running resetUI ---");

    // Anropa initializeUI för att återställa grundläggande synlighet
    initializeUI();

    // Återställ global state
    state.setState('jsonData', null);
    state.setState('currentRequirementKey', null);
    state.setState('lastFocusedReqKey', null);
    state.setState('isDataModified', false);
    state.setState('currentSortOrder', 'category-asc'); // Återställ till default
    state.setState('currentSearchTerm', '');

    // Rensa sorteringskontroll och sökfält explicit
    if (sortOrderSelect) sortOrderSelect.value = state.currentSortOrder;
    if (searchInput) searchInput.value = '';

    // Göm spara-knappen
    if (saveChangesButton) saveChangesButton.classList.add('hidden');

    // Ta bort eventuella query parametrar från URL:en (om de använts tidigare)
    if (window.history.replaceState) {
       history.replaceState(null, '', window.location.pathname);
    }

    console.log("--- resetUI Finished ---");
}


console.log("Module loaded: ui_functions"); // För felsökning