// js/_-----_metadata_functions.js

// Importer
import { dynamicContentArea } from './_-----_dom_element_references.js';
import { MONITORING_TYPES, ICONS, commonLanguages } from './_-----_constants.js';
import * as state from './_-----_global_state.js';
import { escapeHtml, getVal, isValidEmail, generateKeyFromName } from './_-----_utils__helpers.js';
import { setupContentArea, showError, displayConfirmation, updateSaveButtonsState } from './_-----_ui_functions.js';
import { createFormField } from './_---_requirement_functions.js'; 
import { manageContentTypeAssociations, displayRequirementsWithoutContentTypes } from './_---_requirement_functions.js'; 

// HJÄLPFUNKTION för att räkna krav per innehållstyp-ID
function getRequirementCountsByContentTypeId() {
    const counts = {};
    if (!state.jsonData || !state.jsonData.requirements || !state.jsonData.metadata?.contentTypes) {
        return counts; 
    }
    state.jsonData.metadata.contentTypes.forEach(ct => {
        if (ct && ct.id) {
            counts[ct.id] = 0;
        }
    });
    Object.values(state.jsonData.requirements).forEach(req => {
        if (req && Array.isArray(req.contentType)) {
            req.contentType.forEach(ctId => {
                if (counts.hasOwnProperty(ctId)) {
                    counts[ctId]++;
                }
            });
        }
    });
    return counts;
}

