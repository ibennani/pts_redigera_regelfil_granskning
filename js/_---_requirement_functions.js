// js/_---_requirement_functions.js
/*
    MODIFIED:
    - Removed the import for the deleted 'displayMetadata' function.
    - Imported 'renderMetadataForm' instead.
    - Updated the 'Back' buttons in 'manageContentTypeAssociations' and
      'displayRequirementsWithoutContentTypes' to call 'renderMetadataForm'
      to ensure correct navigation back to the metadata editor view.
*/

// Importer
import {
    dynamicContentArea, filterSortRow, sortOrderSelect, searchInput,
    postUploadControlsContainer, showRequirementsButton
} from './_-----_dom_element_references.js';
import { ICONS } from './_-----_constants.js';
import * as state from './_-----_global_state.js';
import { escapeHtml, parseSimpleMarkdown, getVal, generateKeyFromName, generateRequirementKey, linkifyText } from './_-----_utils__helpers.js';
import { setupContentArea, showError, displayConfirmation, updateSaveButtonsState, displayConfirmationModal, autoResizeTextarea } from './_-----_ui_functions.js';
// MODIFIED: Replaced displayMetadata with renderMetadataForm
import { renderMetadataForm } from './_-----_metadata_functions.js';


// ----- Helper function for UUID generation -----
/**
 * Generates a simple pseudo-random UUID (Version 4).
 * This is a fallback if crypto.randomUUID() is not available.
 * @returns {string} A UUID-like string.
 */
function generateSimpleUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// ----- Form Field Creation Helpers -----
export function createFormField(labelText, name, value, type = 'text', instructionText = null, readonly = false) {
    const container = document.createElement('div');
    container.classList.add('form-field');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const inputId = `form-${name.replace(/[\.\[\]]/g, '-')}-${randomSuffix}`;

    const label = document.createElement('label');
    label.htmlFor = inputId;
    const isRequired = labelText.endsWith('*');
    label.textContent = isRequired ? labelText : `${labelText}:`; // Behåll kolon för icke-obligatoriska

    container.appendChild(label);

    if (instructionText) {
        const instr = document.createElement('p');
        instr.className = 'field-instruction';
        instr.textContent = instructionText;
        container.appendChild(instr);
    }

    let inputElement;

    if (type === 'checkbox') {
        container.innerHTML = ''; // Rensa tidigare label (om en skapades av misstag)
        container.classList.add('form-field-checkbox');

        inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.id = inputId;
        inputElement.name = name;
        inputElement.value = value;
        if (value === true || String(value).toLowerCase() === 'true' || value === 'on') {
             inputElement.checked = true;
        }

        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = inputId;
        checkboxLabel.textContent = labelText.replace('*','').trim(); // Labeltext för checkboxen

        if (instructionText && !container.querySelector('.field-instruction')) {
            const instr = document.createElement('p');
            instr.className = 'field-instruction';
            instr.textContent = instructionText;
            const wrapper = document.createElement('div');
            wrapper.appendChild(inputElement);
            wrapper.appendChild(checkboxLabel);
            container.appendChild(wrapper);
            container.appendChild(instr);
        } else {
            container.appendChild(inputElement);
            container.appendChild(checkboxLabel);
        }

    } else if (type === 'select') {
        return container;
    } else {
        if (type === 'textarea') {
            inputElement = document.createElement('textarea');
            inputElement.rows = 1;
        } else {
            inputElement = document.createElement('input');
            inputElement.type = type;
            if (type === 'number') inputElement.step = 'any';
        }

        inputElement.id = inputId;
        inputElement.name = name;
        inputElement.value = value ?? '';
        if (readonly) {
            inputElement.readOnly = true;
            inputElement.classList.add('readonly-field');
        }
        if (isRequired) inputElement.required = true;
        container.appendChild(inputElement);
    }
    return container;
}

function createInstructionListItem(text, index) {
    const li = document.createElement('li');
    li.classList.add('instruction-item', 'dynamic-list-item');
    li.dataset.index = index;
    const textarea = document.createElement('textarea');
    textarea.name = `instruction-${index}`;
    textarea.rows = 1;
    textarea.value = text;
    textarea.setAttribute('aria-label', `Instruktion ${index + 1}`);
    li.appendChild(textarea);

    return li;
}

function createCheckFieldset(checkData, index) {
    const fieldset = document.createElement('fieldset');
    fieldset.classList.add('check-fieldset', 'dynamic-list-item');
    fieldset.dataset.index = index;

    const headerDiv = document.createElement('div');
    headerDiv.classList.add('check-fieldset-header');

    const legend = document.createElement('legend');
    legend.textContent = `Påstående ${index + 1}`;
    headerDiv.appendChild(legend);

    const moveButtonsDiv = document.createElement('div');
    moveButtonsDiv.classList.add('check-fieldset-move-buttons');

    const moveUpButton = document.createElement('button');
    moveUpButton.type = 'button';
    moveUpButton.classList.add('move-check-button', 'move-check-up-button');
    moveUpButton.innerHTML = `Flytta upp <span class="move-arrow" aria-hidden="true">▲</span>`;
    moveUpButton.setAttribute('aria-label', `Flytta upp (påstående ${index + 1})`);
    moveUpButton.addEventListener('click', () => handleMoveCheckpoint(fieldset, 'up'));
    moveButtonsDiv.appendChild(moveUpButton);

    const moveDownButton = document.createElement('button');
    moveDownButton.type = 'button';
    moveDownButton.classList.add('move-check-button', 'move-check-down-button');
    moveDownButton.innerHTML = `Flytta ner <span class="move-arrow" aria-hidden="true">▼</span>`;
    moveDownButton.setAttribute('aria-label', `Flytta ner (påstående ${index + 1})`);
    moveDownButton.addEventListener('click', () => handleMoveCheckpoint(fieldset, 'down'));
    moveButtonsDiv.appendChild(moveDownButton);

    headerDiv.appendChild(moveButtonsDiv);

    const removeCheckButton = createDynamicListButton(
        'Ta bort Påstående',
        (e) => {
            const fieldsetToRemove = e.target.closest('fieldset.check-fieldset');
            if (fieldsetToRemove) {
                const parentContainer = fieldsetToRemove.parentElement;
                fieldsetToRemove.remove();
                if (parentContainer) {
                    updateAllCheckpointDOMIndices(parentContainer);
                    updateMoveButtonsState(parentContainer);
                }
            }
        },
        ['remove-item-button', 'remove-check-button', 'button-danger']
    );
    removeCheckButton.setAttribute('aria-label', `Ta bort påstående ${index + 1}`);
    headerDiv.appendChild(removeCheckButton);

    fieldset.appendChild(headerDiv);

    const conditionContainer = createFormField(
        `Påståendetext*`,
        `condition`,
        checkData.condition || '',
        'textarea',
        'Skriv det påstående som stämmer eller som inte stämma.'
    );
    const conditionTextarea = conditionContainer.querySelector('textarea');
    if (conditionTextarea) {
        conditionTextarea.required = true;
    }
    fieldset.appendChild(conditionContainer);

    const logicContainer = createFormField(
        `Logik för Godkänd-kriterier`,
        `logic`,
        '',
        'select',
        'Välj om ALLA eller ETT kriterium måste vara uppfyllt för att påståendet ska anses godkänt.'
    );
    const logicSelect = document.createElement('select');
    const logicId = logicContainer.querySelector('label')?.htmlFor || `check-${index}-logic-select`;
    logicSelect.id = logicId;
    logicSelect.name = `logic`;
    const optionAnd = document.createElement('option');
    optionAnd.value = 'AND';
    optionAnd.textContent = 'ALLA kriterier måste uppfyllas (AND)';
    const optionOr = document.createElement('option');
    optionOr.value = 'OR';
    optionOr.textContent = 'Minst ETT kriterium måste uppfyllas (OR)';
    logicSelect.appendChild(optionAnd);
    logicSelect.appendChild(optionOr);
    logicSelect.value = checkData.logic || 'AND';
    logicContainer.appendChild(logicSelect);
    fieldset.appendChild(logicContainer);

    const passFieldset = document.createElement('fieldset');
    passFieldset.classList.add('criteria-group', 'pass-criteria-group');
    const passLegend = document.createElement('legend');
    passLegend.textContent = 'Godkänd-kriterier';
    passFieldset.appendChild(passLegend);
    const passInstr = document.createElement('p');
    passInstr.className = 'field-instruction criteria-group-instruction';
    passInstr.textContent = 'Definiera ett eller flera kriterier som, om de är uppfyllda (givet logiken ovan), gör att detta påstående bedöms som "Stämmer".';
    passFieldset.appendChild(passInstr);
    const passList = document.createElement('ul');
    passList.classList.add('pass-criteria-list', 'dynamic-list');
    (checkData.passCriteria || []).forEach((crit, critIndex) => {
        passList.appendChild(createCriterionListItem(crit, index, 'pass', critIndex));
    });
    passFieldset.appendChild(passList);
    const addPassButton = createDynamicListButton('+ Lägg till Godkänd-kriterium', () => {
        const currentCheckIndex = parseInt(fieldset.dataset.index, 10);
        passList.appendChild(createCriterionListItem({}, currentCheckIndex, 'pass', passList.children.length));
    });
    passFieldset.appendChild(addPassButton);
    fieldset.appendChild(passFieldset);

    const ifNoFieldset = document.createElement('fieldset');
    ifNoFieldset.classList.add('criteria-group', 'if-no-criteria-group');
    const ifNoLegend = document.createElement('legend');
    ifNoLegend.textContent = '"Om Nej"-kriterier (Alternativ om ovan ej uppfylls)';
    ifNoFieldset.appendChild(ifNoLegend);
    const ifNoInstr = document.createElement('p');
    ifNoInstr.className = 'field-instruction criteria-group-instruction';
    ifNoInstr.textContent = 'Dessa kriterier utvärderas endast om Godkänd-kriterierna ovan INTE är uppfyllda. Om något av dessa "Om Nej"-kriterier stämmer, kan det indikera en alternativ väg eller ett specifikt problem.';
    ifNoFieldset.appendChild(ifNoInstr);
    const ifNoList = document.createElement('ul');
    ifNoList.classList.add('if-no-criteria-list', 'dynamic-list');
    (checkData.ifNo || []).forEach((crit, critIndex) => {
        ifNoList.appendChild(createCriterionListItem(crit, index, 'ifNo', critIndex));
    });
    ifNoFieldset.appendChild(ifNoList);
    const addIfNoButton = createDynamicListButton('+ Lägg till "Om Nej"-kriterium', () => {
        const currentCheckIndex = parseInt(fieldset.dataset.index, 10);
        ifNoList.appendChild(createCriterionListItem({}, currentCheckIndex, 'ifNo', ifNoList.children.length));
    });
    ifNoFieldset.appendChild(addIfNoButton);
    fieldset.appendChild(ifNoFieldset);

    return fieldset;
}

