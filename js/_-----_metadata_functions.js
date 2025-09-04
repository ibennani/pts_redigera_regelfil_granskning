// js/_-----_metadata_functions.js
/*
    MODIFIED: This file is now simplified and corrected.
    - FIXED: Added the missing import for the hierarchy editor component functions.
      This resolves the "appendChild is not a function" TypeError.
*/

// Importer
import { dynamicContentArea } from './_-----_dom_element_references.js';
import { ICONS } from './_-----_constants.js';
import * as state from './_-----_global_state.js';
import { getVal, generateKeyFromName } from './_-----_utils__helpers.js';
import { setupContentArea, showError, displayConfirmation, updateSaveButtonsState } from './_-----_ui_functions.js';
// FIXED: Added the missing import for the hierarchy editor
import { createDynamicHierarchyEditor, parseHierarchyEditorData } from './_-----_ui_metadata_hierarchies_editor.js';


export function renderMetadataForm(sectionToShow) {
    if (!state.jsonData || !state.jsonData.metadata) {
        showError("Metadata saknas eller kunde inte laddas.");
        return;
    }

    setupContentArea(true, false);
    const targetArea = document.getElementById('dynamicContentArea');
    if (!targetArea) return;
    targetArea.classList.add('form-container');

    const form = document.createElement('form');
    form.id = 'metadataForm';
    form.noValidate = true;
    form.addEventListener('submit', (e) => saveMetadata(e, sectionToShow));

    const metadata = state.jsonData.metadata;
    
    const heading = document.createElement('h2');
    heading.textContent = sectionToShow === 'contentTypes' ? 'Hantera innehållstyper' : 'Hantera sidtyper';
    form.appendChild(heading);

    const handleCancelFromSubform = () => {
        renderMetadataForm(sectionToShow);
    };

    if (sectionToShow === 'contentTypes') {
        const contentTypesConfig = {
            childrenKey: 'types',
            labels: { mainItem: 'huvudinnehållstyp', subItem: 'undertyp' },
            fields: {
                mainItem: [{ name: 'text', label: 'Namn', type: 'text', required: true }],
                subItem: [
                    { name: 'text', label: 'Namn', type: 'text', required: true },
                    { name: 'description', label: 'Beskrivning', type: 'textarea', required: false }
                ]
            },
            onCancel: handleCancelFromSubform
        };
        form.appendChild(createDynamicHierarchyEditor('Innehållstyper', 'contentTypes', metadata.contentTypes || [], contentTypesConfig));
    
    } else if (sectionToShow === 'samples') {
        const sampleCategoriesConfig = {
            childrenKey: 'categories',
            labels: { mainItem: 'huvudkategori för sidtyper', subItem: 'sidtyp' },
            fields: {
                mainItem: [
                    { name: 'text', label: 'Namn', type: 'text', required: true },
                    { name: 'hasUrl', label: 'Kräver URL', type: 'checkbox', required: false }
                ],
                subItem: [
                    { name: 'text', label: 'Namn', type: 'text', required: true }
                ]
            },
            onCancel: handleCancelFromSubform
        };
        form.appendChild(createDynamicHierarchyEditor('Sidtyper (Samples)', 'samples.sampleCategories', getVal(metadata, 'samples.sampleCategories', []), sampleCategoriesConfig));
    }
    
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.innerHTML = `Spara ändringar <span class="icon" aria-hidden="true">${ICONS.save}</span>`;
    buttonDiv.appendChild(saveBtn);
    
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.innerHTML = `Tillbaka <span class="icon" aria-hidden="true">${ICONS.back}</span>`;
    backBtn.addEventListener('click', () => {
        setupContentArea(true, false);
        dynamicContentArea.innerHTML = `<p>Välj vad du vill göra med knapparna ovan.</p>`;
    });
    buttonDiv.appendChild(backBtn);
    form.appendChild(buttonDiv);

    targetArea.appendChild(form);
}

export function saveMetadata(event, sectionToSave) {
    event.preventDefault();
    const form = event.target;
    if (!state.jsonData || !state.jsonData.metadata) return;

    const originalMetadataString = JSON.stringify(state.jsonData.metadata);
    const updatedMetadata = JSON.parse(JSON.stringify(state.jsonData.metadata));

    let dataChanged = false;

    if (sectionToSave === 'contentTypes') {
        const newContentTypes = parseHierarchyEditorData(form.querySelector('#editor-contentTypes'));
        if (JSON.stringify(updatedMetadata.contentTypes) !== JSON.stringify(newContentTypes)) {
            updatedMetadata.contentTypes = newContentTypes;
            dataChanged = true;
        }
    } else if (sectionToSave === 'samples') {
        const newSamples = parseHierarchyEditorData(form.querySelector('#editor-samples-sampleCategories'));
        if (!updatedMetadata.samples) updatedMetadata.samples = {};
        if (JSON.stringify(getVal(updatedMetadata, 'samples.sampleCategories')) !== JSON.stringify(newSamples)) {
            updatedMetadata.samples.sampleCategories = newSamples;
            dataChanged = true;
        }
    }

    if (dataChanged) {
        state.jsonData.metadata = updatedMetadata;
        state.setState('isDataModified', true);
        updateSaveButtonsState();
        renderMetadataForm(sectionToSave); 
        displayConfirmation('Ändringar sparade! Glöm inte att spara ner hela filen.', 'save', document.getElementById('dynamicContentArea'));
    } else {
        renderMetadataForm(sectionToSave);
    }
}