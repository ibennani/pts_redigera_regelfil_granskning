// js/_---_requirement_functions.js

// Importer (som tidigare)
import {
    dynamicContentArea, filterSortRow, sortOrderSelect, searchInput, saveChangesButton
} from './_-----_dom_element_references.js';
import { ICONS } from './_-----_constants.js';
import * as state from './_-----_global_state.js';
import { escapeHtml, parseSimpleMarkdown, getVal, generateKeyFromName, generateRequirementKey } from './_-----_utils__helpers.js';
import { setupContentArea, showError, displayConfirmation } from './_-----_ui_functions.js';
// import { } from './_-----_metadata_functions.js'; // Importera om nödvändigt


// ----- Form Field Creation Helpers -----

/**
 * Skapar ett standardiserat formulärfält (label + [instruktion] + input/textarea/select-container).
 * *** UPPDATERAD: Kan inkludera instruktionstext mellan label och fält ***
 * @param {string} labelText Texten för label-elementet (lägg till * för obligatorisk).
 * @param {string} name Input-elementets name-attribut.
 * @param {string|boolean|number} value Startvärdet för fältet.
 * @param {'text'|'textarea'|'select'|'checkbox'|'number'|'email'|'url'|'date'} [type='text'] Typ av input-fält.
 * @param {string} [placeholder=''] Placeholder-text för textfält.
 * @param {boolean} [readonly=false] Om fältet ska vara skrivskyddat.
 * @param {string|null} [instructionText=null] Valfri hjälptext som visas mellan label och fält.
 * @returns {HTMLDivElement} En div som innehåller label, ev. instruktion och input/textarea. För 'select' returneras containern.
 */
export function createFormField(labelText, name, value, type = 'text', placeholder = '', readonly = false, instructionText = null) {
    const container = document.createElement('div');
    container.classList.add('form-field');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const inputId = `form-${name.replace(/[\.\[\]]/g, '-')}-${randomSuffix}`;

    const label = document.createElement('label');
    label.htmlFor = inputId;
    const isRequired = labelText.endsWith('*');
    label.textContent = isRequired ? labelText : `${labelText}:`; // Lägg till kolon om inte obligatorisk

    // Lägg alltid till label först
    container.appendChild(label);

    // Lägg till instruktionstext om den finns, *före* input/textarea/select
    if (instructionText) {
        const instr = document.createElement('p');
        instr.className = 'field-instruction';
        instr.textContent = instructionText;
        container.appendChild(instr);
    }

    // Skapa och lägg till själva fältet
    let inputElement;

    if (type === 'checkbox') {
        // Checkbox behöver specialhantering för layout (input + label bredvid varann)
        // Ta bort label som lades till först och återskapa struktur
        container.innerHTML = ''; // Rensa containern
        container.classList.add('form-field-checkbox');

        inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.id = inputId;
        inputElement.name = name;
        inputElement.checked = !!value;
        if (readonly) inputElement.disabled = true;

        const checkboxLabel = document.createElement('label'); // Skapa ny label specifik för checkbox
        checkboxLabel.htmlFor = inputId;
        checkboxLabel.textContent = labelText; // Använd originaltext utan kolon

        // Lägg till instruktion FÖRE checkbox+label om den finns
        if (instructionText) {
            const instr = document.createElement('p');
            instr.className = 'field-instruction';
            instr.textContent = instructionText;
            container.appendChild(instr); // Instruktion först i checkbox-fallet? Eller efter? Smaksak. Här före.
        }

        container.appendChild(inputElement); // Lägg till checkbox
        container.appendChild(checkboxLabel); // Lägg till label bredvid

    } else if (type === 'select') {
        // För select skapas bara containern med label och ev. instruktion här.
        // Select-elementet läggs till av anropande kod.
        // Instruktionen är redan tillagd ovan.
        return container; // Returnera containern som den är
    } else {
        // För text, textarea, number etc.
        if (type === 'textarea') {
            inputElement = document.createElement('textarea');
            inputElement.rows = 3; // Default höjd, kan ändras av anropande kod
        } else {
            inputElement = document.createElement('input');
            inputElement.type = type;
            if (type === 'number') inputElement.step = 'any';
        }

        inputElement.id = inputId;
        inputElement.name = name;
        inputElement.value = value ?? '';
        if (placeholder) inputElement.placeholder = placeholder;
        if (readonly) {
            inputElement.readOnly = true;
            inputElement.classList.add('readonly-field');
        }
        if (isRequired) inputElement.required = true;

        // Lägg till fältet sist i containern
        container.appendChild(inputElement);
    }

    return container;
}


// --- Helper Functions for Dynamic Lists in Forms --- (ingen ändring här)

// createInstructionListItem (oförändrad)
function createInstructionListItem(text, index) {
    const li = document.createElement('li');
    li.classList.add('instruction-item', 'dynamic-list-item');
    li.dataset.index = index;
    const textarea = document.createElement('textarea');
    textarea.name = `instruction-${index}`; textarea.rows = 2; textarea.value = text;
    textarea.placeholder = "Instruktionstext..."; textarea.setAttribute('aria-label', `Instruktion ${index + 1}`);
    li.appendChild(textarea);
    const removeButton = createDynamicListButton('Ta bort', (e) => { e.target.closest('li.dynamic-list-item')?.remove(); }, 'remove-item-button');
    removeButton.setAttribute('aria-label', `Ta bort instruktion ${index + 1}`);
    li.appendChild(removeButton);
    return li;
}

// createCheckFieldset (använder createFormField utan instruktionstext, oförändrad)
function createCheckFieldset(checkData, index) {
    const fieldset = document.createElement('fieldset');
    fieldset.classList.add('check-fieldset', 'dynamic-list-item');
    fieldset.dataset.index = index;

    const legend = document.createElement('legend');
    legend.textContent = `Kontrollpunkt ${index + 1}`;
    fieldset.appendChild(legend);

    const removeCheckButton = createDynamicListButton(
        'Ta bort Kontrollpunkt',
        (e) => { e.target.closest('fieldset.check-fieldset')?.remove(); },
        ['remove-item-button', 'remove-check-button', 'button-danger']
    );
    removeCheckButton.setAttribute('aria-label', `Ta bort kontrollpunkt ${index + 1}`);
    fieldset.appendChild(removeCheckButton); // Placeras ofta uppe till höger i fieldset

    // Villkor (som tidigare)
    const conditionContainer = createFormField(
        `Villkor*`,
        `check-${index}-condition`,
        checkData.condition || '',
        'textarea',
        'Beskriv när kontrollen ska utföras...'
    );
    const conditionTextarea = conditionContainer.querySelector('textarea');
    if (conditionTextarea) {
        conditionTextarea.rows = 2; // Kan justeras efter behov
        conditionTextarea.required = true;
    }
    fieldset.appendChild(conditionContainer);

    // Logik för Godkänd-kriterier (som tidigare)
    const logicContainer = createFormField(
        `Logik för Godkänd-kriterier`,
        `check-${index}-logic`,
        '', // Värdet sätts nedan
        'select'
    );
    const logicSelect = document.createElement('select');
    const logicId = logicContainer.querySelector('label')?.htmlFor || `check-${index}-logic-select`;
    logicSelect.id = logicId;
    logicSelect.name = `check-${index}-logic`;
    const optionAnd = document.createElement('option');
    optionAnd.value = 'AND';
    optionAnd.textContent = 'ALLA kriterier måste uppfyllas (AND)';
    const optionOr = document.createElement('option');
    optionOr.value = 'OR';
    optionOr.textContent = 'Minst ETT kriterium måste uppfyllas (OR)';
    logicSelect.appendChild(optionAnd);
    logicSelect.appendChild(optionOr);
    logicSelect.value = checkData.logic || 'AND'; // Default till AND
    logicContainer.appendChild(logicSelect);
    fieldset.appendChild(logicContainer);

    // Godkänd-kriterier (renderas nu direkt under logik)
    const passFieldset = document.createElement('fieldset');
    passFieldset.classList.add('criteria-group', 'pass-criteria-group'); // Ny klass för specifik styling
    const passLegend = document.createElement('legend');
    passLegend.textContent = 'Godkänd-kriterier';
    passFieldset.appendChild(passLegend);
    const passList = document.createElement('ul');
    passList.classList.add('pass-criteria-list', 'dynamic-list');
    (checkData.passCriteria || []).forEach((crit, critIndex) => {
        passList.appendChild(createCriterionListItem(crit.requirement || '', index, 'pass', critIndex));
    });
    passFieldset.appendChild(passList);
    const addPassButton = createDynamicListButton('+ Lägg till Godkänd-kriterium', () => {
        passList.appendChild(createCriterionListItem('', index, 'pass', passList.children.length));
    });
    passFieldset.appendChild(addPassButton);
    fieldset.appendChild(passFieldset); // Lägg till i huvud-fieldset

    // "Om Nej"-kriterier (renderas nu direkt under Godkänd-kriterier)
    const ifNoFieldset = document.createElement('fieldset');
    ifNoFieldset.classList.add('criteria-group', 'if-no-criteria-group'); // Ny klass för specifik styling
    const ifNoLegend = document.createElement('legend');
    ifNoLegend.textContent = '"Om Nej"-kriterier (Alternativ om ovan ej uppfylls)';
    ifNoFieldset.appendChild(ifNoLegend);
    const ifNoList = document.createElement('ul');
    ifNoList.classList.add('if-no-criteria-list', 'dynamic-list');
    (checkData.ifNo || []).forEach((crit, critIndex) => {
        ifNoList.appendChild(createCriterionListItem(crit.requirement || '', index, 'ifNo', critIndex));
    });
    ifNoFieldset.appendChild(ifNoList);
    const addIfNoButton = createDynamicListButton('+ Lägg till "Om Nej"-kriterium', () => {
        ifNoList.appendChild(createCriterionListItem('', index, 'ifNo', ifNoList.children.length));
    });
    ifNoFieldset.appendChild(addIfNoButton);
    fieldset.appendChild(ifNoFieldset); // Lägg till i huvud-fieldset

    return fieldset;
}