function createCriterionListItem(criterion, checkIndex, type, critIndex) {
    const li = document.createElement('li');
    li.classList.add(`${type}-criterion-item`, 'dynamic-list-item');
    li.dataset.checkIndex = checkIndex;
    li.dataset.critIndex = critIndex;

    const typeText = type === 'pass' ? 'Godkänd-kriterium' : '"Om Nej"-kriterium';
    
    const fieldsWrapper = document.createElement('div');
    fieldsWrapper.className = 'criterion-fields-wrapper';

    const requirementContainer = createFormField(
        `Kriterietext*`,
        `requirement`,
        criterion.requirement || '',
        'textarea',
        `Texten för ${typeText.toLowerCase()} ${critIndex + 1}.`
    );
    const requirementTextarea = requirementContainer.querySelector('textarea');
    if (requirementTextarea) {
        requirementTextarea.required = true;
        requirementTextarea.setAttribute('aria-label', `Kriterietext för ${typeText.toLowerCase()} ${critIndex + 1}, påstående ${checkIndex + 1}`);
    }
    fieldsWrapper.appendChild(requirementContainer);

    const failureContainer = createFormField(
        `Mall för avvikelsetext`,
        `failureStatementTemplate`,
        criterion.failureStatementTemplate || '',
        'textarea',
        `Fyll i en mall för hur en avvikelse mot detta specifika kriterium ska formuleras. Använd [ange var och hur det brister] som platshållare.`
    );
    const failureTextarea = failureContainer.querySelector('textarea');
    if (failureTextarea) {
        failureTextarea.setAttribute('aria-label', `Mall för avvikelsetext för ${typeText.toLowerCase()} ${critIndex + 1}, påstående ${checkIndex + 1}`);
    }
    
    const failureStatementWrapper = document.createElement('div');
    failureStatementWrapper.className = 'failure-statement-group';
    failureStatementWrapper.appendChild(failureContainer);
    fieldsWrapper.appendChild(failureStatementWrapper);

    li.appendChild(fieldsWrapper);

    const removeButton = createDynamicListButton('Ta bort', (e) => {
        const itemToRemove = e.target.closest('li.dynamic-list-item');
        if (itemToRemove) {
            const list = itemToRemove.parentElement;
            itemToRemove.remove();
            Array.from(list.children).forEach((siblingLi, newCritIndex) => {
                siblingLi.dataset.critIndex = newCritIndex;
                const currentCheckIdx = parseInt(siblingLi.dataset.checkIndex, 10);
                
                const reqTextarea = siblingLi.querySelector(`textarea[name="requirement"]`);
                const failTextarea = siblingLi.querySelector(`textarea[name="failureStatementTemplate"]`);
                const siblingRemoveButton = siblingLi.querySelector('.remove-item-button');
                
                const newLabel = `Kriterietext för ${typeText.toLowerCase()} ${newCritIndex + 1}, påstående ${currentCheckIdx + 1}`;
                const newFailureLabel = `Mall för avvikelsetext för ${typeText.toLowerCase()} ${newCritIndex + 1}, påstående ${currentCheckIdx + 1}`;
                const newRemoveLabel = `Ta bort ${typeText.toLowerCase()} ${newCritIndex + 1}`;

                if (reqTextarea) reqTextarea.setAttribute('aria-label', newLabel);
                if (failTextarea) failTextarea.setAttribute('aria-label', newFailureLabel);
                if (siblingRemoveButton) siblingRemoveButton.setAttribute('aria-label', newRemoveLabel);
            });
        }
    }, 'remove-item-button');
    removeButton.setAttribute('aria-label', `Ta bort ${typeText.toLowerCase()} ${critIndex + 1}`);
    
    const removeButtonWrapper = document.createElement('div');
    removeButtonWrapper.className = 'criterion-remove-wrapper';
    removeButtonWrapper.appendChild(removeButton);
    li.appendChild(removeButtonWrapper);
    
    return li;
}

function createDynamicListButton(text, onClick, classNames = 'add-item-button') {
    const button = document.createElement('button');
    button.type = 'button';
    let icon = ICONS.add;
    if (text.toLowerCase().includes('ta bort')) icon = ICONS.delete;
    button.innerHTML = `${escapeHtml(text)} <span class="icon" aria-hidden="true">${icon}</span>`;
    if (Array.isArray(classNames)) button.classList.add(...classNames);
    else if (typeof classNames === 'string') button.classList.add(classNames);
    button.addEventListener('click', onClick);
    return button;
}

function handleMoveCheckpoint(fieldsetElement, direction) {
    const checksContainer = fieldsetElement.parentElement;
    if (!checksContainer) return;

    const fieldsets = Array.from(checksContainer.children);
    const currentIndex = fieldsets.indexOf(fieldsetElement);

    let targetElement = null;
    if (direction === 'up' && currentIndex > 0) {
        targetElement = fieldsets[currentIndex - 1];
    } else if (direction === 'down' && currentIndex < fieldsets.length - 1) {
        targetElement = fieldsets[currentIndex + 1];
    }

    if (!targetElement) return;

    const first = fieldsetElement.getBoundingClientRect();
    fieldsetElement.style.willChange = 'transform';

    if (direction === 'up') {
        checksContainer.insertBefore(fieldsetElement, targetElement);
    } else {
        checksContainer.insertBefore(fieldsetElement, targetElement.nextSibling);
    }

    const last = fieldsetElement.getBoundingClientRect();
    const deltaY = first.top - last.top;

    fieldsetElement.style.transform = `translateY(${deltaY}px)`;
    fieldsetElement.style.transition = 'transform 0s';

    requestAnimationFrame(() => {
        fieldsetElement.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        fieldsetElement.style.transform = 'translateY(0)';
    });

    fieldsetElement.addEventListener('transitionend', () => {
        fieldsetElement.style.transition = '';
        fieldsetElement.style.willChange = '';
    }, { once: true });

    updateAllCheckpointDOMIndices(checksContainer);
    updateMoveButtonsState(checksContainer);

    const focusableButton = direction === 'up'
        ? fieldsetElement.querySelector('.move-check-up-button')
        : fieldsetElement.querySelector('.move-check-down-button');
    if (focusableButton) {
        setTimeout(() => focusableButton.focus(), 50);
    }
}

function updateAllCheckpointDOMIndices(checksContainer) {
    if (!checksContainer) return;
    const fieldsets = Array.from(checksContainer.children);

    fieldsets.forEach((fieldset, newIndex) => {
        fieldset.dataset.index = newIndex;

        const legend = fieldset.querySelector('.check-fieldset-header legend');
        if (legend) legend.textContent = `Påstående ${newIndex + 1}`;

        const moveUpBtn = fieldset.querySelector('.move-check-up-button');
        if (moveUpBtn) moveUpBtn.setAttribute('aria-label', `Flytta upp (påstående ${newIndex + 1})`);
        const moveDownBtn = fieldset.querySelector('.move-check-down-button');
        if (moveDownBtn) moveDownBtn.setAttribute('aria-label', `Flytta ner (påstående ${newIndex + 1})`);

        const removeBtn = fieldset.querySelector('.remove-check-button');
        if (removeBtn) removeBtn.setAttribute('aria-label', `Ta bort påstående ${newIndex + 1}`);

        ['pass', 'ifNo'].forEach(type => {
            const criteriaListItems = fieldset.querySelectorAll(`.${type}-criteria-list .dynamic-list-item`);
            const typeText = type === 'pass' ? 'Godkänd-kriterium' : '"Om Nej"-kriterium';

            criteriaListItems.forEach((li, critIndex) => {
                li.dataset.checkIndex = newIndex;
                li.dataset.critIndex = critIndex;
                
                const reqTextarea = li.querySelector(`textarea[name="requirement"]`);
                const failTextarea = li.querySelector(`textarea[name="failureStatementTemplate"]`);
                const siblingRemoveButton = li.querySelector('.remove-item-button');
                
                const newLabel = `Kriterietext för ${typeText.toLowerCase()} ${critIndex + 1}, påstående ${newIndex + 1}`;
                const newFailureLabel = `Mall för avvikelsetext för ${typeText.toLowerCase()} ${critIndex + 1}, påstående ${newIndex + 1}`;
                const newRemoveLabel = `Ta bort ${typeText.toLowerCase()} ${critIndex + 1}`;

                if (reqTextarea) reqTextarea.setAttribute('aria-label', newLabel);
                if (failTextarea) failTextarea.setAttribute('aria-label', newFailureLabel);
                if (siblingRemoveButton) siblingRemoveButton.setAttribute('aria-label', newRemoveLabel);
            });
        });
    });
}


function updateMoveButtonsState(checksContainer) {
    if (!checksContainer) return;
    const fieldsets = Array.from(checksContainer.children);
    const totalCheckpoints = fieldsets.length;

    fieldsets.forEach((fieldset, index) => {
        const moveUpButton = fieldset.querySelector('.move-check-up-button');
        const moveDownButton = fieldset.querySelector('.move-check-down-button');

        if (!moveUpButton || !moveDownButton) return;

        if (totalCheckpoints < 2) {
            moveUpButton.style.display = 'none';
            moveDownButton.style.display = 'none';
        } else {
            moveUpButton.style.display = (index === 0) ? 'none' : '';
            moveDownButton.style.display = (index === totalCheckpoints - 1) ? 'none' : '';
        }
    });
}


