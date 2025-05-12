// js/_-----_metadata_functions.js

// Importer
import { dynamicContentArea, saveChangesButton } from './_-----_dom_element_references.js';
import { MONITORING_TYPES, ICONS, commonLanguages } from './_-----_constants.js';
import * as state from './_-----_global_state.js';
import { escapeHtml, getVal, isValidEmail, generateKeyFromName } from './_-----_utils__helpers.js';
import { setupContentArea, showError, displayConfirmation } from './_-----_ui_functions.js';
// Importera den uppdaterade createFormField från krav-modulen
import { createFormField } from './_---_requirement_functions.js';

/**
 * Visar metadata från state.jsonData i det dynamiska innehållsområdet.
 * *** UPPDATERAD: Visar keywords och contentTypes som punktlistor (endast text). ***
 * (Inga andra logiska ändringar här)
 */
export function displayMetadata() {
    console.log("Visar metadata...");
    if (!state.jsonData?.metadata) {
        showError("Metadata saknas. Ladda upp en fil först.", dynamicContentArea);
        return;
    }
    const metadata = state.jsonData.metadata;

    setupContentArea(true, false); // Clear area, hide filter/sort
    if (!dynamicContentArea) { return; }

    const heading = document.createElement('h2');
    heading.textContent = 'Metadata';
    dynamicContentArea.appendChild(heading);

    // Knappcontainer
    const actionContainer = document.createElement('div');
    actionContainer.className = 'action-button-container';
    const editButton = document.createElement('button');
    editButton.id = 'editMetadataButton';
    editButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.edit}</span> Redigera metadata`;
    editButton.addEventListener('click', renderMetadataForm);
    actionContainer.appendChild(editButton);
    // Insert before the heading for top-right positioning (CSS handles placement)
    dynamicContentArea.insertBefore(actionContainer, heading);


    console.log("Loopar genom metadata-nycklar...");
    let itemCount = 0;
    for (const key in metadata) {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) {
            // Hoppa över nycklar som hanteras specifikt som listor nedan
            if (key === 'contentTypes' || key === 'keywords') continue;

            itemCount++;
            try {
                const value = metadata[key];
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('metadata-item');

                const keyStrong = document.createElement('strong');
                // Make key readable (e.g., "dateModified" -> "Date Modified")
                const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                keyStrong.textContent = `${readableKey}:`;

                // Special handling for display (as before)
                if (key === 'monitoringType' && typeof value === 'object' && value !== null) {
                    keyStrong.textContent = 'Typ av tillsyn:'; // Custom label
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${escapeHtml(value.text || value.type || '(okänd)')}`;
                    itemDiv.appendChild(valueSpan);
                } else if (key === 'publisher' && typeof value === 'object' && value !== null) {
                    keyStrong.style.display = 'block'; // Make key a block element for better layout
                    itemDiv.appendChild(keyStrong);
                    const subList = document.createElement('div');
                    subList.style.marginLeft = '20px'; // Indent sub-items
                    for (const subKey in value) {
                        if (Object.prototype.hasOwnProperty.call(value, subKey)) {
                            subList.appendChild(createMetadataSubItem(subKey, value[subKey]));
                        }
                    }
                    itemDiv.appendChild(subList);
                } else if (key === 'source' && typeof value === 'object' && value !== null) {
                     keyStrong.style.display = 'block';
                    itemDiv.appendChild(keyStrong);
                    const subList = document.createElement('div');
                     subList.style.marginLeft = '20px';
                     const url = value.url;
                     const title = value.title;
                     let urlDisplayed = false;
                    // Display URL as link first, using title as text if available
                    if (url && String(url).trim() !== '') {
                        const linkText = (title && String(title).trim() !== '') ? title : url;
                         subList.appendChild(createMetadataSubItem('url', url, linkText));
                         urlDisplayed = true;
                    }
                    // Display other source fields, avoiding duplication of url/title if already shown in link
                    for (const subKey in value) {
                         if (Object.prototype.hasOwnProperty.call(value, subKey)) {
                             // Skip if url was displayed and this is url, or if url/title were displayed and this is title
                            if ((subKey === 'url' && urlDisplayed) || (subKey === 'title' && urlDisplayed && title && url)) continue;
                            subList.appendChild(createMetadataSubItem(subKey, value[subKey]));
                        }
                    }
                    itemDiv.appendChild(subList);
                } else if (key === 'language') {
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    const langName = commonLanguages[value] || value.toUpperCase(); // Get full name or use code
                    valueSpan.textContent = ` ${escapeHtml(langName)} (${escapeHtml(value)})`;
                    itemDiv.appendChild(valueSpan);
                }
                 else if (Array.isArray(value)) { // Generic array handling (though keywords/contentTypes handled separately now)
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${value.map(v => escapeHtml(String(v))).join(', ')}`;
                    itemDiv.appendChild(valueSpan);
                } else { // Default: display key and value
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${escapeHtml(String(value))}`;
                    itemDiv.appendChild(valueSpan);
                }
                dynamicContentArea.appendChild(itemDiv);
            } catch (error) {
                console.error(`Fel vid visning av metadata-nyckel "${key}":`, error);
                const errorDiv = document.createElement('div');
                errorDiv.textContent = `Fel: ${key}`;
                errorDiv.style.color = 'red';
                dynamicContentArea.appendChild(errorDiv);
            }
        }
    }

    // *** UPDATED HANDLING FOR KEYWORDS AND CONTENT TYPES AS LISTS ***

    // Handle Keywords as a bulleted list
    if (Array.isArray(metadata.keywords)) {
        itemCount++;
        const kwDiv = document.createElement('div'); kwDiv.classList.add('metadata-item');
        const kwHeading = document.createElement('strong'); kwHeading.textContent = 'Nyckelord:'; kwHeading.style.display = 'block'; kwDiv.appendChild(kwHeading);
        if (metadata.keywords.length > 0) {
            const kwList = document.createElement('ul'); kwList.style.listStyle = 'disc'; kwList.style.marginLeft = '20px';
            metadata.keywords.forEach(kw => { const li = document.createElement('li'); li.textContent = escapeHtml(kw); kwList.appendChild(li); });
            kwDiv.appendChild(kwList);
        } else {
             const valueSpan = document.createElement('span'); valueSpan.textContent = ' (inga angivna)'; valueSpan.style.fontStyle = 'italic'; kwDiv.appendChild(valueSpan);
        }
        dynamicContentArea.appendChild(kwDiv);
    }

    // Handle Content Types as a bulleted list *** SHOWING TEXT ONLY ***
    if (Array.isArray(metadata.contentTypes)) {
        itemCount++;
        const ctDiv = document.createElement('div'); ctDiv.classList.add('metadata-item');
        const ctHeading = document.createElement('strong'); ctHeading.textContent = 'Innehållstyper:'; ctHeading.style.display = 'block'; ctDiv.appendChild(ctHeading);
        if (metadata.contentTypes.length > 0) {
            const ctList = document.createElement('ul'); ctList.style.listStyle = 'disc'; ctList.style.marginLeft = '20px';
            metadata.contentTypes.forEach(ct => {
                const li = document.createElement('li');
                const text = getVal(ct, 'text', ''); // Get the text property
                li.textContent = escapeHtml(text); // Display only the text
                ctList.appendChild(li);
            });
            ctDiv.appendChild(ctList);
        } else {
            const valueSpan = document.createElement('span'); valueSpan.textContent = ' (inga angivna)'; valueSpan.style.fontStyle = 'italic'; ctDiv.appendChild(valueSpan);
        }
        dynamicContentArea.appendChild(ctDiv);
    }

    console.log(`Visade ${itemCount} metadata-objekt.`);
}