// createCriterionListItem (oförändrad)
function createCriterionListItem(text, checkIndex, type, critIndex) {
    const li = document.createElement('li');
    li.classList.add(`${type}-criterion-item`, 'dynamic-list-item');
    li.dataset.checkIndex = checkIndex; li.dataset.critIndex = critIndex;
    const typeText = type === 'pass' ? 'Godkänd-kriterium' : '"Om Nej"-kriterium';
    const labelText = `${typeText} ${critIndex + 1} för kontroll ${checkIndex + 1}`;
    const textarea = document.createElement('textarea');
    textarea.name = `check-${checkIndex}-${type}Crit-${critIndex}`; textarea.rows = 1; textarea.value = text;
    textarea.placeholder = 'Beskriv kravet/kriteriet här...'; textarea.setAttribute('aria-label', labelText);
    li.appendChild(textarea);
    const removeButton = createDynamicListButton('Ta bort', (e) => { e.target.closest('li.dynamic-list-item')?.remove(); }, 'remove-item-button');
    removeButton.setAttribute('aria-label', `Ta bort ${typeText.toLowerCase()} ${critIndex + 1}`);
    li.appendChild(removeButton);
    return li;
}

// createDynamicListButton (oförändrad)
function createDynamicListButton(text, onClick, classNames = 'add-item-button') {
    const button = document.createElement('button');
    button.type = 'button';
    let icon = ICONS.add;
    if (text.toLowerCase().includes('ta bort')) icon = ICONS.delete;
    button.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span> ${escapeHtml(text)}`;
    if (Array.isArray(classNames)) button.classList.add(...classNames);
    else if (typeof classNames === 'string') button.classList.add(classNames);
    button.addEventListener('click', onClick);
    return button;
}


// --- Requirement Display Functions ---

/**
 * Visar listan med krav, filtrerad och sorterad enligt global state.
 * (Ingen logisk ändring här, bara loggning för felsökning)
 */
export function displayRequirements() {
    console.log(`Visar krav. Sortering: ${state.currentSortOrder}, Sökterm: "${state.currentSearchTerm}"`);
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
    if (keyToFocus) console.log("Försöker sätta fokus på nyckel:", keyToFocus);

    let requirementsArray;
    try {
        requirementsArray = Object.entries(requirements).map(([key, value]) => {
            if (typeof value !== 'object' || value === null) {
                console.warn(`Krav med nyckel "${key}" är inte ett giltigt objekt. Skippar.`);
                return null; // Skip invalid requirement objects
            }
            value.key = key; // Ensure the key is part of the object
             if (!value.title) {
                console.warn(`Krav med nyckel "${key}" saknar titel. Använder nyckeln som placeholder.`);
                value.title = `[Titel saknas: ${key}]`;
            }
            return value;
        }).filter(Boolean); // Remove null entries
    } catch (e) {
        console.error("Fel vid konvertering av krav till array:", e);
        showError("Kunde inte bearbeta kravlistan.", dynamicContentArea);
        return;
    }


    if (requirementsArray.length === 0) {
        heading.textContent = 'Krav (0 st)';
        dynamicContentArea.appendChild(document.createElement('p')).textContent = 'Inga krav finns i den laddade filen.';
        if (filterSortRow) filterSortRow.classList.add('hidden'); // Hide filter/sort if no requirements
        return;
    }

    // Filtering
    const searchTerm = state.currentSearchTerm.toLowerCase().trim();
    let filteredRequirements = requirementsArray;
    if (searchTerm) {
        console.log(`Filtrerar på: "${searchTerm}"`);
        filteredRequirements = requirementsArray.filter(req => {
             // Expand search to include more fields, including expectedObservation
            const searchableText = [
                getVal(req, 'title', ''),
                getVal(req, 'key', ''),
                getVal(req, 'standardReference.text', ''),
                getVal(req, 'metadata.mainCategory.text', ''),
                getVal(req, 'metadata.subCategory.text', ''),
                ...(req.instructions || []).map(instr => getVal(instr, 'text', '')),
                ...(req.checks || []).flatMap(check => [
                    getVal(check, 'condition', ''),
                    ...(check.passCriteria || []).map(crit => getVal(crit, 'requirement', '')),
                    ...(check.ifNo || []).map(crit => getVal(crit, 'requirement', ''))
                ]),
                getVal(req, 'examples', ''),
                getVal(req, 'exceptions', ''),
                getVal(req, 'tips', ''),
                getVal(req, 'commonErrors', ''),
                 getVal(req, 'expectedObservation', '') // Added expectedObservation to search
            ].join(' ').toLowerCase();
            return searchableText.includes(searchTerm);
        });
        console.log(`Hittade ${filteredRequirements.length} krav efter filtrering.`);
    }

     heading.textContent = `Krav (${filteredRequirements.length} st)`;

    // Sorting
    try {
        filteredRequirements.sort(getSortFunction(state.currentSortOrder));
    } catch (e) {
         console.error("Fel vid sortering av krav:", e);
        showError("Kunde inte sortera kravlistan.", dynamicContentArea);
        return;
    }

    // Rendering
    let elementToFocus = null;
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

    // Focus Handling
    elementToFocus = dynamicContentArea.querySelector('[data-focus-target="true"] .requirement-text');
    if (elementToFocus) {
        console.log("Försöker fokusera på element:", elementToFocus);
        setTimeout(() => {
            // Double-check if the element still exists in the DOM
             if (elementToFocus && document.body.contains(elementToFocus)) {
                elementToFocus.focus({ preventScroll: false }); // Let the browser handle scroll if needed, or adjust options
                elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
                state.setState('lastFocusedReqKey', null); // Clear focus target after focusing
                 console.log("Fokus sattes.");
            } else {
                 console.log("Elementet att fokusera på fanns inte längre när timeout kördes.");
                 state.setState('lastFocusedReqKey', null);
            }
        }, 50); // Small delay to ensure rendering is complete
    } else if (keyToFocus) {
        console.warn(`Kunde inte hitta element att fokusera för nyckel: ${keyToFocus}`);
         state.setState('lastFocusedReqKey', null); // Clear focus target if element not found
    }
}

/**
 * Renderar kraven grupperade efter kategori.
 * (Ingen logisk ändring här)
 * @param {Array} requirementsArray Den sorterade och filtrerade listan med kravobjekt.
 * @param {string|null} keyToFocus Nyckeln för det krav som ska få fokus.
 */
function renderGroupedRequirements(requirementsArray, keyToFocus) {
    console.log("Renderar krav grupperade efter kategori...");
    const grouped = {};

    // Group requirements
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
        console.error("Fel vid gruppering av krav:", e);
        showError("Kunde inte gruppera kraven per kategori.", dynamicContentArea);
        return;
    }


    // Sort main categories based on current sort order
     const sortedMainCategories = Object.keys(grouped).sort((a, b) => {
        const compare = a.localeCompare(b, 'sv');
        return state.currentSortOrder === 'category-asc' ? compare : -compare;
    });

     if (sortedMainCategories.length === 0) {
        console.warn("Inga kategorier hittades efter gruppering.");
        dynamicContentArea.appendChild(document.createElement('p')).textContent = 'Inga kategorier att visa.';
        return;
    }

    // Render groups
     sortedMainCategories.forEach(mainCategory => {
        if (grouped[mainCategory]) {
            const mainCatHeading = document.createElement('h3');
             const mainCatId = `maincat-${generateKeyFromName(mainCategory)}`;
            mainCatHeading.textContent = mainCategory;
            mainCatHeading.id = mainCatId;
            dynamicContentArea.appendChild(mainCatHeading);

            const categoryContent = grouped[mainCategory];
            const sortedSubCategories = Object.keys(categoryContent).sort((a, b) => a.localeCompare(b, 'sv')); // Always sort subcategories A-Ö

             sortedSubCategories.forEach(subCategory => {
                if (categoryContent[subCategory]) {
                    const reqList = categoryContent[subCategory];
                    // Sort requirements within the subcategory alphabetically by title
                    reqList.sort((a, b) => getVal(a, 'title', '').localeCompare(getVal(b, 'title', ''), 'sv'));


                    let subCatHeading = null;
                    let subCatId = '';
                    let listLabelledBy = mainCatId; // Default to main category heading ID

                    if (subCategory !== '') { // Only add H4 if subcategory exists
                        subCatHeading = document.createElement('h4');
                         subCatId = `subcat-${generateKeyFromName(subCategory)}`;
                        subCatHeading.textContent = subCategory;
                        subCatHeading.id = subCatId;
                        dynamicContentArea.appendChild(subCatHeading);
                         listLabelledBy = subCatId; // Use subcategory heading ID if it exists
                    }


                    const ul = document.createElement('ul');
                    ul.classList.add('requirement-list');
                    ul.setAttribute('aria-labelledby', listLabelledBy); // Associate list with the correct heading
                    dynamicContentArea.appendChild(ul);

                     reqList.forEach(req => {
                        try {
                            const li = renderRequirementListItem(req, keyToFocus);
                            ul.appendChild(li);
                        } catch (itemError) {
                             console.error(`Fel vid rendering av listitem för nyckel ${req.key}:`, itemError);
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


/**
 * Renderar kraven som en platt lista.
 * (Ingen logisk ändring här)
 * @param {Array} requirementsArray Den sorterade och filtrerade listan med kravobjekt.
 * @param {string|null} keyToFocus Nyckeln för det krav som ska få fokus.
 */
function renderFlatRequirements(requirementsArray, keyToFocus) {
    console.log(`Renderar platt kravlista sorterad efter ${state.currentSortOrder}...`);
    const ul = document.createElement('ul');
    ul.classList.add('requirement-list', 'flat-list');
    dynamicContentArea.appendChild(ul);

     requirementsArray.forEach(req => {
         try {
            const li = renderRequirementListItem(req, keyToFocus);
            ul.appendChild(li);
         } catch (itemError) {
             console.error(`Fel vid rendering av platt listitem för nyckel ${req.key}:`, itemError);
             const errorLi = document.createElement('li');
             errorLi.textContent = `Fel vid rendering av krav: ${escapeHtml(req.key)}`;
             errorLi.style.color = 'red';
             ul.appendChild(errorLi);
         }
    });
}

/**
 * Renderar ett enskilt krav som ett listelement (<li>).
 * (Ingen logisk ändring här)
 * @param {object} req Kravobjektet.
 * @param {string|null} keyToFocus Nyckeln för det krav som ska få fokus.
 * @returns {HTMLLIElement} Det skapade listelementet.
 */
function renderRequirementListItem(req, keyToFocus) {
    const li = document.createElement('li');
    li.classList.add('requirement-item');
    li.id = `req-item-${req.key}`; // Use requirement key for ID

    // Text content (Ref: Title)
    const textDiv = document.createElement('div');
    textDiv.classList.add('requirement-text');
    const refStrong = document.createElement('strong');
    // Prefer standardReference.text, fallback to id, then key, then placeholder
    refStrong.textContent = escapeHtml(getVal(req, 'standardReference.text', getVal(req, 'id', req.key || 'REFERENS SAKNAS')));
    textDiv.appendChild(refStrong);
    textDiv.appendChild(document.createTextNode(`: ${escapeHtml(req.title || 'TITEL SAKNAS')}`));
    textDiv.tabIndex = -1; // Make it programmatically focusable for focus handling
    li.appendChild(textDiv);

    // Action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('requirement-actions');

    const viewButton = document.createElement('button');
    viewButton.classList.add('req-view-button');
    viewButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.view}</span> Visa`;
    viewButton.setAttribute('aria-label', `Visa ${escapeHtml(req.title || 'Okänt krav')}`);
    viewButton.dataset.reqKey = req.key;
    viewButton.addEventListener('click', () => displayRequirementDetail(req.key));
    actionsDiv.appendChild(viewButton);

    const editButton = document.createElement('button');
    editButton.classList.add('req-edit-button');
    editButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.edit}</span> Redigera`;
    editButton.setAttribute('aria-label', `Redigera ${escapeHtml(req.title || 'Okänt krav')}`);
    editButton.dataset.reqKey = req.key;
    editButton.addEventListener('click', () => renderRequirementForm(req.key));
    actionsDiv.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('button-danger', 'req-delete-button');
    deleteButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.delete}</span> Radera`;
    deleteButton.setAttribute('aria-label', `Radera ${escapeHtml(req.title || 'Okänt krav')}`);
    deleteButton.dataset.reqKey = req.key;
    deleteButton.addEventListener('click', () => confirmDeleteRequirement(req.key));
    actionsDiv.appendChild(deleteButton);

    li.appendChild(actionsDiv);

    // Mark for focus if needed
    if (req.key === keyToFocus) {
        li.dataset.focusTarget = 'true';
    }

    return li;
}