export function displayRequirements() {
    if (!state.jsonData?.requirements) {
        const area = dynamicContentArea || contentDisplay;
        showError('Inga krav att visa. Ladda upp en fil först.', area);
        if (filterSortRow) filterSortRow.classList.add('hidden');
        return;
    }
    const requirements = state.jsonData.requirements;
    setupContentArea(true, true);
    if (!dynamicContentArea) return;

    const heading = document.createElement('h2');
    dynamicContentArea.appendChild(heading);
    const keyToFocus = state.lastFocusedReqKey;
    let requirementsArray;
    try {
        requirementsArray = Object.entries(requirements).map(([key, value]) => {
            if (typeof value !== 'object' || value === null) return null;
            value.key = key;
            if (!value.title) value.title = `[Titel saknas: ${key}]`;
            return value;
        }).filter(Boolean);
    } catch (e) {
        showError("Kunde inte bearbeta kravlistan.", dynamicContentArea);
        return;
    }

    if (requirementsArray.length === 0) {
        heading.textContent = 'Krav (0 st)';
        dynamicContentArea.appendChild(document.createElement('p')).textContent = 'Inga krav finns i den laddade filen.';
        if (filterSortRow) filterSortRow.classList.add('hidden');
        return;
    }

    const searchTerm = state.currentSearchTerm.toLowerCase().trim();
    let filteredRequirements = requirementsArray;
    if (searchTerm) {
        filteredRequirements = requirementsArray.filter(req => {
            const searchableText = [
                getVal(req, 'title', ''), getVal(req, 'key', ''), getVal(req, 'standardReference.text', ''),
                getVal(req, 'metadata.mainCategory.text', ''), getVal(req, 'metadata.subCategory.text', ''),
                ...(req.instructions || []).map(instr => getVal(instr, 'text', '')),
                ...(req.checks || []).flatMap(check => [
                    getVal(check, 'condition', ''),
                    ...(check.passCriteria || []).map(crit => getVal(crit, 'requirement', '')),
                    ...(check.ifNo || []).map(crit => getVal(crit, 'requirement', ''))
                ]),
                getVal(req, 'examples', ''), getVal(req, 'exceptions', ''),
                getVal(req, 'tips', ''), getVal(req, 'commonErrors', ''), getVal(req, 'expectedObservation', '')
            ].join(' ').toLowerCase();
            return searchableText.includes(searchTerm);
        });
    }
    heading.textContent = `Krav (${filteredRequirements.length} st)`;
    try {
        filteredRequirements.sort(getSortFunction(state.currentSortOrder));
    } catch (e) {
        showError("Kunde inte sortera kravlistan.", dynamicContentArea);
        return;
    }

    const isCategorySort = state.currentSortOrder.startsWith('category-');
    dynamicContentArea.classList.toggle('grouped-list-view', isCategorySort);
    dynamicContentArea.classList.toggle('flat-list-view', !isCategorySort);

    if (filteredRequirements.length === 0) {
        dynamicContentArea.appendChild(document.createElement('p')).textContent = searchTerm
            ? 'Inga krav matchade sökningen.'
            : 'Inga krav att visa (möjligen p.g.a. filter).';
    } else if (isCategorySort) {
        renderGroupedRequirements(filteredRequirements, keyToFocus);
    } else {
        renderFlatRequirements(filteredRequirements, keyToFocus);
    }

    const elementToFocus = dynamicContentArea.querySelector('[data-focus-target="true"] .requirement-text');
    if (elementToFocus) {
        setTimeout(() => {
             if (elementToFocus && document.body.contains(elementToFocus)) {
                elementToFocus.focus({ preventScroll: false });
                elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }
             state.setState('lastFocusedReqKey', null);
        }, 50);
    } else if (keyToFocus) {
        state.setState('lastFocusedReqKey', null);
    }
}

function renderGroupedRequirements(requirementsArray, keyToFocus) {
    const grouped = {};
    try {
        requirementsArray.forEach(req => {
            const mainCatObj = getVal(req, 'metadata.mainCategory', {});
            const subCatObj = getVal(req, 'metadata.subCategory', {});
            const mainCatText = getVal(mainCatObj, 'text', getVal(mainCatObj, 'key', typeof mainCatObj === 'string' ? mainCatObj : 'Okategoriserad')).trim() || 'Okategoriserad';
            const subCatText = getVal(subCatObj, 'text', getVal(subCatObj, 'key', typeof subCatObj === 'string' ? subCatObj : '')).trim();
            if (!grouped[mainCatText]) grouped[mainCatText] = {};
            if (!grouped[mainCatText][subCatText]) grouped[mainCatText][subCatText] = [];
            grouped[mainCatText][subCatText].push(req);
        });
    } catch (e) {
        showError("Kunde inte gruppera kraven per kategori.", dynamicContentArea);
        return;
    }
     const sortedMainCategories = Object.keys(grouped).sort((a, b) => {
        const compare = a.localeCompare(b, 'sv');
        return state.currentSortOrder === 'category-asc' ? compare : -compare;
    });
     if (sortedMainCategories.length === 0) {
        dynamicContentArea.appendChild(document.createElement('p')).textContent = 'Inga kategorier att visa.';
        return;
    }
     sortedMainCategories.forEach(mainCategory => {
        if (grouped[mainCategory]) {
            const mainCatHeading = document.createElement('h3');
            const mainCatId = `maincat-${generateKeyFromName(mainCategory)}`;
            mainCatHeading.textContent = mainCategory;
            mainCatHeading.id = mainCatId;
            dynamicContentArea.appendChild(mainCatHeading);
            const categoryContent = grouped[mainCategory];
            const sortedSubCategories = Object.keys(categoryContent).sort((a,b) => a.localeCompare(b,'sv'));
             sortedSubCategories.forEach(subCategory => {
                if (categoryContent[subCategory]) {
                    const reqList = categoryContent[subCategory];
                    reqList.sort((a, b) => getVal(a, 'title', '').localeCompare(getVal(b, 'title', ''), 'sv'));
                    let subCatHeading = null;
                    let subCatId = '';
                    let listLabelledBy = mainCatId;
                    if (subCategory !== '') {
                        subCatHeading = document.createElement('h4');
                        subCatId = `subcat-${generateKeyFromName(subCategory)}`;
                        subCatHeading.textContent = subCategory;
                        subCatHeading.id = subCatId;
                        dynamicContentArea.appendChild(subCatHeading);
                        listLabelledBy = subCatId;
                    }
                    const ul = document.createElement('ul');
                    ul.classList.add('requirement-list');
                    ul.setAttribute('aria-labelledby', listLabelledBy);
                    dynamicContentArea.appendChild(ul);
                     reqList.forEach(req => {
                        try {
                            const li = renderRequirementListItem(req, keyToFocus);
                            ul.appendChild(li);
                        } catch (itemError) {
                             const errorLi = document.createElement('li');
                             errorLi.textContent = `Fel vid rendering av krav: ${escapeHtml(req.key)}`;
                             errorLi.style.color = 'red';
                             ul.appendChild(errorLi);
                        }
                    });
                }
            });
        }
    });
}

function renderFlatRequirements(requirementsArray, keyToFocus) {
    const ul = document.createElement('ul');
    ul.classList.add('requirement-list', 'flat-list');
    dynamicContentArea.appendChild(ul);
     requirementsArray.forEach(req => {
         try {
            const li = renderRequirementListItem(req, keyToFocus);
            ul.appendChild(li);
         } catch (itemError) {
             const errorLi = document.createElement('li');
             errorLi.textContent = `Fel vid rendering av krav: ${escapeHtml(req.key)}`;
             errorLi.style.color = 'red';
             ul.appendChild(errorLi);
         }
    });
}

function renderRequirementListItem(req, keyToFocus) {
    const li = document.createElement('li');
    li.classList.add('requirement-item');
    li.id = `req-item-${req.key}`;
    const textDiv = document.createElement('div');
    textDiv.classList.add('requirement-text');
    const refStrong = document.createElement('strong');
    refStrong.textContent = escapeHtml(getVal(req, 'standardReference.text', getVal(req, 'id', req.key || 'REFERENS SAKNAS')));
    textDiv.appendChild(refStrong);
    textDiv.appendChild(document.createTextNode(`: ${escapeHtml(req.title || 'TITEL SAKNAS')}`));
    textDiv.tabIndex = -1;
    li.appendChild(textDiv);
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('requirement-actions');
    const viewButton = document.createElement('button');
    viewButton.classList.add('req-view-button');
    viewButton.innerHTML = `Visa <span class="icon" aria-hidden="true">${ICONS.view}</span>`;
    viewButton.setAttribute('aria-label', `Visa ${escapeHtml(req.title || 'Okänt krav')}`);
    viewButton.dataset.reqKey = req.key;
    viewButton.addEventListener('click', () => displayRequirementDetail(req.key));
    actionsDiv.appendChild(viewButton);
    const editButton = document.createElement('button');
    editButton.classList.add('req-edit-button');
    editButton.innerHTML = `Redigera <span class="icon" aria-hidden="true">${ICONS.edit}</span>`;
    editButton.setAttribute('aria-label', `Redigera ${escapeHtml(req.title || 'Okänt krav')}`);
    editButton.dataset.reqKey = req.key;
    editButton.addEventListener('click', () => renderRequirementForm(req.key));
    actionsDiv.appendChild(editButton);
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('button-danger', 'req-delete-button');
    deleteButton.innerHTML = `Radera <span class="icon" aria-hidden="true">${ICONS.delete}</span>`;
    deleteButton.setAttribute('aria-label', `Radera ${escapeHtml(req.title || 'Okänt krav')}`);
    deleteButton.dataset.reqKey = req.key;
    deleteButton.addEventListener('click', () => confirmDeleteRequirement(req.key));
    actionsDiv.appendChild(deleteButton);
    li.appendChild(actionsDiv);
    if (req.key === keyToFocus) {
        li.dataset.focusTarget = 'true';
    }
    return li;
}

function getSortFunction(sortOrder) {
    return (a, b) => {
        let valA, valB, compareResult;
        try {
            switch (sortOrder) {
                case 'ref-asc':
                case 'ref-desc':
                    valA = getVal(a, 'standardReference.text', a.key || '');
                    valB = getVal(b, 'standardReference.text', b.key || '');
                    compareResult = valA.localeCompare(valB, 'sv', { numeric: true, sensitivity: 'base' });
                    return sortOrder === 'ref-asc' ? compareResult : -compareResult;
                case 'impact-critical-first':
                case 'impact-critical-last':
                    const criticalA = getVal(a, 'metadata.impact.isCritical', false) === true;
                    const criticalB = getVal(b, 'metadata.impact.isCritical', false) === true;
                    const primaryA = getVal(a, 'metadata.impact.primaryScore', 0);
                    const primaryB = getVal(b, 'metadata.impact.primaryScore', 0);
                    const secondaryA = getVal(a, 'metadata.impact.secondaryScore', 0);
                    const secondaryB = getVal(b, 'metadata.impact.secondaryScore', 0);
                    if (criticalA !== criticalB) {
                        compareResult = criticalA ? -1 : 1;
                        return sortOrder === 'impact-critical-first' ? compareResult : -compareResult;
                    }
                    if (primaryA !== primaryB) {
                        compareResult = primaryB - primaryA;
                        return sortOrder === 'impact-critical-first' ? compareResult : -compareResult;
                    }
                     if (secondaryA !== secondaryB) {
                        compareResult = secondaryB - secondaryA;
                        return sortOrder === 'impact-critical-first' ? compareResult : -compareResult;
                    }
                    valA = getVal(a, 'standardReference.text', a.key || '');
                    valB = getVal(b, 'standardReference.text', b.key || '');
                    return valA.localeCompare(valB, 'sv', { numeric: true, sensitivity: 'base' });
                case 'category-asc':
                case 'category-desc':
                default:
                    const mainCatAObj = getVal(a, 'metadata.mainCategory', {});
                    const mainCatBObj = getVal(b, 'metadata.mainCategory', {});
                    const subCatAObj = getVal(a, 'metadata.subCategory', {});
                    const subCatBObj = getVal(b, 'metadata.subCategory', {});
                    valA = getVal(mainCatAObj, 'text', getVal(mainCatAObj, 'key', typeof mainCatAObj === 'string' ? mainCatAObj : 'ÖÖÖ')).trim() || 'ÖÖÖ';
                    valB = getVal(mainCatBObj, 'text', getVal(mainCatBObj, 'key', typeof mainCatBObj === 'string' ? mainCatBObj : 'ÖÖÖ')).trim() || 'ÖÖÖ';
                    compareResult = valA.localeCompare(valB, 'sv');
                    if (compareResult !== 0) {
                        return state.currentSortOrder === 'category-asc' ? compareResult : -compareResult;
                    }
                    valA = getVal(subCatAObj, 'text', typeof subCatAObj === 'string' ? subCatAObj : 'ööö').trim() || 'ööö';
                    valB = getVal(subCatBObj, 'text', typeof subCatBObj === 'string' ? subCatBObj : 'ööö').trim() || 'ööö';
                    compareResult = valA.localeCompare(valB, 'sv');
                     if (compareResult !== 0) {
                        return compareResult; 
                    }
                    valA = getVal(a, 'standardReference.text', a.key || '');
                    valB = getVal(b, 'standardReference.text', b.key || '');
                    return valA.localeCompare(valB, 'sv', { numeric: true, sensitivity: 'base' });
            }
        } catch (sortError) {
             console.error("[Error] getSortFunction: Fel under sorteringsjämförelse:", sortError, "Data A:", a, "Data B:", b);
            return 0;
        }
    };
}

