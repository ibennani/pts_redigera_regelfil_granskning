// js/main.js
/*
    MODIFIED:
    - Removed the old 'showMetadataButton' and its corresponding import.
    - Added imports for the new 'manageContentTypesButton' and 'manageSampleCategoriesButton'.
    - Removed the faulty import for the now-deleted 'displayMetadata' function.
    - Added event listeners for the new buttons to call 'renderMetadataForm' with the
      correct parameters ('contentTypes' or 'samples').
*/

// Importera nödvändiga funktioner och referenser från andra moduler
import {
    fileInput, showRequirementsButton,
    addRequirementButton, sortOrderSelect, searchInput,
    uploadFileButton, dynamicContentArea, 
    // MODIFIED: Replaced button reference
    manageContentTypesButton, manageSampleCategoriesButton
} from './_-----_dom_element_references.js';
import { handleFileUpload } from './_-----_file_handling.js';
// MODIFIED: Removed displayMetadata, kept renderMetadataForm
import { renderMetadataForm } from './_-----_metadata_functions.js';
import { renderRequirementForm as renderNewRequirementForm } from './_---_requirement_functions.js';
import { displayRequirements } from './_---_requirement_functions.js';
import { initializeUI } from './_-----_ui_functions.js';
import * as state from './_-----_global_state.js';
import { initializeThemeSwitcher } from './_theme_switcher.js'; 

// ----- Event Listeners -----

function initializeApp() {
    initializeUI();
    initializeThemeSwitcher();

    if (uploadFileButton && fileInput) {
        uploadFileButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
    }

    if (manageContentTypesButton) {
        manageContentTypesButton.addEventListener('click', () => {
            state.setState('currentView', 'manageContentTypes');
            renderMetadataForm('contentTypes'); // Anropar redigeringsvyn
        });
    }

    if (manageSampleCategoriesButton) {
        manageSampleCategoriesButton.addEventListener('click', () => {
            state.setState('currentView', 'manageSampleCategories');
            renderMetadataForm('samples'); // Anropar redigeringsvyn
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

    if (addRequirementButton) {
        addRequirementButton.addEventListener('click', () => renderNewRequirementForm(null));
    }

    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', (event) => {
            state.setState('currentSortOrder', event.target.value);
            if (state.jsonData?.requirements && dynamicContentArea && 
                !dynamicContentArea.classList.contains('form-container') &&
                !dynamicContentArea.classList.contains('requirement-detail'))
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
                    !dynamicContentArea.classList.contains('form-container') &&
                    !dynamicContentArea.classList.contains('requirement-detail'))
                {
                    displayRequirements();
                }
            }, 300); 
        }
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('search', handleSearchInput); 
    }

    window.addEventListener('beforeunload', (event) => {
        if (state.isDataModified) {
            event.preventDefault(); 
            event.returnValue = ''; 
            return ''; 
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);