/**
 * Skapar ett HTML-element (p) för att visa en undernyckel i metadata.
 * (Ingen ändring behövs här)
 */
function createMetadataSubItem(subKey, subValue, linkText = subValue) {
    const p = document.createElement('p');
    p.classList.add('metadata-sub-item');

    const strong = document.createElement('strong');
    const readableSubKey = subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    strong.textContent = `${escapeHtml(readableSubKey)}:`;
    p.appendChild(strong);
    p.appendChild(document.createTextNode(' ')); // Add space after the key

    const valueStr = String(subValue); // Ensure value is a string for checks

    // Special rendering for email and URL
    if (subKey === 'contactPoint' && isValidEmail(valueStr)) {
        const a = document.createElement('a');
        a.href = `mailto:${valueStr}`;
        a.textContent = escapeHtml(valueStr);
        p.appendChild(a);
    } else if (subKey === 'url' && valueStr.trim() !== '') {
         try {
            const urlObj = new URL(valueStr); // Validate URL
            const a = document.createElement('a');
            a.href = urlObj.href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
             // Use linkText if provided and not empty, otherwise use the URL itself
            a.textContent = escapeHtml(String(linkText).trim() !== '' ? linkText : valueStr);
            p.appendChild(a);
         } catch (e) {
             console.warn(`Ogiltig URL i metadata sub-item: ${valueStr}`);
             const textNode = document.createTextNode(escapeHtml(valueStr));
             p.appendChild(textNode);
         }
    } else {
        // Default: display value as text
        const textNode = document.createTextNode(escapeHtml(valueStr));
        p.appendChild(textNode);
    }

    return p;
}