export function displayRequirementDetail(reqKey) {
    const requirement = state.jsonData?.requirements?.[reqKey];
    if (!requirement) {
        showError(`Kunde inte hitta krav med nyckel: ${escapeHtml(reqKey)}`, dynamicContentArea);
        if (state.jsonData?.requirements) displayRequirements();
        return;
    }
    state.setState('currentRequirementKey', reqKey); 
    state.setState('lastFocusedReqKey', reqKey);
    setupContentArea(true, false);
    if (!dynamicContentArea) return;
    dynamicContentArea.classList.add('requirement-detail');

    const renderMarkdownToElement = (targetElement, markdownString) => {
        if (markdownString === null || markdownString === undefined) return;

        if (typeof marked === 'undefined') {
            console.warn("marked.js not found. Using simple markdown parser as fallback.");
            const processedHTML = linkifyText(parseSimpleMarkdown(markdownString.replace(/\n/g, '<br>')));
            const template = document.createElement('template');
            template.innerHTML = processedHTML.trim();
            targetElement.appendChild(template.content);
            return;
        }

        const renderer = new marked.Renderer();
        const originalLinkRenderer = renderer.link.bind(renderer);
        renderer.link = (href, title, text) => {
            const link = originalLinkRenderer(href, title, text);
            return link.replace('<a', '<a target="_blank" rel="noopener noreferrer"');
        };

        try {
            let html = marked.parse(markdownString, { breaks: true, gfm: true, renderer: renderer });
            html = linkifyText(html);
            
            const template = document.createElement('template');
            template.innerHTML = html.trim();
            targetElement.appendChild(template.content);
        } catch (error) {
            console.error("Error parsing Markdown in detail view:", error);
            targetElement.textContent = markdownString;
        }
    };

    const actionButtonContainer = document.createElement('div');
    actionButtonContainer.className = 'action-button-container';

    const editButton = document.createElement('button');
    editButton.className = 'req-edit-button';
    editButton.innerHTML = `Redigera <span class="icon" aria-hidden="true">${ICONS.edit}</span>`;
    editButton.setAttribute('aria-label', `Redigera ${escapeHtml(requirement.title)}`);
    editButton.addEventListener('click', () => renderRequirementForm(reqKey));
    actionButtonContainer.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'button-danger req-delete-button';
    deleteButton.innerHTML = `Radera <span class="icon" aria-hidden="true">${ICONS.delete}</span>`;
    deleteButton.setAttribute('aria-label', `Radera ${escapeHtml(requirement.title)}`);
    deleteButton.addEventListener('click', () => confirmDeleteRequirement(reqKey));
    actionButtonContainer.appendChild(deleteButton);
    dynamicContentArea.appendChild(actionButtonContainer);

    const title = document.createElement('h2');
    title.textContent = requirement.title || "[Titel saknas]";
    title.tabIndex = -1;
    dynamicContentArea.appendChild(title);

    const stdRefP = document.createElement('p');
    stdRefP.classList.add('standard-ref');
    if (requirement.standardReference) {
        const refStrong = document.createElement('strong');
        refStrong.textContent = 'Referens: ';
        stdRefP.appendChild(refStrong);
        let refText = ''; let refUrl = '';
        if (typeof requirement.standardReference === 'object' && requirement.standardReference !== null) {
            refText = getVal(requirement.standardReference, 'text', '');
            refUrl = getVal(requirement.standardReference, 'url', '');
        } else if (typeof requirement.standardReference === 'string') {
            refText = requirement.standardReference;
        }
        if (refUrl && refUrl.trim() !== '') {
            try {
                const urlObj = new URL(refUrl); 
                const refLink = document.createElement('a');
                refLink.href = urlObj.href;
                refLink.textContent = escapeHtml(refText || refUrl);
                refLink.target = '_blank'; refLink.rel = 'noopener noreferrer';
                stdRefP.appendChild(refLink);
            } catch (urlError) {
                console.warn(`[Warn] displayRequirementDetail: Ogiltig URL för standardReference: "${refUrl}". Visar som text.`);
                stdRefP.appendChild(document.createTextNode(escapeHtml(refText || refUrl)));
            }
        } else {
            stdRefP.appendChild(document.createTextNode(escapeHtml(refText)));
        }
    } else {
        stdRefP.innerHTML = '<strong>Referens:</strong> <em>(saknas)</em>';
    }
    dynamicContentArea.appendChild(stdRefP);

    if (requirement.expectedObservation) {
        const obsSection = document.createElement('div');
        obsSection.classList.add('detail-section');
        const obsHeading = document.createElement('h3');
        obsHeading.textContent = 'Förväntad observation';
        obsSection.appendChild(obsHeading);
        const obsContainer = document.createElement('div');
        renderMarkdownToElement(obsContainer, requirement.expectedObservation);
        obsSection.appendChild(obsContainer);
        dynamicContentArea.appendChild(obsSection);
    }

    if (Array.isArray(requirement.instructions) && requirement.instructions.length > 0) {
        const instrSection = document.createElement('div');
        instrSection.classList.add('detail-section', 'instructions-section');
        const instrHeading = document.createElement('h3');
        instrHeading.textContent = 'Instruktioner';
        instrSection.appendChild(instrHeading);

        requirement.instructions.forEach(instr => {
            const instrContainer = document.createElement('div');
            renderMarkdownToElement(instrContainer, instr.text);
            instrSection.appendChild(instrContainer);
        });

        dynamicContentArea.appendChild(instrSection);
    }
    
    const optionalSections = { examples: 'Exempel', exceptions: 'Undantag', commonErrors: 'Vanliga Fel', tips: 'Tips' };
    for (const key in optionalSections) {
        if (Object.prototype.hasOwnProperty.call(requirement, key) && requirement[key]) {
            const section = document.createElement('div');
            section.classList.add('detail-section');
            const heading = document.createElement('h3');
            heading.textContent = optionalSections[key];
            section.appendChild(heading);
            const contentContainer = document.createElement('div');
            renderMarkdownToElement(contentContainer, requirement[key]);
            section.appendChild(contentContainer);
            dynamicContentArea.appendChild(section);
        }
    }

    if (Array.isArray(requirement.checks) && requirement.checks.length > 0) {
        const checkSection = document.createElement('div');
        checkSection.classList.add('detail-section');
        const checkHeading = document.createElement('h3');
        checkHeading.textContent = 'Påståenden'; 
        checkSection.appendChild(checkHeading);
        requirement.checks.forEach((check, index) => {
            const checkItemDiv = document.createElement('div');
            checkItemDiv.classList.add('check-item');
            checkItemDiv.id = `check-${reqKey}-${index + 1}`; 

            const checkSubHeading = document.createElement('h4'); 
            checkSubHeading.textContent = `Påstående ${index + 1}`;
            checkItemDiv.appendChild(checkSubHeading);
            
            const conditionContainer = document.createElement('div');
            conditionContainer.classList.add('check-condition');
            renderMarkdownToElement(conditionContainer, getVal(check, 'condition', '<em>Påstående saknas</em>'));
            checkItemDiv.appendChild(conditionContainer);

            const passCriteriaCount = getVal(check, 'passCriteria.length', 0);
            const logic = getVal(check, 'logic', 'AND');
            if (passCriteriaCount > 1) {
                 const logicP = document.createElement('p');
                 logicP.classList.add('check-logic');
                 logicP.textContent = `(${logic === 'OR' ? 'Minst ett av följande kriterier måste vara uppfyllt:' : 'Alla följande kriterier måste vara uppfyllda:'})`;
                 checkItemDiv.appendChild(logicP);
            }

             if (passCriteriaCount > 0) {
                const ul = document.createElement('ul');
                ul.classList.add('pass-criteria-list');
                check.passCriteria.forEach(criterion => {
                    const li = document.createElement('li');
                    renderMarkdownToElement(li, getVal(criterion, 'requirement', ''));
                    ul.appendChild(li);

                    const failureTemplate = getVal(criterion, 'failureStatementTemplate');
                    if (failureTemplate) {
                        const templateBlock = document.createElement('blockquote');
                        templateBlock.className = 'failure-template-display';
                        const templateLabel = document.createElement('strong');
                        templateLabel.textContent = 'Mall för avvikelsetext:';
                        templateBlock.appendChild(templateLabel);
                        templateBlock.appendChild(document.createTextNode(' '));
                        renderMarkdownToElement(templateBlock, failureTemplate);
                        li.appendChild(templateBlock);
                    }
                });
                checkItemDiv.appendChild(ul);
            }

            const ifNoCriteria = getVal(check, 'ifNo', []);
            if (Array.isArray(ifNoCriteria) && ifNoCriteria.length > 0) {
                const noHeading = document.createElement('p');
                noHeading.textContent = 'Om ovan ej uppfylls:';
                noHeading.style.fontWeight = 'bold';
                noHeading.style.marginTop = '0.75em';
                checkItemDiv.appendChild(noHeading);

                const noUl = document.createElement('ul');
                noUl.classList.add('pass-criteria-list'); 
                ifNoCriteria.forEach(criterion => {
                    const li = document.createElement('li');
                    renderMarkdownToElement(li, getVal(criterion, 'requirement', ''));
                    noUl.appendChild(li);

                    const failureTemplate = getVal(criterion, 'failureStatementTemplate');
                    if (failureTemplate) {
                        const templateBlock = document.createElement('blockquote');
                        templateBlock.className = 'failure-template-display';
                        const templateLabel = document.createElement('strong');
                        templateLabel.textContent = 'Mall för avvikelsetext:';
                        templateBlock.appendChild(templateLabel);
                        templateBlock.appendChild(document.createTextNode(' '));
                        renderMarkdownToElement(templateBlock, failureTemplate);
                        li.appendChild(templateBlock);
                    }
                });
                checkItemDiv.appendChild(noUl);
            }
            checkSection.appendChild(checkItemDiv);
        });
        dynamicContentArea.appendChild(checkSection);
    }

    const reqContentTypes = getVal(requirement, 'contentType', []);
    const masterContentTypes = getVal(state.jsonData, 'metadata.contentTypes', []);
    if (Array.isArray(reqContentTypes) && reqContentTypes.length > 0 && Array.isArray(masterContentTypes) && masterContentTypes.length > 0) {
        const ctSection = document.createElement('div');
        ctSection.classList.add('detail-section');
        const ctHeading = document.createElement('h3');
        ctHeading.textContent = 'Relevanta Innehållstyper';
        ctSection.appendChild(ctHeading);

        const ctUL = document.createElement('ul');
        ctUL.style.listStyle = 'disc';

        const masterTypesMap = masterContentTypes.reduce((acc, type) => {
            if (type && type.id) {
                acc[type.id] = type.text || type.id;
            }
            return acc;
        }, {});

        let validTypesFound = false;
        reqContentTypes.forEach(ctId => {
            if (masterTypesMap[ctId]) {
                const li = document.createElement('li');
                li.textContent = escapeHtml(masterTypesMap[ctId]);
                ctUL.appendChild(li);
                validTypesFound = true;
            } else {
                console.warn(`[Warn] displayRequirementDetail: Content type ID "${ctId}" i krav "${reqKey}" hittades inte i metadata.contentTypes.`);
            }
        });

        if (validTypesFound) {
            ctSection.appendChild(ctUL);
            dynamicContentArea.appendChild(ctSection);
        } else {
             ctHeading.remove(); 
             ctSection.remove();
        }
    }

    const metaSection = document.createElement('div');
    metaSection.classList.add('detail-section', 'metadata-info');
    const catInfo = document.createElement('p');
    catInfo.classList.add('category-info');
    const mainCatText = getVal(requirement, 'metadata.mainCategory.text', getVal(requirement, 'metadata.mainCategory', 'Okänd'));
    const subCatText = getVal(requirement, 'metadata.subCategory.text', getVal(requirement, 'metadata.subCategory', ''));
    catInfo.innerHTML = `<strong>Kategori:</strong> ${escapeHtml(mainCatText)}${subCatText ? ` / ${escapeHtml(subCatText)}` : ''}`;
    metaSection.appendChild(catInfo);
    if (requirement.metadata?.impact) {
        const impact = requirement.metadata.impact;
        const impactP = document.createElement('p');
        impactP.classList.add('impact-info');
        let impactText = `<strong>Påverkan:</strong> ${impact.isCritical ? 'Kritisk' : 'Icke-kritisk'}`;
        const primaryScore = impact.primaryScore ?? 0;
        const secondaryScore = impact.secondaryScore ?? 0;
        impactText += ` (Poäng: ${primaryScore}.${secondaryScore}, `;
        const assumedCompliance = impact.assumedCompliance ?? false; 
        impactText += `Antagen efterlevnad: ${assumedCompliance ? 'Ja' : 'Nej'})`;
        impactP.innerHTML = impactText;
        metaSection.appendChild(impactP);
    }
    dynamicContentArea.appendChild(metaSection);

    const backButton = document.createElement('button');
    backButton.id = 'backButton';
    backButton.innerHTML = `Tillbaka till listan <span class="icon" aria-hidden="true">${ICONS.back}</span>`;
    backButton.addEventListener('click', () => { displayRequirements(); });
    dynamicContentArea.appendChild(backButton);

    setTimeout(() => title.focus({ preventScroll: false }), 50);
}