export function displayMetadata() {
    console.log("Visar metadata (modul)...");
    if (!state.jsonData?.metadata) {
        showError("Metadata saknas. Ladda upp en fil först.", dynamicContentArea);
        return;
    }
    const metadata = state.jsonData.metadata;

    setupContentArea(true, false); 
    if (!dynamicContentArea) { return; }

    const heading = document.createElement('h2');
    heading.textContent = 'Metadata';
    dynamicContentArea.appendChild(heading);

    const actionContainer = document.createElement('div');
    actionContainer.className = 'action-button-container';
    const editButton = document.createElement('button');
    editButton.id = 'editMetadataButton';
    editButton.innerHTML = `Redigera metadata <span class="icon" aria-hidden="true">${ICONS.edit}</span>`;
    editButton.addEventListener('click', renderMetadataForm);
    actionContainer.appendChild(editButton);
    dynamicContentArea.insertBefore(actionContainer, heading);

    let itemCount = 0;

    if (Object.prototype.hasOwnProperty.call(metadata, 'monitoringType')) {
        itemCount++;
        const key = 'monitoringType';
        const value = metadata[key];
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('metadata-item');
        const keyStrong = document.createElement('strong');
        keyStrong.textContent = 'Typ av tillsyn:'; 
        itemDiv.appendChild(keyStrong);
        const valueSpan = document.createElement('span');
        valueSpan.textContent = ` ${escapeHtml(getVal(value, 'text', getVal(value, 'type', '(okänd)')))}`;
        itemDiv.appendChild(valueSpan);
        dynamicContentArea.appendChild(itemDiv);
    }

    const specialHandlingKeysDisplay = ['contentTypes', 'keywords', 'pageTypes', 'monitoringType'];
    for (const key in metadata) {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) {
            if (specialHandlingKeysDisplay.includes(key)) continue;

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
                     const titleText = value.title;
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
                } else if (key === 'language') {
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    const langName = commonLanguages[value] || value.toUpperCase();
                    valueSpan.textContent = ` ${escapeHtml(langName)} (${escapeHtml(value)})`;
                    itemDiv.appendChild(valueSpan);
                } else if (Array.isArray(value)) {
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${value.map(v => escapeHtml(String(v))).join(', ')}`;
                    itemDiv.appendChild(valueSpan);
                } else {
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${escapeHtml(String(value))}`;
                    itemDiv.appendChild(valueSpan);
                }
                dynamicContentArea.appendChild(itemDiv);
            } catch (error) {
                console.error(`Fel vid visning av metadata-nyckel "${key}":`, error);
            }
        }
    }

    if (Object.prototype.hasOwnProperty.call(metadata, 'pageTypes')) {
        itemCount++;
        const ptDiv = document.createElement('div'); ptDiv.classList.add('metadata-item');
        const ptHeading = document.createElement('strong'); ptHeading.textContent = 'Page Types:'; ptHeading.style.display = 'block'; ptDiv.appendChild(ptHeading);
        const pageTypesValue = metadata.pageTypes;
        if (Array.isArray(pageTypesValue) && pageTypesValue.length > 0) {
            const ptList = document.createElement('ul'); ptList.style.listStyle = 'disc'; ptList.style.marginLeft = '20px';
            pageTypesValue.forEach(pt => {
                const li = document.createElement('li');
                li.textContent = escapeHtml(String(pt));
                ptList.appendChild(li);
            });
            ptDiv.appendChild(ptList);
        } else {
            const valueSpan = document.createElement('span'); valueSpan.textContent = ' (inga angivna)'; valueSpan.style.fontStyle = 'italic'; ptDiv.appendChild(valueSpan);
        }
        dynamicContentArea.appendChild(ptDiv);
    }
    
    itemCount++; 
    const ctDiv = document.createElement('div');
    ctDiv.classList.add('metadata-item'); 
    const ctHeading = document.createElement('strong');
    ctHeading.textContent = 'Innehållstyper:';
    ctHeading.style.display = 'block'; 
    ctDiv.appendChild(ctHeading);

    const ctList = document.createElement('ul'); 
    ctList.style.listStyle = 'disc';
    ctList.style.marginLeft = '20px'; 

    if (Array.isArray(metadata.contentTypes) && metadata.contentTypes.length > 0) {
        const requirementCounts = getRequirementCountsByContentTypeId(); 
        metadata.contentTypes.forEach(ct => {
            const li = document.createElement('li');
            const count = requirementCounts[ct.id] || 0;
            const siffraText = count === 1 ? "krav" : "krav";
            
            const link = document.createElement('a');
            link.href = '#'; 
            const contentTypeName = getVal(ct, 'text', getVal(ct, 'id', 'Okänd typ'));
            link.innerHTML = `${escapeHtml(contentTypeName)} (${count} ${siffraText}) <span class="icon" aria-hidden="true">${ICONS.edit}</span>`;
            link.dataset.contentTypeId = ct.id;
            link.dataset.contentTypeName = contentTypeName; 
            link.style.cursor = 'pointer';
            link.style.textDecoration = 'underline';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const idToManage = e.target.closest('a').dataset.contentTypeId;
                const nameToManage = e.target.closest('a').dataset.contentTypeName;
                if (idToManage && nameToManage) {
                    manageContentTypeAssociations(idToManage, nameToManage);
                }
            });
            li.appendChild(link);
            ctList.appendChild(li);
        });
    } else {
        const noCtDefinedLi = document.createElement('li');
        noCtDefinedLi.textContent = '(Inga innehållstyper definierade i metadatan)';
        noCtDefinedLi.style.fontStyle = 'italic';
        noCtDefinedLi.style.color = 'var(--neutral-color)';
        ctList.appendChild(noCtDefinedLi);
    }

    if (state.jsonData && state.jsonData.requirements) {
        const reqsWithoutContentTypes = Object.values(state.jsonData.requirements).filter(req => {
            return !req.contentType || (Array.isArray(req.contentType) && req.contentType.length === 0);
        });
        const countNoCt = reqsWithoutContentTypes.length;

        const noCtLi = document.createElement('li');
        
        if (ctList.children.length > 0 && 
            !(ctList.children.length === 1 && ctList.firstChild.textContent.startsWith('(Inga innehållstyper'))) {
            const separator = document.createElement('hr');
            separator.style.border = 'none';
            separator.style.borderTop = '1px dotted var(--border-color)';
            separator.style.margin = '0.5em 0';
            noCtLi.appendChild(separator);
        }
        
        const linkNoCt = document.createElement('a');
        linkNoCt.href = '#';
        linkNoCt.innerHTML = `Krav utan kopplade innehållstyper (${countNoCt} st) <span class="icon" aria-hidden="true">${ICONS.list}</span>`;
        linkNoCt.style.cursor = 'pointer';
        linkNoCt.style.textDecoration = 'underline';
        
        linkNoCt.addEventListener('click', (e) => {
            e.preventDefault();
            displayRequirementsWithoutContentTypes();
        });
        
        noCtLi.appendChild(linkNoCt);
        ctList.appendChild(noCtLi); 
    }
    
    ctDiv.appendChild(ctList); 
    dynamicContentArea.appendChild(ctDiv); 

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
            kwList.style.listStyle = 'disc';
            kwList.style.marginLeft = '20px';
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
}

