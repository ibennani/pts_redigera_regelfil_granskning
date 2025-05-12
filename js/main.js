// js/main.js
// Huvudapplikationens startpunkt

// Importera nödvändiga funktioner och referenser från andra moduler
import {
    fileInput, showMetadataButton, showRequirementsButton,
    addRequirementButton, saveChangesButton, sortOrderSelect, searchInput,
    filterSortRow
} from './_-----_dom_element_references.js';
import { handleFileUpload, downloadJsonFile } from './_-----_file_handling.js';
import { displayMetadata } from './_-----_metadata_functions.js';
import { displayRequirements, renderRequirementForm } from './_---_requirement_functions.js';
import { initializeUI } from './_-----_ui_functions.js';
import * as state from './_-----_global_state.js';

// ----- Event Listeners -----

/**
 * Initierar gränssnittet och sätter upp globala händelselyssnare.
 */
function initializeApp() {
    console.log("Initializing application...");
    initializeUI(); // Sätt initialt UI-läge

    // Händelselyssnare för filuppladdning
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
        console.log("File input listener added.");
    } else {
        console.error("File input element not found!");
    }

    // Händelselyssnare för huvudkontrollknappar
    if (showMetadataButton) {
        showMetadataButton.addEventListener('click', displayMetadata);
        console.log("Metadata button listener added.");
    } else {
        console.error("Metadata button not found!");
    }

    if (showRequirementsButton) {
        showRequirementsButton.addEventListener('click', displayRequirements);
        console.log("Requirements button listener added.");
    } else {
        console.error("Requirements button not found!");
    }

    // Händelselyssnare för kravlistans kontroller
    if (addRequirementButton) {
        // Visa formulär för nytt krav (null indikerar nytt)
        addRequirementButton.addEventListener('click', () => renderRequirementForm(null));
        console.log("Add requirement button listener added.");
    } else {
         // Detta är en del av filter/sort-raden, så det är ok om den inte finns initialt
        // console.warn("Add requirement button not found initially.");
    }

    if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', (event) => {
            state.setState('currentSortOrder', event.target.value);
            console.log("Sort order changed:", state.currentSortOrder);
            displayRequirements(); // Uppdatera listan med ny sortering
        });
         console.log("Sort order select listener added.");
    } else {
        // console.warn("Sort order select not found initially.");
    }

    if (searchInput) {
        // Använd 'input' för att reagera på varje ändring, 'search' för när användaren explicit söker/rensar
        searchInput.addEventListener('input', () => {
            state.setState('currentSearchTerm', searchInput.value);
            // console.log("Search term input:", state.currentSearchTerm);
            // Överväg debounce här för prestanda vid stora listor
            displayRequirements(); // Uppdatera listan vid varje teckenändring
        });
        // Optional: Listener for 'search' event (when user clears the field with 'x')
        searchInput.addEventListener('search', () => {
             state.setState('currentSearchTerm', searchInput.value);
             console.log("Search event triggered (cleared/submitted):", state.currentSearchTerm);
             displayRequirements();
        });
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
            event.preventDefault(); // Standard för de flesta webbläsare
            event.returnValue = ''; // Krävs för vissa äldre webbläsare
            return ''; // För att visa standardmeddelandet
        }
         console.log("Inga modifierade data, lämnar sidan utan prompt.");
    });
    console.log("Beforeunload listener added.");

    console.log("Application initialized.");
}

// ----- Starta applikationen när DOM är laddat -----
document.addEventListener('DOMContentLoaded', initializeApp);