export function renderRequirementForm(reqKey) {
    const isEditing = reqKey !== null && state.jsonData?.requirements?.[reqKey];
    const requirement = isEditing ? state.jsonData.requirements[reqKey] : {};
    const formTitle = isEditing ? `Redigera krav` : 'Lägg till nytt krav';

    if (isEditing) {
        state.setState('currentRequirementKey', reqKey);
    } else {
        state.setState('currentRequirementKey', null);
    }

    setupContentArea(true, false);
    if (!dynamicContentArea) return;
    dynamicContentArea.classList.add('form-container');

    const form = document.createElement('form');
    form.id = isEditing ? `requirementForm-${reqKey}` : 'requirementForm-new';
    form.noValidate = true;
    form.addEventListener('submit', (event) => saveRequirement(event, reqKey));

    const heading = document.createElement('h2');
    heading.textContent = isEditing ? `${formTitle}: ${escapeHtml(requirement.title || reqKey)}` : formTitle;
    form.appendChild(heading);

    form.appendChild(createFormField('Kravets rubrik*', 'title', requirement.title || '', 'text'));

    const stdRefFieldset = document.createElement('fieldset');
    const stdRefLegend = document.createElement('legend');
    stdRefLegend.textContent = 'Standardreferens';
    let refText = ''; let refUrl = '';
    if (typeof requirement.standardReference === 'object' && requirement.standardReference !== null) {
        refText = getVal(requirement.standardReference, 'text', '');
        refUrl = getVal(requirement.standardReference, 'url', '');
    } else if (typeof requirement.standardReference === 'string') {
        refText = requirement.standardReference;
    }
    stdRefFieldset.appendChild(createFormField('Referens till dokumentation', 'standardReference.text', refText, 'text', 'Ange en tydlig referens, t.ex. "SFS 2018:1937 – 9 §" eller "Intern Riktlinje 2.4".'));
    stdRefFieldset.appendChild(createFormField('Direktlänk till referens', 'standardReference.url', refUrl, 'url', 'Klistra in en webbadress till källan, t.ex. https://organisation.se/policy#sektion-3.1'));
    form.appendChild(stdRefFieldset);
    
    const instrFieldset = document.createElement('fieldset');
    const instrLegend = document.createElement('legend');
    instrLegend.textContent = 'Instruktioner';
    instrFieldset.appendChild(instrLegend);
    const instrList = document.createElement('ol');
    instrList.id = 'instructionList';
    instrList.classList.add('dynamic-list');
    
    const instructions = Array.isArray(requirement.instructions) ? requirement.instructions : [];
    instructions.forEach((instr, index) => {
        const instructionText = getVal(instr, 'text', '');
        const listItem = createInstructionListItem(instructionText, index);
        const textareaInItem = listItem.querySelector('textarea');
        if (textareaInItem && !textareaInItem.dataset.autoResizeAttached) {
            textareaInItem.addEventListener('input', () => autoResizeTextarea(textareaInItem));
            textareaInItem.dataset.autoResizeAttached = 'true';
        }
        instrList.appendChild(listItem);
    });
    instrFieldset.appendChild(instrList);

    const obsFieldContainer = createFormField('Förväntad observation', 'expectedObservation', requirement.expectedObservation || '', 'textarea', 'Text som beskriver vad som förväntas observeras vid granskning.');
    const obsTextarea = obsFieldContainer.querySelector('textarea');
    if(obsTextarea && !obsTextarea.dataset.autoResizeAttached) {
        obsTextarea.addEventListener('input', () => autoResizeTextarea(obsTextarea));
        obsTextarea.dataset.autoResizeAttached = 'true';
    }
    form.appendChild(obsFieldContainer);

    form.appendChild(instrFieldset);

    const optionalTextFields = {
        examples: 'Exempel',
        exceptions: 'Undantag',
        commonErrors: 'Vanliga fel', 
        tips: 'Tips och goda råd'
    };

    for (const [jsonKey, readableLabel] of Object.entries(optionalTextFields)) {
        const instruction = `Beskriv ${readableLabel.toLowerCase()} här om det finns några.`;
        const fieldContainer = createFormField(readableLabel, jsonKey, requirement[jsonKey] || '', 'textarea', instruction);
        const textarea = fieldContainer.querySelector('textarea');
        if (textarea && !textarea.dataset.autoResizeAttached) {
            textarea.addEventListener('input', () => autoResizeTextarea(textarea));
            textarea.dataset.autoResizeAttached = 'true';
        }
        form.appendChild(fieldContainer);
    }

    const checksFieldset = document.createElement('fieldset');
    const checksLegend = document.createElement('legend');
    checksLegend.textContent = 'Påståenden';
    checksFieldset.appendChild(checksLegend);
    const checksContainer = document.createElement('div');
    checksContainer.id = 'checksContainer';
    checksContainer.classList.add('checks-container');
    
    const checks = Array.isArray(requirement.checks) ? requirement.checks : [];
    checks.forEach((check, index) => {
        const checkFieldsetElement = createCheckFieldset(check, index);
        checkFieldsetElement.querySelectorAll('textarea').forEach(ta => {
            if(!ta.dataset.autoResizeAttached) {
                ta.addEventListener('input', () => autoResizeTextarea(ta));
                ta.dataset.autoResizeAttached = 'true';
            }
        });
        checksContainer.appendChild(checkFieldsetElement);
    });
    checksFieldset.appendChild(checksContainer);
    const addCheckButton = createDynamicListButton('Lägg till påstående', () => {
        const container = document.getElementById('checksContainer');
        if (container) {
            const newCheckFieldset = createCheckFieldset({}, container.children.length);
            newCheckFieldset.querySelectorAll('textarea').forEach(ta => {
                if(!ta.dataset.autoResizeAttached) {
                    ta.addEventListener('input', () => autoResizeTextarea(ta));
                    ta.dataset.autoResizeAttached = 'true';
                }
                autoResizeTextarea(ta);
            });
            container.appendChild(newCheckFieldset);
            updateAllCheckpointDOMIndices(container);
            updateMoveButtonsState(container);
        }
    });
    checksFieldset.appendChild(addCheckButton);
    form.appendChild(checksFieldset);

    if (checksContainer.children.length > 0) {
        updateAllCheckpointDOMIndices(checksContainer);
        updateMoveButtonsState(checksContainer);
    }
    
    const masterContentTypes = getVal(state.jsonData, 'metadata.contentTypes', []);
    if (Array.isArray(masterContentTypes) && masterContentTypes.length > 0) {
        const ctSection = document.createElement('div');
        ctSection.className = 'content-type-selection-section';

        const h2 = document.createElement('h2');
        h2.textContent = 'Relevanta Innehållstyper';
        ctSection.appendChild(h2);

        const currentTypes = getVal(requirement, 'contentType', []);

        masterContentTypes.forEach(mainCategory => {
            if (mainCategory && mainCategory.text && Array.isArray(mainCategory.types) && mainCategory.types.length > 0) {
                const h3 = document.createElement('h3');
                h3.textContent = mainCategory.text;
                ctSection.appendChild(h3);

                const typesContainer = document.createElement('div');
                typesContainer.className = 'content-type-checkbox-group';

                mainCategory.types.forEach(subType => {
                    if (subType && subType.id) {
                        const isChecked = currentTypes.includes(subType.id);
                        const checkboxField = createFormField(subType.text || subType.id, 'contentType', subType.id, 'checkbox');
                        const checkboxInput = checkboxField.querySelector('input[type="checkbox"]');
                        if (checkboxInput) {
                            checkboxInput.checked = isChecked;
                        }
                        typesContainer.appendChild(checkboxField);
                    }
                });
                ctSection.appendChild(typesContainer);
            }
        });
        form.appendChild(ctSection);
    }

    // --- MODIFIED BLOCK STARTS HERE ---
    const metaSection = document.createElement('div');
    metaSection.className = 'form-section';

    const metaH2 = document.createElement('h2');
    metaH2.textContent = 'Kategorisering & Påverkan';
    metaSection.appendChild(metaH2);

    const metaFieldset = document.createElement('fieldset');
    const metaLegend = document.createElement('legend');
    metaLegend.textContent = 'Kategorisering och Påverkan'; // For screen readers
    metaLegend.classList.add('visually-hidden');
    metaFieldset.appendChild(metaLegend);
    
    const { mainCategories, subCategories } = extractCategories(state.jsonData?.requirements || {});
    const currentMainCatText = getVal(requirement, 'metadata.mainCategory.text', getVal(requirement, 'metadata.mainCategory', ''));
    const currentSubCatText = getVal(requirement, 'metadata.subCategory.text', getVal(requirement, 'metadata.subCategory', ''));
    
    if (mainCategories.length > 0) {
        metaFieldset.appendChild(createCategorySelect('Huvudkategori*', 'metadata.mainCategory.text', mainCategories, currentMainCatText, false));
    } else {
        metaFieldset.appendChild(createFormField('Huvudkategori*', 'metadata.mainCategory.text', currentMainCatText, 'text', 'Ange en huvudkategori för kravet, t.ex. "Navigering" eller "Formulär".'));
    }
    if (subCategories.length > 0) {
        metaFieldset.appendChild(createCategorySelect('Underkategori (valfri)', 'metadata.subCategory.text', subCategories, currentSubCatText, true));
    } else {
        metaFieldset.appendChild(createFormField('Underkategori (valfri)', 'metadata.subCategory.text', currentSubCatText, 'text', 'Ange en eventuell underkategori för finare gruppering.'));
    }

    const impactFieldset = document.createElement('fieldset');
    const impactLegend = document.createElement('legend');
    impactLegend.textContent = 'Påverkan (Impact)';
    impactFieldset.appendChild(impactLegend);
    const impactData = getVal(requirement, 'metadata.impact', {});
    impactFieldset.appendChild(createFormField('Kritisk?', 'metadata.impact.isCritical', impactData.isCritical || false, 'checkbox', 'Markera om kravet anses vara kritiskt för tillgängligheten.'));
    impactFieldset.appendChild(createFormField('Primär poäng', 'metadata.impact.primaryScore', impactData.primaryScore ?? 0, 'number', 'Ange en siffra, t.ex. 0-5.'));
    impactFieldset.appendChild(createFormField('Sekundär poäng', 'metadata.impact.secondaryScore', impactData.secondaryScore ?? 0, 'number', 'Ange en siffra, t.ex. 0-9.'));
    const defaultAssumedCompliance = impactData.assumedCompliance ?? false;
    impactFieldset.appendChild(createFormField('Just nu gissar vi bara att detta är korrekt.', 'metadata.impact.assumedCompliance', defaultAssumedCompliance, 'checkbox', 'Markera om det normalt antas att detta krav efterlevs.'));
    metaFieldset.appendChild(impactFieldset);
    
    metaSection.appendChild(metaFieldset);
    form.appendChild(metaSection);
    // --- MODIFIED BLOCK ENDS HERE ---

    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');
    const saveButtonElement = document.createElement('button');
    saveButtonElement.type = 'submit';
    saveButtonElement.innerHTML = `Spara ${isEditing ? 'ändringar' : 'nytt krav'} <span class="icon" aria-hidden="true">${ICONS.save}</span>`;
    buttonDiv.appendChild(saveButtonElement);
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.innerHTML = `Avbryt <span class="icon" aria-hidden="true">${ICONS.cancel}</span>`;
    cancelButton.addEventListener('click', () => {
        if (isEditing) {
            state.setState('lastFocusedReqKey', reqKey);
            displayRequirementDetail(reqKey);
        } else {
            state.setState('lastFocusedReqKey', null);
            displayRequirements();
        }
    });
    buttonDiv.appendChild(cancelButton);
    form.appendChild(buttonDiv);
    dynamicContentArea.appendChild(form);

    setTimeout(() => {
        requestAnimationFrame(() => {
            const allTextareasInForm = form.querySelectorAll('textarea');
            allTextareasInForm.forEach(ta => {
                if (!ta.dataset.autoResizeAttached) {
                    ta.addEventListener('input', () => autoResizeTextarea(ta));
                    ta.dataset.autoResizeAttached = 'true';
                }
                autoResizeTextarea(ta);
                setTimeout(() => autoResizeTextarea(ta), 50);
            });
        });
    }, 50);

    const titleInput = form.elements['title'];
    if (titleInput) {
        setTimeout(() => titleInput.focus(), 100);
    }
}