/**
 * Returnerar en sorteringsfunktion baserat på vald sorteringsordning.
 * (Ingen logisk ändring här)
 * @param {string} sortOrder Sorteringsordningen (t.ex. 'category-asc', 'ref-desc').
 * @returns {function} En jämförelsefunktion för Array.sort().
 */
function getSortFunction(sortOrder) {
    return (a, b) => {
        let valA, valB, compareResult;
        try {
            switch (sortOrder) {
                case 'ref-asc':
                case 'ref-desc':
                    valA = getVal(a, 'standardReference.text', a.key || '');
                    valB = getVal(b, 'standardReference.text', b.key || '');
                    // Natural sort for references like '9.1.4.2' vs '9.1.4.11'
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

                    // Sort by critical first/last
                    if (criticalA !== criticalB) {
                        compareResult = criticalA ? -1 : 1; // Critical comes first (-1)
                        return sortOrder === 'impact-critical-first' ? compareResult : -compareResult;
                    }
                    // Then by primary score (descending for critical first, ascending for critical last)
                    if (primaryA !== primaryB) {
                        compareResult = primaryB - primaryA; // Higher score comes first
                        return sortOrder === 'impact-critical-first' ? compareResult : -compareResult;
                    }
                    // Then by secondary score (descending for critical first, ascending for critical last)
                     if (secondaryA !== secondaryB) {
                        compareResult = secondaryB - secondaryA; // Higher score comes first
                        return sortOrder === 'impact-critical-first' ? compareResult : -compareResult;
                    }
                    // Fallback to reference sort if impact is identical
                    valA = getVal(a, 'standardReference.text', a.key || '');
                    valB = getVal(b, 'standardReference.text', b.key || '');
                    return valA.localeCompare(valB, 'sv', { numeric: true, sensitivity: 'base' });

                case 'category-asc':
                case 'category-desc':
                default: // Default to category sort
                    // Handle category potentially being string or object
                    const mainCatAObj = getVal(a, 'metadata.mainCategory', {});
                    const mainCatBObj = getVal(b, 'metadata.mainCategory', {});
                    const subCatAObj = getVal(a, 'metadata.subCategory', {});
                    const subCatBObj = getVal(b, 'metadata.subCategory', {});

                    // Extract text, fallback to key, then string value, then a high/low sort value
                    valA = getVal(mainCatAObj, 'text', typeof mainCatAObj === 'string' ? mainCatAObj : 'ÖÖÖ').trim() || 'ÖÖÖ'; // Use ÖÖÖ to sort last if empty
                    valB = getVal(mainCatBObj, 'text', typeof mainCatBObj === 'string' ? mainCatBObj : 'ÖÖÖ').trim() || 'ÖÖÖ';
                    compareResult = valA.localeCompare(valB, 'sv');
                    if (compareResult !== 0) {
                        return state.currentSortOrder === 'category-asc' ? compareResult : -compareResult;
                    }

                    // If main categories are the same, sort by subcategory
                    valA = getVal(subCatAObj, 'text', typeof subCatAObj === 'string' ? subCatAObj : 'ööö').trim() || 'ööö'; // Use ööö to sort last if empty
                    valB = getVal(subCatBObj, 'text', typeof subCatBObj === 'string' ? subCatBObj : 'ööö').trim() || 'ööö';
                    compareResult = valA.localeCompare(valB, 'sv');
                     if (compareResult !== 0) {
                        // Always sort subcategories A-Ö within the main category sort order
                        return compareResult;
                    }

                    // Fallback to reference sort if categories are identical
                    valA = getVal(a, 'standardReference.text', a.key || '');
                    valB = getVal(b, 'standardReference.text', b.key || '');
                    return valA.localeCompare(valB, 'sv', { numeric: true, sensitivity: 'base' });
            }
        } catch (sortError) {
             console.error("Fel under sorteringsjämförelse:", sortError, "Data A:", a, "Data B:", b);
            return 0; // Return 0 to avoid breaking sort on error
        }
    };
}

