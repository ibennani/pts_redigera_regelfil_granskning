// js/main.js
// Huvudapplikationens startpunkt

// Importera nödvändiga funktioner och referenser från andra moduler
import {
    fileInput, showMetadataButton, showRequirementsButton,
    addRequirementButton, saveChangesButton, sortOrderSelect, searchInput,
    filterSortRow, uploadFileButton, dynamicContentArea // Lade till dynamicContentArea här
} from './_-----_dom_element_references.js';
import { handleFileUpload, downloadJsonFile } from './_-----_file_handling.js';
import { displayMetadata } from './_-----_metadata_functions.js';
import { displayRequirements, renderRequirementForm } from './_---_requirement_functions.js';
import { initializeUI } from './_-----_ui_functions.js';
import * as state from './_-----_global_state.js';

// Importera den nya modulen för temaväxlaren
import { initializeThemeSwitcher } from './_theme_switcher.js'; 

// ----- Event Listeners -----

/**
 * Initierar gränssnittet och sätter upp globala händelselyssnare.
 */
function initializeApp() {
    console.log("Initializing application...");
    initializeUI(); // Sätt initialt UI-läge

    // Anropa initieringsfunktionen för temaväxlaren
    initializeThemeSwitcher();


    // Händelselyssnare för filuppladdning
    if (uploadFileButton && fileInput) {
        uploadFileButton.addEventListener('click', () => {
            fileInput.click(); 
        });
        console.log("Upload file button listener added.");

        fileInput.addEventListener('change', handleFileUpload);
        console.log("File input 'change' listener added.");

    } else {
        if (!uploadFileButton) console.error("Upload file button element not found!");
        if (!fileInput) console.error("File input element (hidden) not found!");
    }

    // Händelselyssnare för huvudkontrollknappar
    if (showMetadataButton) {
        showMetadataButton.addEventListener('click', () => {
            // Om vi kommer från en kravvy, kanske vi vill nollställa currentRequirementKey
            // men lastFocusedReqKey kan vara kvar om vi vill återgå till ett specifikt krav senare.
            // För nu, låt oss bara nollställa currentRequirementKey för metadata-vyn.
            state.setState('currentRequirementKey', null);
            displayMetadata();
        });
        console.log("Metadata button listener added.");
    } else {
        console.error("Metadata button not found!");
    }

    if (showRequirementsButton) {
        showRequirementsButton.addEventListener('click', () => {
            // Om vi kommer från en detalj- eller redigeringsvy för ett krav,
            // sätt lastFocusedReqKey så att displayRequirements kan scrolla dit.
            if (state.currentRequirementKey) {
                state.setState('lastFocusedReqKey', state.currentRequirementKey);
                console.log(`[Show All] Set lastFocusedReqKey to: ${state.currentRequirementKey}`);
            }
            // Nollställ currentRequirementKey eftersom vi nu går till en listvy.
            state.setState('currentRequirementKey', null);

            displayRequirements();
        });
        console.log("Requirements button listener added (with focus logic).");
    } else {
        console.error("Requirements button not found!");
    }

    // Händelselyssnare för kravlistans kontroller
    if (addRequirementButton) {
        addRequirementButton.addEventListener('click', () => renderRequirementForm(null));
        console.log("Add requirement button listener added.");
    } else {
        // console.warn("Add requirement button not found initially.");
    }

    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', (event) => {
            state.setState('currentSortOrder', event.target.value);
            console.log("Sort order changed:", state.currentSortOrder);
            // Re-render the requirements list if it's currently displayed
            // Använder den importerade dynamicContentArea
            if (state.jsonData?.requirements && dynamicContentArea && 
                !dynamicContentArea.classList.contains('form-view') &&
                !dynamicContentArea.classList.contains('requirement-detail') &&
                !dynamicContentArea.classList.contains('delete-confirmation-view'))
            {
                displayRequirements(); 
            }
        });
         console.log("Sort order select listener added.");
    } else {
        // console.warn("Sort order select not found initially.");
    }

    if (searchInput) {
        let searchTimeout; 
        function handleSearchInput(event) {
            const searchTerm = event.target.value || '';
            clearTimeout(searchTimeout);

            searchTimeout = setTimeout(() => {
                state.setState('currentSearchTerm', searchTerm);
                console.log(`Search term updated: "${state.currentSearchTerm}"`);
                // Använder den importerade dynamicContentArea
                if (state.jsonData?.requirements && dynamicContentArea &&
                    !dynamicContentArea.classList.contains('form-view') &&
                    !dynamicContentArea.classList.contains('requirement-detail') &&
                    !dynamicContentArea.classList.contains('delete-confirmation-view'))
                {
                    displayRequirements();
                }
            }, 300); 
        }
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('search', handleSearchInput); 
        console.log("Search input listener added.");
    } else {
        // console.warn("Search input not found initially.");
    }


    // Händelselyssnare för global spara-knapp
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', downloadJsonFile);
        console.log("Save changes button listener added.");
    } else {
        console.error("Save changes button not found!");
    }

    // Varning vid försök att lämna sidan med osparade ändringar
    window.addEventListener('beforeunload', (event) => {
        if (state.isDataModified) {
            console.log("Data är modifierad, visar beforeunload-prompt.");
            event.preventDefault(); 
            event.returnValue = ''; 
            return ''; 
        }
         console.log("Inga modifierade data, lämnar sidan utan prompt.");
    });
    console.log("Beforeunload listener added.");

    console.log("Application initialized.");
}

// ----- Starta applikationen när DOM är laddat -----
document.addEventListener('DOMContentLoaded', initializeApp);