function saveRequirement(event, reqKey) {
    event.preventDefault();
    const form = event.target;
    if (!form) { return; }
    if (!state.jsonData) { return; }
    if (!state.jsonData.requirements) state.jsonData.requirements = {};

    const isEditing = reqKey !== null && state.jsonData.requirements?.[reqKey];
    const originalRequirement = isEditing ? { ...state.jsonData.requirements[reqKey] } : {};
    const originalRequirementString = isEditing ? JSON.stringify(state.jsonData.requirements[reqKey]) : null;

    try {
        const titleElement = form.elements['title'];
        const titleValue = titleElement?.value.trim();
        const mainCategoryElement = form.elements['metadata.mainCategory.text'];
        const mainCategoryValue = mainCategoryElement?.value.trim();

        let errors = [];
        if (!titleValue) errors.push("Kravets rubrik är obligatorisk.");
        if (!mainCategoryValue) errors.push("Huvudkategori är obligatorisk.");
        
        const checkFieldsetsForValidation = form.querySelectorAll('#checksContainer .check-fieldset');
        checkFieldsetsForValidation.forEach((fieldset, checkIndex) => {
            const conditionTextarea = fieldset.querySelector('textarea[name="condition"]');
            if (conditionTextarea && !conditionTextarea.value.trim()) {
                errors.push(`Påstående ${checkIndex + 1} saknar text.`);
            }
        });

        if (errors.length > 0) {
            alert("Formuläret innehåller fel:\n- " + errors.join("\n- "));
            if (!titleValue) titleElement?.focus();
            else if (!mainCategoryValue) mainCategoryElement?.focus();
            else { 
                const firstErrorCheck = Array.from(checkFieldsetsForValidation).find((fs) => {
                    const ta = fs.querySelector('textarea[name="condition"]');
                    return ta && !ta.value.trim();
                });
                firstErrorCheck?.querySelector('textarea')?.focus();
            }
            return;
        }

        let generatedUuid;
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            generatedUuid = crypto.randomUUID();
        } else {
            generatedUuid = generateSimpleUUID();
        }

        const newId = isEditing ? (originalRequirement.id || generatedUuid) : generatedUuid;
        const currentReqKey = isEditing ? reqKey : generateRequirementKey(titleValue, newId);

        const selectedContentTypes = [];
        const contentTypeCheckboxes = form.querySelectorAll('input[name="contentType"]:checked');
        contentTypeCheckboxes.forEach(checkbox => {
            selectedContentTypes.push(checkbox.value);
        });

        const updatedRequirement = {
            id: newId,
            key: currentReqKey, 
            title: titleValue,
            metadata: {
                mainCategory: getCategoryValue(form, 'metadata.mainCategory.text'),
                subCategory: getCategoryValue(form, 'metadata.subCategory.text'),
                impact: {
                    isCritical: form.elements['metadata.impact.isCritical']?.checked || false,
                    primaryScore: parseInt(form.elements['metadata.impact.primaryScore']?.value, 10) || 0,
                    secondaryScore: parseInt(form.elements['metadata.impact.secondaryScore']?.value, 10) || 0,
                    assumedCompliance: form.elements['metadata.impact.assumedCompliance']?.checked ?? false
                }
            },
            standardReference: {
                text: form.elements['standardReference.text']?.value.trim() || '',
                url: form.elements['standardReference.url']?.value.trim() || ''
            },
            exceptions: form.elements['exceptions']?.value.trim() || '',
            examples: form.elements['examples']?.value.trim() || '',
            tips: form.elements['tips']?.value.trim() || '',
            commonErrors: form.elements['commonErrors']?.value.trim() || '',
            expectedObservation: form.elements['expectedObservation']?.value.trim() || '',
            instructions: [],
            checks: [],
            contentType: selectedContentTypes
        };

        if (typeof updatedRequirement.metadata.subCategory === 'object' && !updatedRequirement.metadata.subCategory?.text) {
            updatedRequirement.metadata.subCategory = ""; 
        }
        if (typeof updatedRequirement.standardReference === 'object' && !updatedRequirement.standardReference?.text && !updatedRequirement.standardReference?.url) {
             updatedRequirement.standardReference = ""; 
        }

        const instructionTextareas = form.querySelectorAll('#instructionList .instruction-item textarea');
        instructionTextareas.forEach((textarea, index) => {
            const text = textarea.value.trim();
            if (text) updatedRequirement.instructions.push({ id: (index + 1).toString(), text: text });
        });

        const checkFieldsets = form.querySelectorAll('#checksContainer > .check-fieldset');
        checkFieldsets.forEach((fieldset, checkIndex) => { 
            const condition = fieldset.querySelector('textarea[name="condition"]')?.value.trim();
            if (!condition) return;
            
            const check = {
                id: (checkIndex + 1).toString(), 
                condition: condition,
                logic: fieldset.querySelector('select[name="logic"]')?.value || 'AND',
                passCriteria: [],
                ifNo: []
            };

            const passCritListItems = fieldset.querySelectorAll('.pass-criteria-list li.dynamic-list-item');
            passCritListItems.forEach((li, critIndex) => {
                const reqText = li.querySelector('textarea[name="requirement"]')?.value.trim();
                const failText = li.querySelector('textarea[name="failureStatementTemplate"]')?.value.trim() || '';
                if (reqText) {
                    check.passCriteria.push({
                        id: `${check.id}.${critIndex + 1}`,
                        requirement: reqText,
                        failureStatementTemplate: failText
                    });
                }
            });
            
            const ifNoCritListItems = fieldset.querySelectorAll('.if-no-criteria-list li.dynamic-list-item');
            ifNoCritListItems.forEach((li, critIndex) => {
                const reqText = li.querySelector('textarea[name="requirement"]')?.value.trim();
                const failText = li.querySelector('textarea[name="failureStatementTemplate"]')?.value.trim() || '';
                if (reqText) {
                    check.ifNo.push({
                        id: `${check.id}.no.${critIndex + 1}`,
                        requirement: reqText,
                        failureStatementTemplate: failText
                    });
                }
            });
            
            updatedRequirement.checks.push(check);
        });

        const updatedRequirementString = JSON.stringify(updatedRequirement);
        let changed = !isEditing || (originalRequirementString !== updatedRequirementString);

        if (isEditing && reqKey !== currentReqKey) {
            delete state.jsonData.requirements[reqKey]; 
            changed = true; 
        }

        if (changed) {
            state.jsonData.requirements[currentReqKey] = updatedRequirement;
            state.setState('isDataModified', true);
            updateSaveButtonsState();
            state.setState('lastFocusedReqKey', currentReqKey);
            displayRequirementDetail(currentReqKey); 
            const targetArea = document.getElementById('dynamicContentArea');
            if (targetArea) {
                 const actionText = isEditing ? 'uppdaterat' : 'tillagt';
                 displayConfirmation(`Kravet "${escapeHtml(updatedRequirement.title)}" har ${actionText}. Glöm inte spara filen.`, 'save', targetArea);
            }
        } else {
             if (isEditing) {
                state.setState('lastFocusedReqKey', reqKey);
                 displayRequirementDetail(reqKey); 
            } else {
                 displayRequirements(); 
            }
        }
    } catch (error) {
        console.error("[Error] saveRequirement: Fel vid spara av krav:", error);
        showError(`Kunde inte spara kravet. Se konsolen för detaljer. Fel: ${escapeHtml(error.message)}`, dynamicContentArea);
    }
}