/**
 * Visar detaljer för ett specifikt krav.
 * *** UPPDATERAD: Visar expectedObservation ***
 * @param {string} reqKey Nyckeln för kravet som ska visas.
 */
export function displayRequirementDetail(reqKey) {
    const requirement = state.jsonData?.requirements?.[reqKey];
    if (!requirement) {
        showError(`Kunde inte hitta krav med nyckel: ${escapeHtml(reqKey)}`, dynamicContentArea);
        // Attempt to go back to the list if the source data is available
        if (state.jsonData?.requirements) displayRequirements();
        return;
    }

    state.setState('currentRequirementKey', reqKey);
    state.setState('lastFocusedReqKey', reqKey); // Set focus target for return trip
    setupContentArea(true, false); // Clear area, don't show filter/sort row
    if (!dynamicContentArea) return;
    dynamicContentArea.classList.add('requirement-detail');

    // --- Action Buttons (Edit/Delete) ---
    const actionButtonContainer = document.createElement('div');
    actionButtonContainer.className = 'action-button-container';
    const editButton = document.createElement('button');
    editButton.className = 'req-edit-button';
    editButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.edit}</span> Redigera`;
    editButton.setAttribute('aria-label', `Redigera ${escapeHtml(requirement.title)}`);
    editButton.addEventListener('click', () => renderRequirementForm(reqKey));
    actionButtonContainer.appendChild(editButton);
    const deleteButton = document.createElement('button');
    deleteButton.className = 'button-danger req-delete-button';
    deleteButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.delete}</span> Radera`;
    deleteButton.setAttribute('aria-label', `Radera ${escapeHtml(requirement.title)}`);
    deleteButton.addEventListener('click', () => confirmDeleteRequirement(reqKey));
    actionButtonContainer.appendChild(deleteButton);
    dynamicContentArea.appendChild(actionButtonContainer);


    // --- Main Content ---
    const title = document.createElement('h2');
    title.textContent = requirement.title || "[Titel saknas]";
    title.tabIndex = -1; // Make programmatically focusable
    dynamicContentArea.appendChild(title);

    // Standard Reference
    const stdRefP = document.createElement('p');
    stdRefP.classList.add('standard-ref');
    if (requirement.standardReference) {
        const refStrong = document.createElement('strong');
        refStrong.textContent = 'Referens: ';
        stdRefP.appendChild(refStrong);

        let refText = '';
        let refUrl = '';
        // Handle both object and string format for standardReference
        if (typeof requirement.standardReference === 'object' && requirement.standardReference !== null) {
            refText = getVal(requirement.standardReference, 'text', '');
            refUrl = getVal(requirement.standardReference, 'url', '');
        } else if (typeof requirement.standardReference === 'string') {
            refText = requirement.standardReference;
        }

        if (refUrl && refUrl.trim() !== '') {
            try {
                const urlObj = new URL(refUrl); // Validate URL
                const refLink = document.createElement('a');
                refLink.href = urlObj.href;
                refLink.textContent = escapeHtml(refText || refUrl); // Use text if available, else URL
                refLink.target = '_blank';
                refLink.rel = 'noopener noreferrer';
                stdRefP.appendChild(refLink);
            } catch (urlError) {
                console.warn(`Ogiltig URL för standardReference: "${refUrl}". Visar som text.`);
                stdRefP.appendChild(document.createTextNode(escapeHtml(refText || refUrl)));
            }
        } else {
            // Only text, no valid URL
            stdRefP.appendChild(document.createTextNode(escapeHtml(refText)));
        }
    } else {
        stdRefP.innerHTML = '<strong>Referens:</strong> <em>(saknas)</em>';
    }
    dynamicContentArea.appendChild(stdRefP);


    // Instructions
    if (Array.isArray(requirement.instructions) && requirement.instructions.length > 0) {
        const instrSection = document.createElement('div');
        instrSection.classList.add('detail-section');
        const instrHeading = document.createElement('h3');
        instrHeading.textContent = 'Instruktioner';
        instrSection.appendChild(instrHeading);
        const ol = document.createElement('ol');
        requirement.instructions.forEach(instr => {
            const li = document.createElement('li');
            // Assume instr.text exists, parse markdown
            li.innerHTML = parseSimpleMarkdown(getVal(instr, 'text', ''));
            ol.appendChild(li);
        });
        instrSection.appendChild(ol);
        dynamicContentArea.appendChild(instrSection);
    }

    // *** ADDED: Expected Observation Section ***
    if (requirement.expectedObservation) {
        const obsSection = document.createElement('div');
        obsSection.classList.add('detail-section');
        const obsHeading = document.createElement('h3');
        obsHeading.textContent = 'Förväntad observation'; // Heading text
        obsSection.appendChild(obsHeading);
        const obsP = document.createElement('p');
        obsP.innerHTML = parseSimpleMarkdown(requirement.expectedObservation); // Use markdown parser
        obsSection.appendChild(obsP);
        dynamicContentArea.appendChild(obsSection);
    }
    // *** END ADDED ***

    // Other Optional Sections (Examples, Exceptions, etc.)
    const optionalSections = {
        examples: 'Exempel',
        exceptions: 'Undantag',
        commonErrors: 'Vanliga Fel',
        tips: 'Tips'
    };
    for (const key in optionalSections) {
        if (Object.prototype.hasOwnProperty.call(requirement, key) && requirement[key]) {
            const section = document.createElement('div');
            section.classList.add('detail-section');
            if (key === 'exceptions') section.classList.add('exceptions'); // Special class for exceptions

            const heading = document.createElement('h3');
            heading.textContent = optionalSections[key];
            section.appendChild(heading);

            const p = document.createElement('p');
            p.innerHTML = parseSimpleMarkdown(requirement[key]); // Use markdown parser
            section.appendChild(p);
            dynamicContentArea.appendChild(section);
        }
    }


    // Checks
    if (Array.isArray(requirement.checks) && requirement.checks.length > 0) {
        const checkSection = document.createElement('div');
        checkSection.classList.add('detail-section');
        const checkHeading = document.createElement('h3');
        checkHeading.textContent = 'Kontroller';
        checkSection.appendChild(checkHeading);

        requirement.checks.forEach((check, index) => {
            const checkItemDiv = document.createElement('div');
            checkItemDiv.classList.add('check-item');
            checkItemDiv.id = `check-${reqKey}-${index + 1}`; // Unique ID for linking if needed

            // Condition
            const conditionP = document.createElement('p');
            conditionP.classList.add('check-condition');
            conditionP.innerHTML = parseSimpleMarkdown(getVal(check, 'condition', '<em>Villkor saknas</em>'));
            checkItemDiv.appendChild(conditionP);

            // Logic (AND/OR) - Display only if more than one pass criteria
            const passCriteriaCount = getVal(check, 'passCriteria.length', 0);
            const logic = getVal(check, 'logic', 'AND'); // Default to AND
            if (passCriteriaCount > 1) {
                 const logicP = document.createElement('p');
                 logicP.classList.add('check-logic');
                 logicP.textContent = `(${logic === 'OR' ? 'Minst ett av följande krävs:' : 'Alla följande krävs:'})`;
                 checkItemDiv.appendChild(logicP);
            }

            // Pass Criteria
             if (passCriteriaCount > 0) {
                const ul = document.createElement('ul');
                ul.classList.add('pass-criteria-list');
                check.passCriteria.forEach(criterion => {
                    const li = document.createElement('li');
                    li.innerHTML = parseSimpleMarkdown(getVal(criterion, 'requirement', ''));
                    ul.appendChild(li);
                });
                checkItemDiv.appendChild(ul);
            }

            // "If No" Criteria (alternative pass conditions)
            const ifNoCriteria = getVal(check, 'ifNo', []);
            if (Array.isArray(ifNoCriteria) && ifNoCriteria.length > 0) {
                const noHeading = document.createElement('p');
                noHeading.textContent = 'Om ovan ej uppfylls:';
                noHeading.style.fontWeight = 'bold';
                noHeading.style.marginTop = '0.75em';
                checkItemDiv.appendChild(noHeading);

                const noUl = document.createElement('ul');
                noUl.classList.add('pass-criteria-list'); // Reuse styling
                ifNoCriteria.forEach(criterion => {
                    const li = document.createElement('li');
                    li.innerHTML = parseSimpleMarkdown(getVal(criterion, 'requirement', ''));
                    noUl.appendChild(li);
                });
                checkItemDiv.appendChild(noUl);
            }


            checkSection.appendChild(checkItemDiv);
        });
        dynamicContentArea.appendChild(checkSection);
    }

     // Content Types
    const reqContentTypes = getVal(requirement, 'contentType', []);
    const masterContentTypes = getVal(state.jsonData, 'metadata.contentTypes', []);
    if (Array.isArray(reqContentTypes) && reqContentTypes.length > 0 && Array.isArray(masterContentTypes)) {
        const ctSection = document.createElement('div');
        ctSection.classList.add('detail-section');
        const ctHeading = document.createElement('h3');
        ctHeading.textContent = 'Relevanta Innehållstyper';
        ctSection.appendChild(ctHeading);

        const ctUL = document.createElement('ul');
        ctUL.style.listStyle = 'disc'; // Or other style

        // Create a map for quick lookup of master content type text by ID
        const masterTypesMap = masterContentTypes.reduce((acc, type) => {
            if (type && type.id) acc[type.id] = type.text || type.id; // Use text if available, else ID
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
                console.warn(`Content type ID "${ctId}" i krav "${reqKey}" hittades inte i metadata.contentTypes.`);
                // Optionally display the orphan ID:
                // const li = document.createElement('li');
                // li.textContent = `[Okänd typ: ${escapeHtml(ctId)}]`;
                // li.style.fontStyle = 'italic';
                // li.style.color = 'gray';
                // ctUL.appendChild(li);
            }
        });

        if (validTypesFound) {
            ctSection.appendChild(ctUL);
            dynamicContentArea.appendChild(ctSection);
        } else {
             // If only orphan IDs were found, don't show the section
             ctHeading.remove();
             ctSection.remove();
             console.log("Inga matchande content types att visa för detta krav.");
        }
    }

    // Metadata Info (Category, Impact)
    const metaSection = document.createElement('div');
    metaSection.classList.add('detail-section', 'metadata-info');

    // Category
    const catInfo = document.createElement('p');
    catInfo.classList.add('category-info');
    const mainCatText = getVal(requirement, 'metadata.mainCategory.text', getVal(requirement, 'metadata.mainCategory', 'Okänd'));
    const subCatText = getVal(requirement, 'metadata.subCategory.text', getVal(requirement, 'metadata.subCategory', ''));
    catInfo.innerHTML = `<strong>Kategori:</strong> ${escapeHtml(mainCatText)}${subCatText ? ` / ${escapeHtml(subCatText)}` : ''}`;
    metaSection.appendChild(catInfo);

    // Impact
    if (requirement.metadata?.impact) {
        const impact = requirement.metadata.impact;
        const impactP = document.createElement('p');
        impactP.classList.add('impact-info');
        let impactText = `<strong>Påverkan:</strong> ${impact.isCritical ? 'Kritisk' : 'Icke-kritisk'}`;
        const primaryScore = impact.primaryScore ?? 0; // Default to 0 if undefined/null
        const secondaryScore = impact.secondaryScore ?? 0;
        impactText += ` (Poäng: ${primaryScore}.${secondaryScore}, `;
        const assumedCompliance = impact.assumedCompliance ?? false; // Default to false
        impactText += `Antagen efterlevnad: ${assumedCompliance ? 'Ja' : 'Nej'})`;
        impactP.innerHTML = impactText;
        metaSection.appendChild(impactP);
    }
    dynamicContentArea.appendChild(metaSection);


    // --- Back Button ---
    const backButton = document.createElement('button');
    backButton.id = 'backButton';
    backButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.back}</span> Tillbaka till listan`;
    backButton.addEventListener('click', () => { displayRequirements(); });
    dynamicContentArea.appendChild(backButton);

    // --- Set Focus ---
    // Set focus to the title after a short delay to ensure rendering
    setTimeout(() => title.focus({ preventScroll: false }), 50);
}


/**
 * Renderar ett formulär för att redigera eller lägga till ett krav.
 * *** UPPDATERAD: Inkluderar fält för expectedObservation ***
 * @param {string|null} reqKey Nyckeln för kravet som redigeras, eller null för nytt krav.
 */
export function renderRequirementForm(reqKey) {
    const isEditing = reqKey !== null && state.jsonData?.requirements?.[reqKey];
    const requirement = isEditing ? state.jsonData.requirements[reqKey] : {}; // Use empty object for new
    const formTitle = isEditing ? `Redigera krav` : 'Lägg till nytt krav';

    setupContentArea(true, false); // Clear area, no filter/sort needed here
    if (!dynamicContentArea) return;
    dynamicContentArea.classList.add('form-view');

    const form = document.createElement('form');
    form.id = isEditing ? `requirementForm-${reqKey}` : 'requirementForm-new';
    form.noValidate = true; // Use JS for validation feedback
    form.addEventListener('submit', (event) => saveRequirement(event, reqKey));

    const heading = document.createElement('h2');
    heading.textContent = isEditing ? `${formTitle}: ${escapeHtml(requirement.title || reqKey)}` : formTitle;
    form.appendChild(heading);

    // --- Basic Info ---
    form.appendChild(createFormField('Titel*', 'title', requirement.title || '', 'text', 'Kravets titel'));

    // Standard Reference (Text + URL)
    const stdRefFieldset = document.createElement('fieldset');
    const stdRefLegend = document.createElement('legend');
    stdRefLegend.textContent = 'Standardreferens';
    let refText = ''; let refUrl = '';
    if (typeof requirement.standardReference === 'object' && requirement.standardReference !== null) {
        refText = getVal(requirement.standardReference, 'text', '');
        refUrl = getVal(requirement.standardReference, 'url', '');
    } else if (typeof requirement.standardReference === 'string') {
        refText = requirement.standardReference; // Handle legacy string format if needed
    }
    stdRefFieldset.appendChild(createFormField('Text', 'standardReference.text', refText, 'text', 't.ex. WCAG 9.1.4.2'));
    stdRefFieldset.appendChild(createFormField('URL (valfri)', 'standardReference.url', refUrl, 'url', 'https://www.w3.org/TR/...'));
    form.appendChild(stdRefFieldset);


    // --- Descriptive Fields (Textareas) ---
    const instrFieldset = document.createElement('fieldset');
    const instrLegend = document.createElement('legend');
    instrLegend.textContent = 'Instruktioner';
    instrFieldset.appendChild(instrLegend);
    const instrList = document.createElement('ol'); // Use OL for numbered instructions
    instrList.id = 'instructionList';
    instrList.classList.add('dynamic-list');
    (requirement.instructions || []).forEach((instr, index) => {
        // Assuming instruction is an object { id: '...', text: '...' } or just text
        const instructionText = getVal(instr, 'text', '');
        instrList.appendChild(createInstructionListItem(instructionText, index));
    });
    instrFieldset.appendChild(instrList);
    const addInstrButton = createDynamicListButton('Lägg till instruktion', () => {
        const list = document.getElementById('instructionList');
        if (list) { list.appendChild(createInstructionListItem('', list.children.length)); }
    });
    instrFieldset.appendChild(addInstrButton);
    form.appendChild(instrFieldset);

    form.appendChild(createFormField('Exempel', 'examples', requirement.examples || '', 'textarea'));
    form.appendChild(createFormField('Undantag', 'exceptions', requirement.exceptions || '', 'textarea'));
    form.appendChild(createFormField('Vanliga Fel', 'commonErrors', requirement.commonErrors || '', 'textarea'));
    form.appendChild(createFormField('Tips', 'tips', requirement.tips || '', 'textarea'));

    // *** ADDED: Field for Expected Observation ***
    const obsFieldContainer = createFormField(
        'Förväntad observation',
        'expectedObservation',
        requirement.expectedObservation || '',
        'textarea',
        'Beskriv den förväntade observationen här...',
        false,
        'Text som beskriver vad som förväntas observeras vid granskning.'
    );
    const obsTextarea = obsFieldContainer.querySelector('textarea');
    if (obsTextarea) obsTextarea.rows = 5; // Adjust rows as needed
    form.appendChild(obsFieldContainer);
    // *** END ADDED ***

    // --- Checks ---
    const checksFieldset = document.createElement('fieldset');
    const checksLegend = document.createElement('legend');
    checksLegend.textContent = 'Kontrollpunkter';
    checksFieldset.appendChild(checksLegend);
    const checksContainer = document.createElement('div');
    checksContainer.id = 'checksContainer';
    checksContainer.classList.add('checks-container');
    (requirement.checks || []).forEach((check, index) => {
        checksContainer.appendChild(createCheckFieldset(check, index));
    });
    checksFieldset.appendChild(checksContainer);
    const addCheckButton = createDynamicListButton('Lägg till kontrollpunkt', () => {
        const container = document.getElementById('checksContainer');
        if (container) { container.appendChild(createCheckFieldset({}, container.children.length)); }
    });
    checksFieldset.appendChild(addCheckButton);
    form.appendChild(checksFieldset);

    // --- Content Types (Checkboxes based on metadata) ---
    const masterContentTypes = getVal(state.jsonData, 'metadata.contentTypes', []);
    if (masterContentTypes.length > 0) {
        const ctFieldset = document.createElement('fieldset');
        const ctLegend = document.createElement('legend');
        ctLegend.textContent = 'Relevanta Innehållstyper';
        ctFieldset.appendChild(ctLegend);
        const currentTypes = getVal(requirement, 'contentType', []); // Array of IDs
        masterContentTypes.forEach(type => {
            if (type && type.id) {
                const isChecked = currentTypes.includes(type.id);
                // Use createFormField for consistent layout
                const checkboxField = createFormField(
                    type.text || type.id,    // Label text
                    'contentType',           // Name (all checkboxes share this)
                    type.id,                 // Value = the ID to store
                    'checkbox'               // Type
                );
                 const checkboxInput = checkboxField.querySelector('input[type="checkbox"]');
                 if (checkboxInput) {
                     checkboxInput.checked = isChecked;
                     // Value is already set by createFormField logic for checkbox type
                 }
                ctFieldset.appendChild(checkboxField);
            }
        });
        form.appendChild(ctFieldset);
    }


    // --- Metadata (Category & Impact) ---
    const metaFieldset = document.createElement('fieldset');
    const metaLegend = document.createElement('legend');
    metaLegend.textContent = 'Kategorisering & Påverkan';
    metaFieldset.appendChild(metaLegend);

    // Categories (Main and Sub)
    const { mainCategories, subCategories } = extractCategories(state.jsonData?.requirements || {});
    const currentMainCatText = getVal(requirement, 'metadata.mainCategory.text', getVal(requirement, 'metadata.mainCategory', '')); // Handle object or string
    const currentSubCatText = getVal(requirement, 'metadata.subCategory.text', getVal(requirement, 'metadata.subCategory', '')); // Handle object or string

    // Main Category - Use select if options exist, else text input
    if (mainCategories.length > 0) {
        metaFieldset.appendChild(createCategorySelect('Huvudkategori*', 'metadata.mainCategory.text', mainCategories, currentMainCatText, false));
    } else {
        metaFieldset.appendChild(createFormField('Huvudkategori*', 'metadata.mainCategory.text', currentMainCatText, 'text', 'Ange huvudkategori'));
    }

    // Sub Category - Use select if options exist, else text input
    if (subCategories.length > 0) {
        metaFieldset.appendChild(createCategorySelect('Underkategori (valfri)', 'metadata.subCategory.text', subCategories, currentSubCatText, true));
    } else {
        metaFieldset.appendChild(createFormField('Underkategori (valfri)', 'metadata.subCategory.text', currentSubCatText, 'text', 'Ange underkategori (om relevant)'));
    }

    // Impact (Nested Fieldset)
    const impactFieldset = document.createElement('fieldset');
    const impactLegend = document.createElement('legend');
    impactLegend.textContent = 'Påverkan (Impact)';
    impactFieldset.appendChild(impactLegend);
    const impactData = getVal(requirement, 'metadata.impact', {});
    impactFieldset.appendChild(createFormField('Kritisk?', 'metadata.impact.isCritical', impactData.isCritical || false, 'checkbox'));
    impactFieldset.appendChild(createFormField('Primär poäng', 'metadata.impact.primaryScore', impactData.primaryScore ?? 0, 'number', '0'));
    impactFieldset.appendChild(createFormField('Sekundär poäng', 'metadata.impact.secondaryScore', impactData.secondaryScore ?? 0, 'number', '0'));
    const defaultAssumedCompliance = impactData.assumedCompliance ?? false; // Default to false if not set
    impactFieldset.appendChild(createFormField('Antagen efterlevnad?', 'metadata.impact.assumedCompliance', defaultAssumedCompliance, 'checkbox'));
    metaFieldset.appendChild(impactFieldset); // Add impact fieldset inside meta fieldset

    form.appendChild(metaFieldset);

    // --- Form Buttons ---
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.save}</span> Spara ${isEditing ? 'ändringar' : 'nytt krav'}`;
    buttonDiv.appendChild(saveButton);
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.cancel}</span> Avbryt`;
    cancelButton.addEventListener('click', () => {
        if (isEditing) {
            displayRequirementDetail(reqKey); // Go back to detail view
        } else {
            displayRequirements(); // Go back to list view
        }
    });
    buttonDiv.appendChild(cancelButton);
    form.appendChild(buttonDiv);


    dynamicContentArea.appendChild(form);

    // Focus the title field initially
    const titleInput = form.elements['title'];
    if (titleInput) {
        setTimeout(() => titleInput.focus(), 50); // Delay focus slightly
    }
}

/**
 * Sparar ändringarna från krav-formuläret till state.jsonData.
 * Hanterar både redigering och nya krav.
 * *** UPPDATERAD: Sparar expectedObservation ***
 * @param {Event} event Submit-eventet från formuläret.
 * @param {string|null} reqKey Nyckeln för kravet som redigeras, eller null om nytt.
 */
function saveRequirement(event, reqKey) {
    event.preventDefault();
    const form = event.target;
    if (!form) { console.error("saveRequirement anropad utan formulär!"); return; }
    if (!state.jsonData) { console.error("Ingen jsonData att spara till!"); return; }
    if (!state.jsonData.requirements) state.jsonData.requirements = {}; // Initialize if missing

    const isEditing = reqKey !== null && state.jsonData.requirements?.[reqKey];
    const originalRequirement = isEditing ? state.jsonData.requirements[reqKey] : {};
    const originalRequirementString = isEditing ? JSON.stringify(originalRequirement) : null;

    try {
        // --- Basic Validation ---
        const titleElement = form.elements['title'];
        const titleValue = titleElement?.value.trim();
        const mainCategoryElement = form.elements['metadata.mainCategory.text']; // Assuming text input/select for main category text
        const mainCategoryValue = mainCategoryElement?.value.trim();

        let errors = [];
        if (!titleValue) errors.push("Titel är obligatorisk.");
        if (!mainCategoryValue) errors.push("Huvudkategori är obligatorisk.");

        if (errors.length > 0) {
            alert("Formuläret innehåller fel:\n- " + errors.join("\n- "));
             // Focus the first invalid field
            if (!titleValue) titleElement?.focus();
            else if (!mainCategoryValue) mainCategoryElement?.focus();
            return;
        }

        // --- Generate ID and Key ---
        const newId = isEditing ? (originalRequirement.id || crypto.randomUUID()) : crypto.randomUUID(); // Keep existing ID or generate new
        // Key generation depends on title - might change if title is edited
        const newReqKey = generateRequirementKey(titleValue, newId);

        // --- Collect Form Data ---
        const formData = new FormData(form);
        const selectedContentTypes = formData.getAll('contentType'); // Get all checked checkbox values

        // --- Build Updated Requirement Object ---
        const updatedRequirement = {
            id: newId, // Use stable or new ID
            key: newReqKey, // Key based on title+ID, may change
            title: titleValue,
            metadata: {
                mainCategory: getCategoryValue(form, 'metadata.mainCategory.text'),
                subCategory: getCategoryValue(form, 'metadata.subCategory.text'),
                impact: {
                    isCritical: form.elements['metadata.impact.isCritical']?.checked || false,
                    primaryScore: parseInt(form.elements['metadata.impact.primaryScore']?.value, 10) || 0,
                    secondaryScore: parseInt(form.elements['metadata.impact.secondaryScore']?.value, 10) || 0,
                    assumedCompliance: form.elements['metadata.impact.assumedCompliance']?.checked ?? false // Default false if not present
                }
            },
            standardReference: { // Always save as object
                text: form.elements['standardReference.text']?.value.trim() || '',
                url: form.elements['standardReference.url']?.value.trim() || ''
            },
            exceptions: form.elements['exceptions']?.value.trim() || '',
            examples: form.elements['examples']?.value.trim() || '',
            tips: form.elements['tips']?.value.trim() || '',
            commonErrors: form.elements['commonErrors']?.value.trim() || '',
            expectedObservation: form.elements['expectedObservation']?.value.trim() || '', // *** ADDED ***
            instructions: [],
            checks: [],
            contentType: selectedContentTypes
        };

        // --- Clean up empty objects/strings ---
        // Ensure subCategory is "" if text is empty
        if (typeof updatedRequirement.metadata.subCategory === 'object' && !updatedRequirement.metadata.subCategory?.text) {
            updatedRequirement.metadata.subCategory = "";
        }
        // Ensure standardReference is "" if both text and url are empty
        if (typeof updatedRequirement.standardReference === 'object' && !updatedRequirement.standardReference?.text && !updatedRequirement.standardReference?.url) {
             updatedRequirement.standardReference = "";
        }

        // --- Collect Dynamic Lists (Instructions & Checks) ---
        // Instructions
        const instructionTextareas = form.querySelectorAll('#instructionList .instruction-item textarea');
        instructionTextareas.forEach((textarea, index) => {
            const text = textarea.value.trim();
            if (text) updatedRequirement.instructions.push({ id: (index + 1).toString(), text: text });
        });

        // Checks
        const checkFieldsets = form.querySelectorAll('#checksContainer .check-fieldset');
        checkFieldsets.forEach((fieldset, checkIndex) => {
            const condition = fieldset.querySelector(`textarea[name="check-${checkIndex}-condition"]`)?.value.trim();
            if (!condition) return; // Skip check if condition is empty

            const check = {
                id: (checkIndex + 1).toString(),
                condition: condition,
                logic: fieldset.querySelector(`select[name="check-${checkIndex}-logic"]`)?.value || 'AND',
                passCriteria: [],
                ifNo: []
            };

            // Pass Criteria
            const passCritTextareas = fieldset.querySelectorAll(`.pass-criteria-list textarea`);
            passCritTextareas.forEach((textarea, critIndex) => {
                const reqText = textarea.value.trim();
                if (reqText) check.passCriteria.push({ id: `${check.id}.${critIndex + 1}`, requirement: reqText });
            });

             // If No Criteria
            const ifNoCritTextareas = fieldset.querySelectorAll(`.if-no-criteria-list textarea`);
             ifNoCritTextareas.forEach((textarea, critIndex) => {
                const reqText = textarea.value.trim();
                if (reqText) check.ifNo.push({ id: `${check.id}.no.${critIndex + 1}`, requirement: reqText });
            });

             updatedRequirement.checks.push(check);
        });

        // --- Compare and Save ---
        const updatedRequirementString = JSON.stringify(updatedRequirement);
        let changed = !isEditing || (originalRequirementString !== updatedRequirementString);

        // Handle key change due to title edit
        if (isEditing && reqKey !== newReqKey) {
            console.warn(`Kravnyckel ändrades under redigering från "${reqKey}" till "${newReqKey}".`);
            changed = true;
        }


        if (changed) {
            console.log(isEditing ? "Kravet ändrades:" : "Nytt krav skapat:", updatedRequirement);

            // If key changed during edit, remove the old entry
            if (isEditing && reqKey !== newReqKey) {
                delete state.jsonData.requirements[reqKey];
                console.log(`Gammal nyckel "${reqKey}" borttagen.`);
            }

            // Add/update the requirement with the (potentially new) key
            state.jsonData.requirements[newReqKey] = updatedRequirement;
            state.setState('isDataModified', true);
            if(saveChangesButton) saveChangesButton.classList.remove('hidden');

            // Navigate to the detail view of the saved/added requirement
            state.setState('lastFocusedReqKey', newReqKey); // Set focus target for detail view
            displayRequirementDetail(newReqKey);

            // Display confirmation message
            const targetArea = document.getElementById('dynamicContentArea');
            if (targetArea) {
                 const actionText = isEditing ? 'uppdaterat' : 'tillagt';
                 displayConfirmation(`Kravet "${escapeHtml(updatedRequirement.title)}" har ${actionText}. Glöm inte spara filen.`, 'save', targetArea);
            }
        } else {
            // No changes detected, navigate back without saving state
             if (isEditing) {
                state.setState('lastFocusedReqKey', reqKey); // Keep focus target
                 displayRequirementDetail(reqKey);
            } else {
                 displayRequirements(); // Go back to list if adding new but no changes
            }
            console.log("Inga ändringar upptäcktes i kravet.");
        }

    } catch (error) {
        console.error("Fel vid spara av krav:", error);
        showError(`Kunde inte spara kravet. Se konsolen för detaljer. Fel: ${escapeHtml(error.message)}`, dynamicContentArea);
    }
}

// --- Helper functions for form rendering --- (inga ändringar här)

/**
 * Extraherar unika huvud- och underkategoritexter från alla krav.
 * @param {object} requirements Objektet med alla krav.
 * @returns {{mainCategories: string[], subCategories: string[]}} Sorterade listor med unika kategoritexter.
 */
function extractCategories(requirements) {
    const mainCategoriesSet = new Set();
    const subCategoriesSet = new Set();

    if (requirements && typeof requirements === 'object') {
        Object.values(requirements).forEach(req => {
            if (req?.metadata) {
                // Handle both string and object formats for categories
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

/**
 * Skapar en select-dropdown för kategorier.
 * @param {string} labelText Text för label.
 * @param {string} name Name-attribut för select.
 * @param {string[]} categories Lista med kategoritexter.
 * @param {string} selectedValue Förvald kategori.
 * @param {boolean} [allowEmpty=false] Om ett tomt val ("-- Ingen --") ska tillåtas.
 * @returns {HTMLDivElement} Containern med label och select.
 */
function createCategorySelect(labelText, name, categories, selectedValue, allowEmpty = false) {
    const container = createFormField(labelText, name, '', 'select'); // createFormField now just returns container for select
    const select = document.createElement('select');
    const inputId = container.querySelector('label')?.htmlFor || `select-${name.replace('.', '-')}`; // Get ID from label if possible
    select.id = inputId;
    select.name = name;
    select.required = !allowEmpty; // Required if empty is not allowed

    if (allowEmpty) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Ingen --';
        if (!selectedValue) emptyOption.selected = true; // Select if no value is pre-selected
        select.appendChild(emptyOption);
    } else {
         // Add a disabled prompt option if not allowing empty and no value selected
         const promptOption = document.createElement('option');
         promptOption.value = '';
         promptOption.textContent = '-- Välj kategori --';
         if (!selectedValue) {
            promptOption.selected = true;
            promptOption.disabled = true; // Make it non-selectable
         }
         select.appendChild(promptOption);
    }


    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat; // Value is the text itself
        option.textContent = cat;
        if (cat === selectedValue) {
            option.selected = true;
            // If this is selected, make sure the prompt option is not selected
            if (!allowEmpty && select.options[0]?.disabled) {
                 select.options[0].selected = false;
            }
        }
        select.appendChild(option);
    });

    container.appendChild(select); // Add the select element to the container
    return container;
}


/**
 * Hämtar kategorivärdet (text + genererad nyckel) från formuläret.
 * @param {HTMLFormElement} form Formuläret.
 * @param {string} name Name-attributet för fältet som innehåller texten.
 * @returns {object|string} Ett objekt {text, key} eller en tom sträng.
 */
function getCategoryValue(form, name) {
    const element = form.elements[name];
    const textValue = element ? element.value.trim() : '';
    if (textValue) {
        return { text: textValue, key: generateKeyFromName(textValue) || "" }; // Ensure key is generated
    }
    return ""; // Return empty string if no text value
}


// --- Requirement Deletion Functions --- (Ingen logisk ändring här)

/**
 * Visar en bekräftelsedialog innan ett krav raderas.
 * @param {string} reqKey Nyckeln för kravet som ska raderas.
 */
export function confirmDeleteRequirement(reqKey) {
    const requirement = state.jsonData?.requirements?.[reqKey];
    if (!requirement) {
        showError(`Kan inte radera: Krav med nyckel ${escapeHtml(reqKey)} hittades inte.`, dynamicContentArea);
        displayRequirements(); // Go back to the list
        return;
    }

    state.setState('currentRequirementKey', reqKey); // Keep track of which req we might delete
    state.setState('lastFocusedReqKey', reqKey); // Set focus target for return trip if cancelled

    setupContentArea(true, false); // Clear area, no filter/sort
    if (!dynamicContentArea) return;
    dynamicContentArea.classList.add('delete-confirmation-view');

    const heading = document.createElement('h2');
    heading.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.warning}</span> Radera krav?`;
    dynamicContentArea.appendChild(heading);

    const warningText = document.createElement('p');
    warningText.innerHTML = `Är du säker på att du vill radera kravet: <strong>${escapeHtml(requirement.title || reqKey)}</strong>?<br>Åtgärden kan inte ångras direkt här.`;
    dynamicContentArea.appendChild(warningText);

    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');

    const keepButton = document.createElement('button');
    keepButton.type = 'button'; // Important: not submit
    keepButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.keep}</span> Behåll kravet`;
    keepButton.addEventListener('click', () => displayRequirementDetail(reqKey)); // Go back to detail view
    buttonDiv.appendChild(keepButton);

    const deleteConfirmButton = document.createElement('button');
    deleteConfirmButton.type = 'button'; // Important: not submit
    deleteConfirmButton.classList.add('button-danger');
    deleteConfirmButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.delete}</span> Ja, radera kravet`;
    deleteConfirmButton.addEventListener('click', () => deleteRequirement(reqKey));
    buttonDiv.appendChild(deleteConfirmButton);

    dynamicContentArea.appendChild(buttonDiv);

    // Focus the "Keep" button initially for safety
    setTimeout(() => keepButton.focus(), 50);
}