/**
 * Renderar ett formulär för att redigera metadata.
 * *** UPPDATERAD: Hjälptexter flyttade, textareor är 10 rader. ***
 * (Inga andra logiska ändringar här)
 */
export function renderMetadataForm() {
    if (!state.jsonData?.metadata) {
        showError("Metadata saknas eller kunde inte laddas för redigering."); return;
    }
    setupContentArea(true, false);
    if (!dynamicContentArea) return;
    dynamicContentArea.classList.add('form-view');

    const form = document.createElement('form');
    form.id = 'metadataForm'; form.noValidate = true;
    form.addEventListener('submit', saveMetadata);

    const heading = document.createElement('h2');
    heading.textContent = 'Redigera Metadata';
    form.appendChild(heading);

    const metadata = state.jsonData.metadata;

    // 1. Monitoring Type (Dropdown)
    const monitoringTypeContainer = createFormField('Typ av tillsyn*', 'monitoringType', '', 'select');
    const monitoringTypeSelect = document.createElement('select');
    const monitoringTypeId = monitoringTypeContainer.querySelector('label')?.htmlFor || 'monitoringTypeSelect';
    monitoringTypeSelect.id = monitoringTypeId; monitoringTypeSelect.name = 'monitoringType'; monitoringTypeSelect.required = true;
    MONITORING_TYPES.forEach(opt => { const option = document.createElement('option'); option.value = opt.type; option.textContent = opt.text; if (metadata.monitoringType?.type === opt.type) option.selected = true; monitoringTypeSelect.appendChild(option); });
    // Default to 'web' if type is missing and 'web' exists
    if (!metadata.monitoringType?.type && MONITORING_TYPES.some(t => t.type === 'web')) monitoringTypeSelect.value = 'web';
    monitoringTypeContainer.appendChild(monitoringTypeSelect);
    form.appendChild(monitoringTypeContainer);

    // 2. Other Metadata Fields
    for (const key in metadata) {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) {
            // Skip keys handled elsewhere (version/dates are read-only, contentTypes/monitoringType handled specially)
            if (['version', 'dateCreated', 'dateModified', 'contentTypes', 'monitoringType'].includes(key)) continue;

            const value = metadata[key];
            let fieldContainer;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Nested Objects (Publisher, Source)
                fieldContainer = document.createElement('div'); // Container for the fieldset
                const fieldset = document.createElement('fieldset');
                const legend = document.createElement('legend');
                legend.textContent = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                fieldset.appendChild(legend);

                for (const subKey in value) {
                    if (Object.prototype.hasOwnProperty.call(value, subKey)) {
                        const subValue = value[subKey];
                        const readableSubKey = subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        const inputType = (subKey === 'contactPoint') ? 'email'
                                        : (subKey === 'url') ? 'url'
                                        : (['retrievedDate', 'validFrom', 'validTo'].includes(subKey)) ? 'date'
                                        : 'text';
                        const placeholder = (inputType === 'url') ? 'https://exempel.com' : '';
                         // Pass null for instruction text here, handled by createFormField structure
                        fieldset.appendChild(createFormField(readableSubKey, `${key}.${subKey}`, subValue, inputType, placeholder, false, null));
                    }
                }
                fieldContainer.appendChild(fieldset);

            } else if (key === 'language') {
                // Language Field with Datalist
                 fieldContainer = createFormField(
                    'Språk*',
                    'language',
                    value,
                    'text',
                    't.ex. sv', // Placeholder
                    false,      // readonly
                    'Ange språkkod (ISO 639-1, t.ex. sv, en) eller välj från listan.' // Instruction text
                );
                 const input = fieldContainer.querySelector('input');
                 if (input) {
                    input.setAttribute('list', 'language-list');
                    input.required = true;
                    const datalist = document.createElement('datalist');
                    datalist.id = 'language-list';
                    // Add current value if not in common list
                    if (!commonLanguages[value] && value) {
                         const currentOpt = document.createElement('option');
                         currentOpt.value = value;
                         currentOpt.textContent = `${value.toUpperCase()} (Nuvarande)`;
                         datalist.appendChild(currentOpt);
                    }
                    // Add common languages
                    for (const code in commonLanguages) {
                         if (Object.prototype.hasOwnProperty.call(commonLanguages, code)) {
                             const opt = document.createElement('option');
                             opt.value = code;
                             opt.textContent = `${commonLanguages[code]} (${code})`;
                             datalist.appendChild(opt);
                         }
                    }
                     fieldContainer.appendChild(datalist); // Append datalist within the container
                 }

            } else if (key === 'keywords') {
                // Keywords Textarea
                fieldContainer = createFormField(
                    'Nyckelord',
                    'keywords',
                    Array.isArray(value) ? value.join('\n') : '', // Join array values with newline
                    'textarea',
                    '',         // Placeholder
                    false,      // readonly
                    'Ange ett nyckelord per rad.' // Instruction text
                );
                 const textarea = fieldContainer.querySelector('textarea');
                 if(textarea) textarea.rows = 10; // Set height

            } else {
                // Standard Text/Textarea Fields (Title, Description, License etc.)
                const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const isRequired = ['title'].includes(key); // Add other required keys here if needed
                const labelText = readableKey + (isRequired ? '*' : '');
                const fieldType = (key === 'description') ? 'textarea' : 'text'; // Example: use textarea for description
                // Pass null for instruction text, none needed for these simple fields usually
                 fieldContainer = createFormField(labelText, key, value, fieldType, '', false, null);
                 if (isRequired && fieldContainer.querySelector('input, textarea')) {
                     fieldContainer.querySelector('input, textarea').required = true;
                 }
                 // Set specific rows for description textarea
                 if (fieldType === 'textarea') {
                     const textarea = fieldContainer.querySelector('textarea');
                     if (textarea) textarea.rows = (key === 'description') ? 5 : 3; // Adjust rows
                 }
            }
            form.appendChild(fieldContainer);
        }
    }

    // 3. ContentTypes (as textarea) *** Height and instruction added ***
    const ctValue = Array.isArray(metadata.contentTypes)
        ? metadata.contentTypes.map(ct => ct.text).join('\n') // Join only text values
        : '';
    const ctContainer = createFormField(
        'Innehållstyper (Content Types)',
        'contentTypes',
        ctValue,
        'textarea',
        '',         // Placeholder
        false,      // readonly
        'Ange en innehållstyp per rad (t.ex. Webbsida). ID genereras automatiskt.' // Instruction text
    );
    const ctTextarea = ctContainer.querySelector('textarea');
    if (ctTextarea) ctTextarea.rows = 10; // Set height
    form.appendChild(ctContainer);

    // 4. Buttons (Save, Cancel)
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.save}</span> Spara ändringar`;
    buttonDiv.appendChild(saveBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.cancel}</span> Avbryt`;
    cancelBtn.addEventListener('click', () => displayMetadata()); // Go back to display view
    buttonDiv.appendChild(cancelBtn);
    form.appendChild(buttonDiv);

    dynamicContentArea.appendChild(form);
} // End renderMetadataForm