function extractCategories(requirements) {
    const mainCategoriesSet = new Set();
    const subCategoriesSet = new Set();
    if (requirements && typeof requirements === 'object') {
        Object.values(requirements).forEach(req => {
            if (req?.metadata) {
                const mainCat = getVal(req, 'metadata.mainCategory.text', getVal(req, 'metadata.mainCategory'));
                const subCat = getVal(req, 'metadata.subCategory.text', getVal(req, 'metadata.subCategory'));
                if (mainCat && typeof mainCat === 'string' && mainCat.trim()) mainCategoriesSet.add(mainCat.trim());
                if (subCat && typeof subCat === 'string' && subCat.trim()) subCategoriesSet.add(subCat.trim());
            }
        });
    }
    return {
        mainCategories: Array.from(mainCategoriesSet).sort((a, b) => a.localeCompare(b, 'sv')),
        subCategories: Array.from(subCategoriesSet).sort((a, b) => a.localeCompare(b, 'sv'))
    };
}

function createCategorySelect(labelText, name, categories, selectedValue, allowEmpty = false) {
    const container = createFormField(labelText, name, '', 'select', 
        allowEmpty ? 'Välj en underkategori om tillämpligt, annars lämna som "-- Ingen --".' : 'Välj en huvudkategori från listan, eller skriv en ny om den saknas.'
    );
    const select = document.createElement('select');
    const inputId = container.querySelector('label')?.htmlFor || `select-${name.replace('.', '-')}`;
    select.id = inputId;
    select.name = name;
    select.required = !allowEmpty;

    if (allowEmpty) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Ingen --';
        if (!selectedValue) emptyOption.selected = true;
        select.appendChild(emptyOption);
    } else {
         const promptOption = document.createElement('option');
         promptOption.value = '';
         promptOption.textContent = '-- Välj kategori --';
         if (!selectedValue) {
            promptOption.selected = true;
            promptOption.disabled = true;
         }
         select.appendChild(promptOption);
    }

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === selectedValue) {
            option.selected = true;
            if (!allowEmpty && select.options[0]?.disabled) {
                 select.options[0].selected = false; 
            }
        }
        select.appendChild(option);
    });
    container.appendChild(select);
    return container;
}

function getCategoryValue(form, name) {
    const element = form.elements[name];
    const textValue = element ? element.value.trim() : '';
    if (textValue) {
        return { text: textValue, key: generateKeyFromName(textValue) || "" };
    }
    return ""; 
}

export function confirmDeleteRequirement(reqKey) {
    const requirement = state.jsonData?.requirements?.[reqKey];
    if (!requirement) {
        showError(`Kan inte radera: Krav med nyckel ${escapeHtml(reqKey)} hittades inte.`, dynamicContentArea);
        displayRequirements();
        return;
    }

    displayConfirmationModal({
        title: 'Radera krav?',
        message: `Är du säker på att du vill radera kravet: <strong>${escapeHtml(requirement.title || reqKey)}</strong>?<br>Åtgärden kan inte ångras.`,
        confirmText: 'Ja, radera kravet',
        onConfirm: () => deleteRequirement(reqKey)
    });
}

function deleteRequirement(reqKeyToDelete) {
    const requirement = state.jsonData?.requirements?.[reqKeyToDelete];
    if (!requirement) {
        showError(`Kan inte radera: Krav med nyckel ${escapeHtml(reqKeyToDelete)} hittades inte.`);
        displayRequirements();
        return;
    }
    const deletedTitle = requirement.title || reqKeyToDelete;
    delete state.jsonData.requirements[reqKeyToDelete];
    state.setState('isDataModified', true);
    updateSaveButtonsState();
    state.setState('currentRequirementKey', null);
    state.setState('lastFocusedReqKey', null); 
    displayRequirements(); 
    const targetArea = document.getElementById('dynamicContentArea');
    if (targetArea) {
         displayConfirmation(`Kravet "${escapeHtml(deletedTitle)}" har raderats. Glöm inte spara filen.`, 'delete', targetArea);
    }
}

export function manageContentTypeAssociations(contentTypeId, contentTypeName) {
    if (!state.jsonData || !state.jsonData.requirements) {
        showError("Kravdata saknas.", dynamicContentArea);
        return;
    }

    state.setState('currentView', 'manageContentTypeAssociations');
    state.setState('lastFocusedReqKey', null);

    setupContentArea(true, false);
    if (!dynamicContentArea) return;
    dynamicContentArea.classList.add('manage-ct-associations-view');

    const heading = document.createElement('h2');
    heading.textContent = `Hantera kopplingar för: "${escapeHtml(contentTypeName)}" (ID: ${contentTypeId})`;
    dynamicContentArea.appendChild(heading);

    const instructionP = document.createElement('p');
    instructionP.innerHTML = `Markera de krav som ska vara kopplade till innehållstypen <strong>${escapeHtml(contentTypeName)}</strong>. Dina ändringar här sparas först när du klickar på knappen "Spara ändringar för denna innehållstyp" längst ner. <strong>Att klicka på "Visa"-knappen bredvid ett krav sparar också det aktuella läget för alla kryssrutor på denna sida.</strong>`;
    dynamicContentArea.appendChild(instructionP);

    const filterContainer = document.createElement('div');
    filterContainer.classList.add('ct-association-filter');
    const filterLabel = document.createElement('label');
    filterLabel.htmlFor = 'ctAssocFilterSelect';
    filterLabel.textContent = 'Visa krav: ';
    const filterSelect = document.createElement('select');
    filterSelect.id = 'ctAssocFilterSelect';
    filterSelect.innerHTML = `
        <option value="all">Alla krav</option>
        <option value="associated">Endast kopplade krav</option>
    `;
    filterContainer.appendChild(filterLabel);
    filterContainer.appendChild(filterSelect);
    dynamicContentArea.appendChild(filterContainer);

    const listContainer = document.createElement('div');
    listContainer.id = 'ctAssocListContainer';
    dynamicContentArea.appendChild(listContainer);

    let tempAssociations = {}; 
    let isDataModifiedInView = false; 

    const saveCurrentCheckboxState = () => {
        let actualChangesMadeToGlobalState = false;
        for (const reqKey in tempAssociations) {
            const requirement = state.jsonData.requirements[reqKey];
            if (!requirement) continue;

            const shouldBeAssociated = tempAssociations[reqKey];
            const isCurrentlyAssociated = requirement.contentType && requirement.contentType.includes(contentTypeId);

            if (shouldBeAssociated && !isCurrentlyAssociated) {
                if (!requirement.contentType) requirement.contentType = [];
                requirement.contentType.push(contentTypeId);
                actualChangesMadeToGlobalState = true;
            } else if (!shouldBeAssociated && isCurrentlyAssociated) {
                const index = requirement.contentType.indexOf(contentTypeId);
                if (index > -1) {
                    requirement.contentType.splice(index, 1);
                    actualChangesMadeToGlobalState = true;
                }
            }
        }
        if (actualChangesMadeToGlobalState) {
            state.setState('isDataModified', true);
            updateSaveButtonsState();
            isDataModifiedInView = false; 
            const saveBtn = dynamicContentArea.querySelector('.save-ct-view-changes-button');
            if (saveBtn) saveBtn.disabled = true; 
            return true;
        }
        return false;
    };

    const renderFilteredList = () => {
        listContainer.innerHTML = ''; 

        Object.values(state.jsonData.requirements).forEach(req => {
            const reqKey = req.key || generateRequirementKey(req.title, req.id); 
            if (!req.key) req.key = reqKey; 
            if (!(reqKey in tempAssociations)) { 
                 tempAssociations[reqKey] = req.contentType && req.contentType.includes(contentTypeId);
            }
        });

        const requirementsArray = Object.values(state.jsonData.requirements).map(value => {
            if (!value.key) value.key = generateRequirementKey(value.title, value.id); 
            return value;
        });

        const currentFilter = filterSelect.value;
        let displayRequirementsArray = requirementsArray;

        if (currentFilter === 'associated') {
            displayRequirementsArray = requirementsArray.filter(req => tempAssociations[req.key] === true);
        }

        displayRequirementsArray.sort((a, b) => {
            const mainCatA = getVal(a, 'metadata.mainCategory.text', getVal(a, 'metadata.mainCategory', 'ÖÖÖ')).trim();
            const mainCatB = getVal(b, 'metadata.mainCategory.text', getVal(b, 'metadata.mainCategory', 'ÖÖÖ')).trim();
            if (mainCatA.localeCompare(mainCatB, 'sv') !== 0) return mainCatA.localeCompare(mainCatB, 'sv');

            const subCatA = getVal(a, 'metadata.subCategory.text', getVal(a, 'metadata.subCategory', 'ööö')).trim();
            const subCatB = getVal(b, 'metadata.subCategory.text', getVal(b, 'metadata.subCategory', 'ööö')).trim();
            if (subCatA.localeCompare(subCatB, 'sv') !== 0) return subCatA.localeCompare(subCatB, 'sv');

            const titleA = getVal(a, 'title', a.key || '');
            const titleB = getVal(b, 'title', b.key || '');
            return titleA.localeCompare(titleB, 'sv');
        });

        const grouped = {};
        displayRequirementsArray.forEach(req => {
            const mainCatText = getVal(req, 'metadata.mainCategory.text', getVal(req, 'metadata.mainCategory', 'Okategoriserad')).trim();
            const subCatText = getVal(req, 'metadata.subCategory.text', getVal(req, 'metadata.subCategory', '')).trim();
            if (!grouped[mainCatText]) grouped[mainCatText] = {};
            if (!grouped[mainCatText][subCatText]) grouped[mainCatText][subCatText] = [];
            grouped[mainCatText][subCatText].push(req);
        });

        const sortedMainCategories = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'sv'));

        if (displayRequirementsArray.length === 0) {
            listContainer.appendChild(document.createElement('p')).textContent =
                currentFilter === 'associated' ? `Inga krav är för närvarande kopplade (och markerade) för "${escapeHtml(contentTypeName)}".` : 'Inga krav finns att visa med nuvarande filter.';
        }

        sortedMainCategories.forEach(mainCategory => {
            const mainCatHeading = document.createElement('h3');
            mainCatHeading.id = `maincat-assoc-${generateKeyFromName(mainCategory)}`;
            mainCatHeading.textContent = mainCategory;
            listContainer.appendChild(mainCatHeading);

            const categoryContent = grouped[mainCategory];
            const sortedSubCategories = Object.keys(categoryContent).sort((a, b) => a.localeCompare(b, 'sv'));

            sortedSubCategories.forEach(subCategory => {
                const reqListForSub = categoryContent[subCategory];
                let subCatHeadingElement = null;
                if (subCategory !== '') {
                    subCatHeadingElement = document.createElement('h4');
                    subCatHeadingElement.id = `subcat-assoc-${generateKeyFromName(subCategory)}`;
                    subCatHeadingElement.textContent = subCategory;
                    listContainer.appendChild(subCatHeadingElement);
                }

                const ul = document.createElement('ul');
                ul.classList.add('requirement-list', 'manage-ct-assoc-list');
                ul.setAttribute('aria-labelledby', subCatHeadingElement ? subCatHeadingElement.id : mainCatHeading.id);
                listContainer.appendChild(ul);

                reqListForSub.forEach(req => {
                    renderAssociationListItem(ul, req, contentTypeId, tempAssociations,
                        () => { 
                            isDataModifiedInView = true;
                            const saveBtn = dynamicContentArea.querySelector('.save-ct-view-changes-button');
                            if (saveBtn) saveBtn.disabled = false;
                        },
                        saveCurrentCheckboxState 
                    );
                });
            });
        });
    };

    filterSelect.addEventListener('change', renderFilteredList);
    renderFilteredList(); 

    const buttonDiv = dynamicContentArea.querySelector('.manage-ct-view-buttons') || document.createElement('div');
    buttonDiv.innerHTML = ''; 
    buttonDiv.classList.add('form-buttons', 'manage-ct-view-buttons'); 

    const saveViewChangesButton = document.createElement('button');
    saveViewChangesButton.type = 'button';
    saveViewChangesButton.classList.add('save-ct-view-changes-button');
    saveViewChangesButton.innerHTML = `Spara ändringar för denna innehållstyp <span class="icon" aria-hidden="true">${ICONS.save}</span>`;
    saveViewChangesButton.disabled = !isDataModifiedInView; 

    saveViewChangesButton.addEventListener('click', () => {
        const changesMade = saveCurrentCheckboxState(); 
        if (changesMade) {
            displayConfirmation(`Ändringar för innehållstyp "${escapeHtml(contentTypeName)}" har sparats i datan. Glöm inte att ladda ner JSON-filen.`, 'save', dynamicContentArea);
        } else {
            displayConfirmation(`Inga ändringar att spara för innehållstyp "${escapeHtml(contentTypeName)}".`, 'info', dynamicContentArea);
        }
    });
    buttonDiv.appendChild(saveViewChangesButton);

    const backToMetaButton = document.createElement('button');
    backToMetaButton.type = 'button';
    backToMetaButton.innerHTML = `Tillbaka till Metadata <span class="icon" aria-hidden="true">${ICONS.back}</span>`;
    backToMetaButton.addEventListener('click', () => {
        renderMetadataForm('contentTypes');
    });
    buttonDiv.appendChild(backToMetaButton);

    if (!dynamicContentArea.contains(buttonDiv)) {
        dynamicContentArea.appendChild(buttonDiv);
    }
}