/**
 * Raderar ett krav från state.jsonData och uppdaterar UI.
 * @param {string} reqKeyToDelete Nyckeln för kravet att radera.
 */
function deleteRequirement(reqKeyToDelete) {
    const requirement = state.jsonData?.requirements?.[reqKeyToDelete];
    if (!requirement) {
        // Should not happen if confirmDeleteRequirement worked, but check anyway
        showError(`Kan inte radera: Krav med nyckel ${escapeHtml(reqKeyToDelete)} hittades inte.`, dynamicContentArea);
        displayRequirements();
        return;
    }

    const deletedTitle = requirement.title || reqKeyToDelete; // Get title for confirmation message

    // Delete from state
    delete state.jsonData.requirements[reqKeyToDelete];
    state.setState('isDataModified', true);
    if(saveChangesButton) saveChangesButton.classList.remove('hidden');
    state.setState('currentRequirementKey', null); // No requirement is currently selected
    state.setState('lastFocusedReqKey', null); // Clear focus target

    console.log(`Krav "${deletedTitle}" (nyckel: ${reqKeyToDelete}) raderades.`);

    // Refresh the requirements list
    displayRequirements();

    // Show confirmation message in the list view
    const targetArea = document.getElementById('dynamicContentArea');
    if (targetArea) {
         displayConfirmation(`Kravet "${escapeHtml(deletedTitle)}" har raderats. Glöm inte spara filen.`, 'delete', targetArea);
    }
}


console.log("Module loaded: requirement_functions");