function createMetadataSubItem(subKey, subValue, linkText = subValue) { 
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

export function renderMetadataForm() { 
    if (!state.jsonData || !state.jsonData.metadata) {
        showError("Metadata saknas eller kunde inte laddas.");
        return;
    }

    setupContentArea(true, false);
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
                        const placeholder = (inputType === 'url') ? '' : ''; // Placeholder borttagen
                        fieldset.appendChild(createFormField(readableSubKey, `${key}.${subKey}`, subValue, inputType, placeholder, false, null));
                    }
                }
                fieldContainer.appendChild(fieldset);
            } else if (key === 'language') {
                 fieldContainer = createFormField('Språk*', 'language', value, 'text', '', false, 'Ange språkkod (ISO 639-1, t.ex. sv, en) eller välj från listan.'); // Placeholder borttagen
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

    const pageTypesForTextarea = Array.isArray(metadata.pageTypes) ? metadata.pageTypes.join('\n') : (metadata.pageTypes || '');
    const ptContainer = createFormField('Page Types', 'pageTypes', pageTypesForTextarea, 'textarea', '', false, 'Ange en sidtyp per rad.');
    const ptTextarea = ptContainer.querySelector('textarea');
    if (ptTextarea) ptTextarea.rows = 10;
    form.appendChild(ptContainer);

    const ctValue = Array.isArray(metadata.contentTypes) ? metadata.contentTypes.map(ct => ct.text).join('\n') : '';
    const ctContainer = createFormField('Innehållstyper (Content Types)', 'contentTypes', ctValue, 'textarea', '', false, 'Ange en innehållstyp per rad (t.ex. Webbsida). ID genereras automatiskt.');
    const ctTextarea = ctContainer.querySelector('textarea');
    if (ctTextarea) ctTextarea.rows = 10;
    form.appendChild(ctContainer);

    const keywordsValue = Array.isArray(metadata.keywords) ? metadata.keywords.join('\n') : '';
    const kwContainer = createFormField('Nyckelord', 'keywords', keywordsValue, 'textarea', '', false, 'Ange ett nyckelord per rad.');
    const kwTextarea = kwContainer.querySelector('textarea');
    if(kwTextarea) kwTextarea.rows = 10;
    form.appendChild(kwContainer);

    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.innerHTML = `Spara ändringar <span class="icon" aria-hidden="true">${ICONS.save}</span>`;
    buttonDiv.appendChild(saveBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.innerHTML = `Avbryt <span class="icon" aria-hidden="true">${ICONS.cancel}</span>`;
    cancelBtn.addEventListener('click', () => displayMetadata());
    buttonDiv.appendChild(cancelBtn);
    form.appendChild(buttonDiv);

    targetArea.appendChild(form);
}

export function saveMetadata(event) { 
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    let changed = false;

    if (!state.jsonData || !state.jsonData.metadata) return;

    const originalMetadata = JSON.parse(JSON.stringify(state.jsonData.metadata));
    const originalContentTypes = originalMetadata.contentTypes || [];
    const updatedMetadata = JSON.parse(JSON.stringify(originalMetadata));

    const explicitHandledKeys = ['version', 'dateCreated', 'dateModified', 'contentTypes', 'monitoringType', 'keywords', 'pageTypes'];

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

    const selectedMonitoringType = formData.get('monitoringType');
    const monitoringTypeObject = MONITORING_TYPES.find(opt => opt.type === selectedMonitoringType) || MONITORING_TYPES[0];
    if (JSON.stringify(updatedMetadata.monitoringType) !== JSON.stringify(monitoringTypeObject)) {
        updatedMetadata.monitoringType = monitoringTypeObject;
        changed = true;
    }

    const pageTypesStringRaw = formData.get('pageTypes') || '';
    const newPageTypesArray = pageTypesStringRaw.split(/\r?\n/).map(pt => pt.trim()).filter(Boolean);
    if (JSON.stringify(updatedMetadata.pageTypes || []) !== JSON.stringify(newPageTypesArray)) {
        updatedMetadata.pageTypes = newPageTypesArray; 
        changed = true;
    }

    const keywordsString = formData.get('keywords') || '';
    const newKeywords = keywordsString.split(/\r?\n/).map(k => k.trim()).filter(Boolean);
    if (JSON.stringify(updatedMetadata.keywords || []) !== JSON.stringify(newKeywords)) {
        updatedMetadata.keywords = newKeywords;
        changed = true;
    }

    const contentTypesString = formData.get('contentTypes') || '';
    const contentTypeTexts = contentTypesString.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
    const newContentTypes = [];
    const seenIds = new Set();
    contentTypeTexts.forEach(text => {
        const id = generateKeyFromName(text);
        if (id && !seenIds.has(id)) {
            newContentTypes.push({ id: id, text: text });
            seenIds.add(id);
        } else if (id && seenIds.has(id)) {
            console.warn(`Duplicate content type ID generated for "${text}", skipping.`);
        }
    });
    
    let contentTypesChangedFlag = JSON.stringify(originalContentTypes) !== JSON.stringify(newContentTypes);
    if (contentTypesChangedFlag) {
        updatedMetadata.contentTypes = newContentTypes;
        changed = true;
    }

    let requirementsUpdated = false;
    if (changed && contentTypesChangedFlag && state.jsonData.requirements) {
        const newIdSet = new Set(newContentTypes.map(ct => ct.id));
        const removedIds = originalContentTypes.filter(oldCt => !newIdSet.has(oldCt.id)).map(ct => ct.id);
        const idUpdateMap = new Map();
        originalContentTypes.forEach(oldCt => {
            const newCtEntry = newContentTypes.find(nc => nc.text === oldCt.text);
            if (newCtEntry && newCtEntry.id !== oldCt.id) {
                idUpdateMap.set(oldCt.id, newCtEntry.id);
            }
        });

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
    }

    if (changed) {
        state.jsonData.metadata = updatedMetadata;
        state.setState('isDataModified', true);
        updateSaveButtonsState();
        displayMetadata();
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
        displayMetadata();
    }
}