function renderAssociationListItem(ulElement, req, contentTypeId, tempAssociations, onCheckboxChangeCallback, saveCheckboxStateCallback) {
    const reqKey = req.key; 
    if (!reqKey) {
        console.error("[Error] renderAssociationListItem: Requirement missing key:", req);
        return;
    }
    const li = document.createElement('li');
    li.classList.add('requirement-item'); 
    li.dataset.reqKey = reqKey;

    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('checkbox-container');

    const checkboxId = `mng-ct-${reqKey.replace(/[\.\s]/g, '-')}-${contentTypeId.replace(/[\.\s]/g, '-')}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.checked = tempAssociations[reqKey] === true; 
    checkbox.dataset.reqKey = reqKey;

    checkbox.addEventListener('change', (e) => {
        tempAssociations[e.target.dataset.reqKey] = e.target.checked;
        if (onCheckboxChangeCallback) {
            onCheckboxChangeCallback();
        }
    });

    const label = document.createElement('label');
    label.htmlFor = checkboxId;
    label.style.cursor = 'pointer';
    label.style.display = 'inline-block'; 
    label.style.marginLeft = '0.5em'; 

    const reqTextDiv = document.createElement('span');
    reqTextDiv.classList.add('requirement-text-brief'); 
    const refStrong = document.createElement('strong');
    refStrong.textContent = escapeHtml(getVal(req, 'standardReference.text', req.id || reqKey || 'REF?'));
    reqTextDiv.appendChild(refStrong);
    reqTextDiv.appendChild(document.createTextNode(`: ${escapeHtml(req.title || 'TITEL?')}`));

    label.appendChild(reqTextDiv);

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    li.appendChild(checkboxContainer);

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('requirement-actions', 'ct-assoc-actions');

    const viewButton = document.createElement('button');
    viewButton.classList.add('req-view-button', 'ct-assoc-view-button'); 
    viewButton.innerHTML = `Visa <span class="icon" aria-hidden="true">${ICONS.view}</span>`;
    viewButton.setAttribute('aria-label', `Visa detaljer för ${escapeHtml(req.title || 'Okänt krav')}`);
    viewButton.dataset.reqKey = reqKey;
    viewButton.addEventListener('click', () => {
        if (saveCheckboxStateCallback) {
            saveCheckboxStateCallback(); 
        }
        displayRequirementDetail(reqKey);
    });
    actionsDiv.appendChild(viewButton);
    li.appendChild(actionsDiv);

    ulElement.appendChild(li);
}

export function displayRequirementsWithoutContentTypes() {
    if (!state.jsonData || !state.jsonData.requirements) {
        showError("Kravdata saknas.", dynamicContentArea);
        return;
    }

    state.setState('currentView', 'requirementsWithoutContentTypes');
    state.setState('lastFocusedReqKey', null);

    setupContentArea(true, false); 
    if (!dynamicContentArea) return;
    dynamicContentArea.classList.add('reqs-no-ct-view'); 

    const heading = document.createElement('h2');
    heading.textContent = 'Krav utan kopplade innehållstyper';
    dynamicContentArea.appendChild(heading);

    const filteredRequirements = Object.values(state.jsonData.requirements).filter(req => {
        return !req.contentType || (Array.isArray(req.contentType) && req.contentType.length === 0);
    }).map(req => { 
        if (!req.key) req.key = generateRequirementKey(req.title, req.id);
        return req;
    });


    if (filteredRequirements.length === 0) {
        const noReqsP = document.createElement('p');
        noReqsP.textContent = 'Alla krav har minst en kopplad innehållstyp.';
        dynamicContentArea.appendChild(noReqsP);
    } else {
        filteredRequirements.sort((a, b) => {
            const mainCatA = getVal(a, 'metadata.mainCategory.text', getVal(a, 'metadata.mainCategory', 'ÖÖÖ')).trim();
            const mainCatB = getVal(b, 'metadata.mainCategory.text', getVal(b, 'metadata.mainCategory', 'ÖÖÖ')).trim();
            if (mainCatA.localeCompare(mainCatB, 'sv') !== 0) return mainCatA.localeCompare(mainCatB, 'sv');

            const subCatA = getVal(a, 'metadata.subCategory.text', getVal(a, 'metadata.subCategory', 'ööö')).trim();
            const subCatB = getVal(b, 'metadata.subCategory.text', getVal(b, 'metadata.subCategory', 'ööö')).trim();
            if (subCatA.localeCompare(subCatB, 'sv') !== 0) return subCatA.localeCompare(subCatB, 'sv');

            const titleA = getVal(a, 'title', a.key || '');
            const titleB = getVal(b, 'title', b.key || '');
            return titleA.localeCompare(titleB, 'sv');
        });

        const ul = document.createElement('ul');
        ul.classList.add('requirement-list', 'flat-list'); 
        dynamicContentArea.appendChild(ul);

        filteredRequirements.forEach(req => {
            const li = document.createElement('li');
            li.classList.add('requirement-item');
            li.id = `req-no-ct-item-${req.key}`;

            const textDiv = document.createElement('div');
            textDiv.classList.add('requirement-text');
            const refStrong = document.createElement('strong');
            refStrong.textContent = escapeHtml(getVal(req, 'standardReference.text', req.id || req.key || 'REF?'));
            textDiv.appendChild(refStrong);
            textDiv.appendChild(document.createTextNode(`: ${escapeHtml(req.title || 'TITEL?')}`));
            li.appendChild(textDiv);

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('requirement-actions');

            const viewButton = document.createElement('button');
            viewButton.classList.add('req-view-button');
            viewButton.innerHTML = `Visa <span class="icon" aria-hidden="true">${ICONS.view}</span>`;
            viewButton.setAttribute('aria-label', `Visa ${escapeHtml(req.title || 'Okänt krav')}`);
            viewButton.dataset.reqKey = req.key;
            viewButton.addEventListener('click', () => displayRequirementDetail(req.key));
            actionsDiv.appendChild(viewButton);

            const editButton = document.createElement('button');
            editButton.classList.add('req-edit-button');
            editButton.innerHTML = `Redigera <span class="icon" aria-hidden="true">${ICONS.edit}</span>`;
            editButton.setAttribute('aria-label', `Redigera ${escapeHtml(req.title || 'Okänt krav')}`);
            editButton.dataset.reqKey = req.key;
            editButton.addEventListener('click', () => renderRequirementForm(req.key));
            actionsDiv.appendChild(editButton);

            li.appendChild(actionsDiv);
            ul.appendChild(li);
        });
    }

    const backButtonContainer = document.createElement('div');
    backButtonContainer.style.textAlign = 'center'; 
    backButtonContainer.style.marginTop = '2rem';

    const backToMetaButton = document.createElement('button');
    backToMetaButton.type = 'button';
    backToMetaButton.innerHTML = `Tillbaka till Metadata <span class="icon" aria-hidden="true">${ICONS.back}</span>`;
    backToMetaButton.addEventListener('click', () => {
        renderMetadataForm('contentTypes'); 
    });
    backButtonContainer.appendChild(backToMetaButton);
    dynamicContentArea.appendChild(backButtonContainer);


    if (postUploadControlsContainer) postUploadControlsContainer.classList.remove('hidden');
    if (showMetadataButton) showMetadataButton.style.display = '';
    if (showRequirementsButton) showRequirementsButton.style.display = '';
    if (filterSortRow) filterSortRow.classList.add('hidden');
}


console.log("Module loaded: requirement_functions (v15 - Robust Save Logic)");