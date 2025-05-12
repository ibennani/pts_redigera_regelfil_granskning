// js/_-----_metadata_functions.js

// Importer
import { dynamicContentArea, saveChangesButton } from './_-----_dom_element_references.js';
import { MONITORING_TYPES, ICONS, commonLanguages } from './_-----_constants.js';
import * as state from './_-----_global_state.js';
import { escapeHtml, getVal, isValidEmail, generateKeyFromName } from './_-----_utils__helpers.js';
import { setupContentArea, showError, displayConfirmation } from './_-----_ui_functions.js';
// Importera den uppdaterade createFormField från krav-modulen
import { createFormField } from './_---_requirement_functions.js';


// Updated displayMetadata: Removed URL param check, added monitoringType display
// UPPDATERAD:
// - `monitoringType` visas först.
// - `pageTypes` visas som en punktlista.
// - `keywords` visas sist.
export function displayMetadata() { // Hela funktionen från ursprunglig script.js (ca rad 300-395) anpassad
    console.log("Visar metadata (modul)...");
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

    const actionContainer = document.createElement('div');
    actionContainer.className = 'action-button-container';
    const editButton = document.createElement('button');
    editButton.id = 'editMetadataButton';
    editButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.edit}</span> Redigera metadata`;
    editButton.addEventListener('click', renderMetadataForm);
    actionContainer.appendChild(editButton);
    dynamicContentArea.insertBefore(actionContainer, heading);

    let itemCount = 0;

    // 1. Visa 'monitoringType' (Typ av tillsyn) först
    if (Object.prototype.hasOwnProperty.call(metadata, 'monitoringType')) {
        itemCount++;
        const key = 'monitoringType';
        const value = metadata[key];
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('metadata-item');
        const keyStrong = document.createElement('strong');
        keyStrong.textContent = 'Typ av tillsyn:'; // Custom label
        itemDiv.appendChild(keyStrong);
        const valueSpan = document.createElement('span');
        // Använd getVal för säker åtkomst till nästlade egenskaper
        valueSpan.textContent = ` ${escapeHtml(getVal(value, 'text', getVal(value, 'type', '(okänd)')))}`;
        itemDiv.appendChild(valueSpan);
        dynamicContentArea.appendChild(itemDiv);
    }

    // 2. Loopa genom övriga metadata-nycklar som inte är specialhanterade
    const specialHandlingKeys = ['contentTypes', 'keywords', 'pageTypes', 'monitoringType'];
    for (const key in metadata) {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) {
            if (specialHandlingKeys.includes(key)) continue; // Hoppa över de som hanteras separat

            itemCount++;
            try {
                const value = metadata[key];
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('metadata-item');

                const keyStrong = document.createElement('strong');
                const readableKey = key.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1").replace(/^./, function(str){ return str.toUpperCase(); });
                keyStrong.textContent = `${readableKey}:`;


                if (key === 'publisher' && typeof value === 'object' && value !== null) {
                    keyStrong.style.display = 'block';
                    itemDiv.appendChild(keyStrong);
                    const subList = document.createElement('div');
                    subList.style.marginLeft = '20px';
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
                     const titleText = value.title; // Byt namn för att undvika konflikt med HTML title
                     let urlDisplayed = false;
                    if (url && String(url).trim() !== '') {
                        const linkText = (titleText && String(titleText).trim() !== '') ? titleText : url;
                         subList.appendChild(createMetadataSubItem('url', url, linkText));
                         urlDisplayed = true;
                    }
                    for (const subKey in value) {
                         if (Object.prototype.hasOwnProperty.call(value, subKey)) {
                            if ((subKey === 'url' && urlDisplayed) || (subKey === 'title' && urlDisplayed && titleText && url)) continue;
                            subList.appendChild(createMetadataSubItem(subKey, value[subKey]));
                        }
                    }
                    itemDiv.appendChild(subList);
                } else if (key === 'language') { // Speciell hantering för språk
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    const langName = commonLanguages[value] || value.toUpperCase(); // Hämta fullständigt namn eller använd kod
                    valueSpan.textContent = ` ${escapeHtml(langName)} (${escapeHtml(value)})`;
                    itemDiv.appendChild(valueSpan);
                } else if (Array.isArray(value)) { // Generisk hantering för andra arrayer
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${value.map(v => escapeHtml(String(v))).join(', ')}`;
                    itemDiv.appendChild(valueSpan);
                } else { // Standardhantering för strängar, nummer etc.
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${escapeHtml(String(value))}`; // Konvertera value till sträng för säkerhets skull
                    itemDiv.appendChild(valueSpan);
                }
                dynamicContentArea.appendChild(itemDiv);
            } catch (error) {
                console.error(`Fel vid visning av metadata-nyckel "${key}":`, error);
                const errorDiv = document.createElement('div');
                errorDiv.textContent = `Fel vid visning av nyckel: ${key}`;
                errorDiv.style.color = 'red';
                dynamicContentArea.appendChild(errorDiv);
            }
        }
    }

    // 3. Visa 'pageTypes' som en punktlista
    if (Object.prototype.hasOwnProperty.call(metadata, 'pageTypes')) {
        itemCount++;
        const ptDiv = document.createElement('div'); ptDiv.classList.add('metadata-item');
        const ptHeading = document.createElement('strong'); ptHeading.textContent = 'Page Types:'; ptHeading.style.display = 'block'; ptDiv.appendChild(ptHeading);
        const pageTypesValue = metadata.pageTypes;
        if (typeof pageTypesValue === 'string' && pageTypesValue.trim() !== '') {
            const pageTypesArray = pageTypesValue.split(',').map(pt => pt.trim()).filter(Boolean);
            if (pageTypesArray.length > 0) {
                const ptList = document.createElement('ul'); ptList.style.listStyle = 'disc'; ptList.style.marginLeft = '20px';
                pageTypesArray.forEach(pt => { const li = document.createElement('li'); li.textContent = escapeHtml(pt); ptList.appendChild(li); });
                ptDiv.appendChild(ptList);
            } else {
                const valueSpan = document.createElement('span'); valueSpan.textContent = ' (inga angivna)'; valueSpan.style.fontStyle = 'italic'; ptDiv.appendChild(valueSpan);
            }
        } else {
            const valueSpan = document.createElement('span'); valueSpan.textContent = ' (inga angivna)'; valueSpan.style.fontStyle = 'italic'; ptDiv.appendChild(valueSpan);
        }
        dynamicContentArea.appendChild(ptDiv);
    }

    // 4. Hantera 'contentTypes' specifikt (som lista av texter)
    if (Array.isArray(metadata.contentTypes)) {
        itemCount++;
        const ctDiv = document.createElement('div');
        ctDiv.classList.add('metadata-item');
        const ctHeading = document.createElement('strong');
        ctHeading.textContent = 'Innehållstyper:'; // Mer användarvänligt
        ctHeading.style.display = 'block';
        ctDiv.appendChild(ctHeading);
        if (metadata.contentTypes.length > 0) {
            const ctList = document.createElement('ul');
            ctList.style.listStyle = 'disc'; // Använd punktlista
            ctList.style.marginLeft = '20px'; // Indrag
            metadata.contentTypes.forEach(ct => {
                const li = document.createElement('li');
                // Antag att ct är ett objekt med en 'text'-egenskap
                li.textContent = escapeHtml(getVal(ct, 'text', getVal(ct, 'id', 'Okänd typ')));
                ctList.appendChild(li);
            });
            ctDiv.appendChild(ctList);
        } else {
             const valueSpan = document.createElement('span'); valueSpan.textContent = ' (inga angivna)'; valueSpan.style.fontStyle = 'italic'; ctDiv.appendChild(valueSpan);
        }
        dynamicContentArea.appendChild(ctDiv);
    }

    // 5. Hantera 'keywords' specifikt (som punktlista, visas sist)
    if (Array.isArray(metadata.keywords)) {
        itemCount++;
        const kwDiv = document.createElement('div');
        kwDiv.classList.add('metadata-item');
        const kwHeading = document.createElement('strong');
        kwHeading.textContent = 'Nyckelord:';
        kwHeading.style.display = 'block';
        kwDiv.appendChild(kwHeading);
        if (metadata.keywords.length > 0) {
            const kwList = document.createElement('ul');
            kwList.style.listStyle = 'disc'; // Använd punktlista
            kwList.style.marginLeft = '20px'; // Indrag
            metadata.keywords.forEach(kw => {
                const li = document.createElement('li');
                li.textContent = escapeHtml(kw);
                kwList.appendChild(li);
            });
            kwDiv.appendChild(kwList);
        } else {
            const valueSpan = document.createElement('span'); valueSpan.textContent = ' (inga angivna)'; valueSpan.style.fontStyle = 'italic'; kwDiv.appendChild(valueSpan);
        }
        dynamicContentArea.appendChild(kwDiv);
    }

    console.log(`Visade ${itemCount} metadata-objekt.`);
}


function createMetadataSubItem(subKey, subValue, linkText = subValue) { // Hela från script.js (ca rad 397-419)
    const p = document.createElement('p');
    p.classList.add('metadata-sub-item');
    const s = document.createElement('strong');
    s.textContent = `${escapeHtml(subKey)}:`;
    p.appendChild(s);
    p.appendChild(document.createTextNode(' '));

    if (subKey === 'contactPoint' && isValidEmail(subValue)) {
        const a = document.createElement('a');
        a.href = `mailto:${subValue}`;
        a.textContent = escapeHtml(subValue);
        p.appendChild(a);
    } else if (subKey === 'url' && subValue && subValue.trim() !== '') {
         const a = document.createElement('a');
         a.href = subValue;
         a.target = '_blank';
         a.rel = 'noopener noreferrer';
         a.textContent = escapeHtml(linkText && linkText !== subValue ? linkText : subValue);
         p.appendChild(a);
    } else {
        const t = document.createTextNode(escapeHtml(subValue));
        p.appendChild(t);
    }
    return p;
}

// Updated renderMetadataForm: Added monitoringType dropdown
// UPPDATERAD:
// - `pageTypes` renderas som en textarea.
// - `keywords` fältet renderas sist bland datafälten.
export function renderMetadataForm() { // Hela från script.js (ca rad 422-552) anpassad
    if (!state.jsonData || !state.jsonData.metadata) {
        showError("Metadata saknas eller kunde inte laddas.");
        return;
    }

    setupContentArea(true, false); // False för showFilterSort
    const targetArea = document.getElementById('dynamicContentArea');
    if (!targetArea) { return; }
    targetArea.classList.add('form-view');

    const form = document.createElement('form');
    form.id = 'metadataForm';
    form.noValidate = true;
    form.addEventListener('submit', saveMetadata);

    const heading = document.createElement('h2');
    heading.textContent = 'Redigera Metadata';
    form.appendChild(heading);

    const metadata = state.jsonData.metadata;
    const explicitHandledKeys = ['version', 'dateCreated', 'dateModified', 'contentTypes', 'monitoringType', 'keywords', 'pageTypes'];


    // 1. Monitoring Type (Dropdown) - visas alltid först
    const monitoringTypeContainer = createFormField('Typ av tillsyn*', 'monitoringType', '', 'select');
    const monitoringTypeSelect = document.createElement('select');
    const monitoringTypeId = monitoringTypeContainer.querySelector('label')?.htmlFor || 'monitoringTypeSelect';
    monitoringTypeSelect.id = monitoringTypeId;
    monitoringTypeSelect.name = 'monitoringType';
    monitoringTypeSelect.required = true;

    MONITORING_TYPES.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.type;
        option.textContent = opt.text;
        if (metadata.monitoringType && metadata.monitoringType.type === opt.type) {
            option.selected = true;
        }
        monitoringTypeSelect.appendChild(option);
    });
    if (!metadata.monitoringType?.type && MONITORING_TYPES.some(t => t.type === 'web')) {
         monitoringTypeSelect.value = 'web';
    }
    monitoringTypeContainer.appendChild(monitoringTypeSelect);
    form.appendChild(monitoringTypeContainer);

    // 2. Other Metadata Fields (via loop för de som inte hanteras explicit)
    for (const key in metadata) {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) {
            if (explicitHandledKeys.includes(key)) continue;

            const value = metadata[key];
            let fieldContainer;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                fieldContainer = document.createElement('div');
                const fieldset = document.createElement('fieldset');
                const legend = document.createElement('legend');
                legend.textContent = key.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1").replace(/^./, function(str){ return str.toUpperCase(); });
                fieldset.appendChild(legend);

                for (const subKey in value) {
                    if (value.hasOwnProperty(subKey)) {
                        const subValue = value[subKey];
                        const readableSubKey = subKey.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1").replace(/^./, function(str){ return str.toUpperCase(); });
                         const inputType = (subKey === 'contactPoint') ? 'email'
                                         : (subKey === 'url') ? 'url'
                                         : (['retrievedDate'].includes(subKey)) ? 'date'
                                         : 'text';
                        const placeholder = (inputType === 'url') ? 'https://exempel.com' : '';
                        fieldset.appendChild(createFormField(readableSubKey, `${key}.${subKey}`, subValue, inputType, placeholder, false, null));
                    }
                }
                fieldContainer.appendChild(fieldset);
            } else if (key === 'language') {
                 fieldContainer = createFormField('Språk*', 'language', value, 'text', 't.ex. sv', false, 'Ange språkkod (ISO 639-1, t.ex. sv, en) eller välj från listan.');
                 const input = fieldContainer.querySelector('input');
                 if (input) {
                    input.setAttribute('list', 'language-list');
                    input.required = true;
                    const datalist = document.createElement('datalist');
                    datalist.id = 'language-list';
                    if (!commonLanguages[value] && value) {
                         const opt = document.createElement('option');
                         opt.value = value;
                         opt.textContent = `${commonLanguages[value] || value.toUpperCase()} (Nuvarande)`;
                         datalist.appendChild(opt);
                    }
                    for (const code in commonLanguages) {
                         if (commonLanguages.hasOwnProperty(code)) {
                              const opt = document.createElement('option');
                              opt.value = code;
                              opt.textContent = `${commonLanguages[code]} (${code})`;
                              datalist.appendChild(opt);
                         }
                    }
                    fieldContainer.appendChild(datalist);
                 }
            } else {
                const readableKey = key.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1").replace(/^./, function(str){ return str.toUpperCase(); });
                const isRequired = ['title'].includes(key);
                const labelText = readableKey + (isRequired ? '*' : '');
                const fieldType = (key === 'description') ? 'textarea' : 'text';
                fieldContainer = createFormField(labelText, key, value, fieldType, '', false, null);
                if (isRequired && fieldContainer.querySelector('input, textarea')) {
                     fieldContainer.querySelector('input, textarea').required = true;
                }
                if (fieldType === 'textarea') {
                     const textarea = fieldContainer.querySelector('textarea');
                     if (textarea) textarea.rows = (key === 'description') ? 5 : 3;
                }
            }
            form.appendChild(fieldContainer);
        }
    }

    // 3. PageTypes (as textarea)
    const pageTypesValue = typeof metadata.pageTypes === 'string' ? metadata.pageTypes.split(',').map(pt => pt.trim()).filter(Boolean).join('\n') : '';
    const ptContainer = createFormField('Page Types', 'pageTypes', pageTypesValue, 'textarea', '', false, 'Ange en sidtyp per rad.');
    const ptTextarea = ptContainer.querySelector('textarea');
    if (ptTextarea) ptTextarea.rows = 10;
    form.appendChild(ptContainer);

     // 4. ContentTypes (as textarea)
     const ctValue = Array.isArray(metadata.contentTypes) ? metadata.contentTypes.map(ct => ct.text).join('\n') : '';
     const ctContainer = createFormField('Innehållstyper (Content Types)', 'contentTypes', ctValue, 'textarea', '', false, 'Ange en innehållstyp per rad (t.ex. Webbsida). ID genereras automatiskt.');
     const ctTextarea = ctContainer.querySelector('textarea');
     if (ctTextarea) ctTextarea.rows = 10;
     form.appendChild(ctContainer);

    // 5. Keywords (as textarea, visas sist av dessa editerbara fält)
    const keywordsValue = Array.isArray(metadata.keywords) ? metadata.keywords.join('\n') : '';
    const kwContainer = createFormField('Nyckelord', 'keywords', keywordsValue, 'textarea', '', false, 'Ange ett nyckelord per rad.');
    const kwTextarea = kwContainer.querySelector('textarea');
    if(kwTextarea) kwTextarea.rows = 10;
    form.appendChild(kwContainer);


    // 6. Buttons (Save, Cancel)
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.save}</span> Spara ändringar`;
    buttonDiv.appendChild(saveBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.cancel}</span> Avbryt`;
    cancelBtn.addEventListener('click', () => displayMetadata()); // Gå tillbaka till displayMetadata
    buttonDiv.appendChild(cancelBtn);
    form.appendChild(buttonDiv);

    targetArea.appendChild(form);
} // Slut på renderMetadataForm


// Updated saveMetadata: Handles monitoringType, calls displayMetadata directly
// UPPDATERAD:
// - `pageTypes` sparas från textarea (rader) till komma-separerad sträng, bevarar ordning.
// - `contentTypes` sparas i den ordning de anges i textarean (ingen alfabetisk sortering).
// - `keywords` sparas i den ordning de anges i textarean.
export function saveMetadata(event) { // Hela från script.js (ca rad 555-651) anpassad
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    let changed = false;

    if (!state.jsonData || !state.jsonData.metadata) return;

    const originalMetadata = JSON.parse(JSON.stringify(state.jsonData.metadata)); // För att jämföra
    const originalContentTypes = originalMetadata.contentTypes || [];
    const updatedMetadata = JSON.parse(JSON.stringify(originalMetadata)); // Skapa en kopia att uppdatera

    // Uppdatera monitoringType
    const selectedMonitoringType = formData.get('monitoringType');
    const monitoringTypeObject = MONITORING_TYPES.find(opt => opt.type === selectedMonitoringType) || MONITORING_TYPES[0];
    if (JSON.stringify(updatedMetadata.monitoringType) !== JSON.stringify(monitoringTypeObject)) {
        updatedMetadata.monitoringType = monitoringTypeObject;
        changed = true;
    }

    // Nycklar som hanteras explicit (inte i loopen nedan)
    const explicitHandledKeys = ['version', 'dateCreated', 'dateModified', 'contentTypes', 'monitoringType', 'keywords', 'pageTypes'];

    // Uppdatera övriga värden
    for (const key in updatedMetadata) {
        if (updatedMetadata.hasOwnProperty(key)) {
            if (explicitHandledKeys.includes(key)) continue;

            if (typeof updatedMetadata[key] === 'object' && !Array.isArray(updatedMetadata[key]) && updatedMetadata[key] !== null) {
                for (const subKey in updatedMetadata[key]) {
                    if (updatedMetadata[key].hasOwnProperty(subKey)) {
                        const formName = `${key}.${subKey}`;
                        if (formData.has(formName)) {
                            let newValue = formData.get(formName).trim();
                            if (updatedMetadata[key][subKey] !== newValue) {
                                updatedMetadata[key][subKey] = newValue;
                                changed = true;
                            }
                        }
                    }
                }
            } else {
                if (formData.has(key)) {
                    const newValue = formData.get(key).trim();
                     if (updatedMetadata[key] !== newValue) {
                        updatedMetadata[key] = newValue;
                        changed = true;
                     }
                }
            }
        }
    }

    // Hantera pageTypes (från textarea med rader till komma-separerad sträng, bevarar ordning)
    const pageTypesStringRaw = formData.get('pageTypes') || '';
    const newPageTypesArray = pageTypesStringRaw.split(/\r?\n/).map(pt => pt.trim()).filter(Boolean);
    const newPageTypesString = newPageTypesArray.join(','); // Behåller ordningen från textarean
    if ((updatedMetadata.pageTypes || '') !== newPageTypesString) {
        updatedMetadata.pageTypes = newPageTypesString;
        changed = true;
    }

    // Hantera keywords (från textarea till array, bevarar ordning)
    const keywordsString = formData.get('keywords') || '';
    const newKeywords = keywordsString.split(/\r?\n/).map(k => k.trim()).filter(Boolean); // Bevarar ordningen
    if (JSON.stringify(updatedMetadata.keywords || []) !== JSON.stringify(newKeywords)) {
        updatedMetadata.keywords = newKeywords;
        changed = true;
    }

    // Hantera contentTypes (från textarea till array av objekt, bevarar ordning)
    const contentTypesString = formData.get('contentTypes') || '';
    const contentTypeTexts = contentTypesString.split(/\r?\n/).map(t => t.trim()).filter(Boolean); // Bevarar ordningen
    const newContentTypes = [];
    const seenIds = new Set();
    const newIdMap = new Map(); // För synkronisering
    contentTypeTexts.forEach(text => { // Loopar i den ordning de skrevs
        const id = generateKeyFromName(text);
        if (id && !seenIds.has(id)) {
            newContentTypes.push({ id: id, text: text });
            seenIds.add(id);
            newIdMap.set(text, id); // För synkning
        } else if (id && seenIds.has(id)) {
            console.warn(`Duplicate content type ID generated for "${text}", skipping.`);
        } else {
            console.warn(`Could not generate valid ID for content type "${text}", skipping.`);
        }
    });
    // Ingen sortering här: newContentTypes.sort((a, b) => a.text.localeCompare(b.text, 'sv'));
    
    let contentTypesChangedFlag = JSON.stringify(originalContentTypes) !== JSON.stringify(newContentTypes);
    if (contentTypesChangedFlag) {
        updatedMetadata.contentTypes = newContentTypes;
        changed = true;
    }

    let requirementsUpdated = false;
    if (changed && contentTypesChangedFlag && state.jsonData.requirements) {
        console.log("Innehållstyper i metadata ändrades, synkroniserar till krav...");
        const originalIdToTextMap = new Map(originalContentTypes.map(ct => [ct.id, ct.text]));
        const newIdSet = new Set(newContentTypes.map(ct => ct.id));
        const removedIds = originalContentTypes.filter(oldCt => !newIdSet.has(oldCt.id)).map(ct => ct.id);
        if (removedIds.length > 0) console.log("Innehållstyper att ta bort från krav:", removedIds);

        const idUpdateMap = new Map();
        originalContentTypes.forEach(oldCt => {
            const newIdForOldText = newIdMap.get(oldCt.text);
            if (newIdForOldText && newIdForOldText !== oldCt.id) {
                idUpdateMap.set(oldCt.id, newIdForOldText);
            }
        });
        if (idUpdateMap.size > 0) console.log("Uppdateringar av innehållstyp-ID (gammalt -> nytt):", idUpdateMap);

        for (const reqKey in state.jsonData.requirements) {
            if (Object.hasOwnProperty.call(state.jsonData.requirements, reqKey)) {
                const req = state.jsonData.requirements[reqKey];
                const currentReqTypes = req.contentType || [];
                
                let typesAfterUpdate = currentReqTypes
                    .filter(id => !removedIds.includes(id))
                    .map(id => idUpdateMap.get(id) || id);
                
                const uniqueFinalTypes = [...new Set(typesAfterUpdate)];

                if (JSON.stringify(currentReqTypes) !== JSON.stringify(uniqueFinalTypes)) {
                    req.contentType = uniqueFinalTypes;
                    requirementsUpdated = true;
                }
            }
        }
         if (requirementsUpdated) console.log("Synkronisering av innehållstyper till krav slutförd.");
         else console.log("Inga krav behövde uppdateras p.g.a ändrade innehållstyper.")
    }


    if (changed) {
        state.jsonData.metadata = updatedMetadata;
        state.setState('isDataModified', true);
        if (saveChangesButton) saveChangesButton.classList.remove('hidden');

        displayMetadata(); // Re-render metadata view directly
        const targetArea = document.getElementById('dynamicContentArea');
        if(targetArea) {
            let confMessage = 'Metadata uppdaterad!';
            if (requirementsUpdated) {
                confMessage += ' Ändringar i innehållstyper har synkroniserats till kraven.';
            }
            confMessage += ' Glöm inte att spara ner filen.';
            displayConfirmation(confMessage, 'save', targetArea);
        }
    } else {
        displayMetadata(); // No changes detected, just go back to display view
        console.log("Inga ändringar i metadata upptäcktes.");
    }
} // Slut på saveMetadata

console.log("Module loaded: metadata_functions (full attempt)");