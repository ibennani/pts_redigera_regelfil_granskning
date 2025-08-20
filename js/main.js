// js/main.js
// Huvudapplikationens startpunkt

// Importera nödvändiga funktioner och referenser från andra moduler
import {
    fileInput, showMetadataButton, showRequirementsButton,
    addRequirementButton, sortOrderSelect, searchInput,
    uploadFileButton, dynamicContentArea, 
    topBar, bottomBar // ÄNDRAD: Tog bort saveChangesButton-importer
} from './_-----_dom_element_references.js';
import { handleFileUpload, downloadJsonFile } from './_-----_file_handling.js';
import { displayMetadata } from './_-----_metadata_functions.js';
import { displayRequirements, renderRequirementForm } from './_---_requirement_functions.js';
import { initializeUI } from './_-----_ui_functions.js';
import * as state from './_-----_global_state.js';

// Importera modulen för temaväxlaren
import { initializeThemeSwitcher } from './_theme_switcher.js'; 

// ----- Event Listeners -----

/**
 * Initierar gränssnittet och sätter upp globala händelselyssnare.
 */
function initializeApp() {
    console.log("Initializing application...");
    initializeUI(); // Sätt initialt UI-läge

    initializeThemeSwitcher();

    // Händelselyssnare för filuppladdning
    if (uploadFileButton && fileInput) {
        uploadFileButton.addEventListener('click', () => {
            fileInput.click(); 
        });
        fileInput.addEventListener('change', handleFileUpload);
    } else {
        console.error("Upload file button or file input element not found!");
    }

    // Händelselyssnare för huvudkontrollknappar
    if (showMetadataButton) {
        showMetadataButton.addEventListener('click', () => {
            state.setState('currentRequirementKey', null);
            displayMetadata();
        });
    }

    if (showRequirementsButton) {
        showRequirementsButton.addEventListener('click', () => {
            if (state.currentRequirementKey) {
                state.setState('lastFocusedReqKey', state.currentRequirementKey);
            }
            state.setState('currentRequirementKey', null);
            displayRequirements();
        });
    }

    // Händelselyssnare för kravlistans kontroller
    if (addRequirementButton) {
        addRequirementButton.addEventListener('click', () => renderRequirementForm(null));
    }

    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', (event) => {
            state.setState('currentSortOrder', event.target.value);
            if (state.jsonData?.requirements && dynamicContentArea && 
                !dynamicContentArea.classList.contains('form-view') &&
                !dynamicContentArea.classList.contains('requirement-detail') &&
                !dynamicContentArea.classList.contains('delete-confirmation-view'))
            {
                displayRequirements(); 
            }
        });
    }

    if (searchInput) {
        let searchTimeout; 
        function handleSearchInput(event) {
            const searchTerm = event.target.value || '';
            clearTimeout(searchTimeout);

            searchTimeout = setTimeout(() => {
                state.setState('currentSearchTerm', searchTerm);
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
    }

    // BORTTAGEN: Händelselyssnare för spara-knapparna.
    // Detta hanteras nu dynamiskt i file_handling.js när knapparna skapas.

    // Varning vid försök att lämna sidan med osparade ändringar
    window.addEventListener('beforeunload', (event) => {
        if (state.isDataModified) {
            event.preventDefault(); 
            event.returnValue = ''; 
            return ''; 
        }
    });

    console.log("Application initialized.");
}

// ----- Starta applikationen när DOM är laddat -----
document.addEventListener('DOMContentLoaded', initializeApp);