/**
 * Sparar ändringarna från metadata-formuläret till state.jsonData.
 * *** UPPDATERAD: Läser keywords och contentTypes rad för rad från textarea. ***
 * *** UPPDATERAD: Synkroniserar ändringar i contentTypes till alla requirements. ***
 */
function saveMetadata(event) {
    event.preventDefault();
    const form = event.target;
    if (!form) { console.error("Sparafunktion anropad utan formulär!"); return; }
    if (!state.jsonData?.metadata) { console.error("Ingen metadata att spara till i state!"); showError("Internt fel: Kunde inte hitta metadata att spara.", dynamicContentArea); return; }

    // --- Store original data for comparison and sync ---
    const originalMetadata = JSON.parse(JSON.stringify(state.jsonData.metadata));
    const originalContentTypes = originalMetadata.contentTypes || []; // Array of {id, text}

    const formData = new FormData(form);
    let metadataChanged = false; // Flag for general metadata changes
    const updatedMetadata = JSON.parse(JSON.stringify(originalMetadata)); // Start with a copy

    // Hämta vanliga fält (exkl. keywords, contentTypes, version, dates, monitoringType)
    for (const key in updatedMetadata) {
        if (Object.prototype.hasOwnProperty.call(updatedMetadata, key)) {
            // Skip fields handled separately or read-only fields
            if (['version', 'dateCreated', 'dateModified', 'contentTypes', 'monitoringType', 'keywords'].includes(key)) continue;

            if (typeof updatedMetadata[key] === 'object' && !Array.isArray(updatedMetadata[key]) && updatedMetadata[key] !== null) {
                // Handle nested objects (publisher, source)
                for (const subKey in updatedMetadata[key]) {
                    if (Object.prototype.hasOwnProperty.call(updatedMetadata[key], subKey)) {
                        const formName = `${key}.${subKey}`;
                        if (formData.has(formName)) {
                            const newValue = formData.get(formName).trim();
                            if (updatedMetadata[key][subKey] !== newValue) {
                                updatedMetadata[key][subKey] = newValue;
                                metadataChanged = true; // Mark as changed
                            }
                        }
                    }
                }
            } else {
                // Handle simple fields
                if (formData.has(key)) {
                    const newValue = formData.get(key).trim();
                    if (updatedMetadata[key] !== newValue) {
                        updatedMetadata[key] = newValue;
                        metadataChanged = true; // Mark as changed
                    }
                }
            }
        }
    }

    // Uppdatera monitoringType
    const selectedMonitoringTypeKey = formData.get('monitoringType');
    const selectedMonitoringTypeObject = MONITORING_TYPES.find(opt => opt.type === selectedMonitoringTypeKey);
    if (selectedMonitoringTypeObject && JSON.stringify(updatedMetadata.monitoringType) !== JSON.stringify(selectedMonitoringTypeObject)) {
        updatedMetadata.monitoringType = { ...selectedMonitoringTypeObject };
        metadataChanged = true;
    }

    // Uppdatera keywords (läs rad för rad)
    const keywordsString = formData.get('keywords') || '';
    const newKeywords = keywordsString.split(/\r?\n/).map(k => k.trim()).filter(Boolean); // Split by newline, trim, remove empty
    if (JSON.stringify(updatedMetadata.keywords || []) !== JSON.stringify(newKeywords)) {
        updatedMetadata.keywords = newKeywords;
        metadataChanged = true;
    }

    // --- Process and Update ContentTypes ---
    const contentTypesString = formData.get('contentTypes') || '';
    const contentTypeTexts = contentTypesString.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
    const newContentTypes = []; // Will hold the final {id, text} objects
    const seenIds = new Set();
    const newIdMap = new Map(); // To map new text -> new id (for sync)
    contentTypeTexts.forEach(text => {
        const id = generateKeyFromName(text);
        if (id && !seenIds.has(id)) {
            const newContentType = { id: id, text: text };
            newContentTypes.push(newContentType);
            seenIds.add(id);
            newIdMap.set(text, id); // Store text -> id mapping for sync later
        } else if (id && seenIds.has(id)) {
            console.warn(`Dubblett av Content Type ID ("${id}") för "${text}", skippar.`);
        } else {
            console.warn(`Kunde inte generera ID för Content Type "${text}", skippar.`);
        }
    });
    // Sort the final list alphabetically by text
    newContentTypes.sort((a, b) => a.text.localeCompare(b.text, 'sv'));

    // Check if the contentTypes array itself has changed
    let contentTypesChanged = JSON.stringify(originalContentTypes) !== JSON.stringify(newContentTypes);
    if (contentTypesChanged) {
        updatedMetadata.contentTypes = newContentTypes;
        metadataChanged = true; // Mark metadata as changed if content types changed
    }

    // --- Sync Content Type Changes to Requirements (only if metadata actually changed) ---
    let requirementsUpdated = false;
    if (metadataChanged && contentTypesChanged && state.jsonData.requirements) {
        console.log("Innehållstyper i metadata ändrades, synkroniserar till krav...");

        // Create maps for efficient lookup
        const originalIdToTextMap = new Map(originalContentTypes.map(ct => [ct.id, ct.text]));
        const newIdSet = new Set(newContentTypes.map(ct => ct.id)); // Set of IDs in the new list

        // 1. Identify removed IDs: IDs present in original but not in new
        const removedIds = originalContentTypes
            .filter(oldCt => !newIdSet.has(oldCt.id))
            .map(ct => ct.id);
        if (removedIds.length > 0) console.log("Innehållstyper att ta bort från krav:", removedIds);

        // 2. Identify changed IDs (due to text edit resulting in a new ID for the same concept)
        // This maps an OLD ID to a NEW ID if the TEXT associated with the OLD ID
        // now generates a different NEW ID in the updated list.
        const idUpdateMap = new Map(); // Map oldId -> newId
        originalContentTypes.forEach(oldCt => {
            // Find the new ID generated for the text that the *old* ID represented
            const newIdForOldText = newIdMap.get(oldCt.text);
            // If that text still exists BUT generates a *different* ID now...
            if (newIdForOldText && newIdForOldText !== oldCt.id) {
                 // ...map the old ID to the new ID.
                idUpdateMap.set(oldCt.id, newIdForOldText);
            }
            // Note: If the text itself was significantly changed, it's treated as a removal
            // of the old and addition of the new, handled by steps 1 and 3.
        });
        if (idUpdateMap.size > 0) console.log("Uppdateringar av innehållstyp-ID (gammalt -> nytt):", idUpdateMap);


        // 3. Iterate through requirements and update their contentType array
        for (const reqKey in state.jsonData.requirements) {
            if (Object.hasOwnProperty.call(state.jsonData.requirements, reqKey)) {
                const req = state.jsonData.requirements[reqKey];
                const currentReqTypes = req.contentType || []; // Existing IDs in the requirement
                let reqTypesChanged = false;

                // Apply removals: filter out IDs that are no longer in the master list
                let typesAfterUpdate = currentReqTypes
                    .filter(id => !removedIds.includes(id)) // Remove deleted IDs
                    .map(id => idUpdateMap.get(id) || id); // Update IDs that changed due to text edit

                // Ensure uniqueness after potential mapping collisions
                const uniqueFinalTypes = [...new Set(typesAfterUpdate)];

                // Check if the final array is different from the original
                if (JSON.stringify(currentReqTypes) !== JSON.stringify(uniqueFinalTypes)) {
                    req.contentType = uniqueFinalTypes;
                    requirementsUpdated = true; // Flag that at least one requirement was updated
                    // console.log(`Requirement ${reqKey} contentType updated to:`, req.contentType);
                }
            }
        }
         if (requirementsUpdated) console.log("Synkronisering av innehållstyper till krav slutförd.");
         else console.log("Inga krav behövde uppdateras p.g.a ändrade innehållstyper.")
    }

    // --- Finalize UI Update ---
    if (metadataChanged) {
        state.jsonData.metadata = updatedMetadata; // Update the state
        state.setState('isDataModified', true); // Mark data as modified
        if (saveChangesButton) saveChangesButton.classList.remove('hidden'); // Show save button

        displayMetadata(); // Re-render the metadata display view

        // Display confirmation message
        const targetArea = document.getElementById('dynamicContentArea');
        if (targetArea) {
            let confMessage = 'Metadata uppdaterad!';
            if (requirementsUpdated) {
                confMessage += ' Ändringar i innehållstyper har synkroniserats till kraven.';
            }
             confMessage += ' Glöm inte att spara ner filen.';
            displayConfirmation(confMessage, 'save', targetArea);
        }
        console.log("Metadata ändrades och state uppdaterades.");
    } else {
        displayMetadata(); // Still redisplay to go back from form view even if no changes
        console.log("Inga ändringar i metadata upptäcktes.");
    }
} // Slut på saveMetadata

console.log("Module loaded: metadata_functions");