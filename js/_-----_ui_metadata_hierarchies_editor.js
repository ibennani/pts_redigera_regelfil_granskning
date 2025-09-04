// js/_-----_ui_metadata_hierarchies_editor.js
/*
    MODIFIED:
    - FIXED CRITICAL BUG: The `renderHierarchyItem` function was missing a `return li;`
      statement at the end, causing it to return undefined and breaking the
      editor rendering completely. This has been restored.
*/

import { ICONS } from './_-----_constants.js';
import { generateKeyFromName, escapeHtml, getVal } from './_-----_utils__helpers.js';
import { setupContentArea, displayConfirmationModal, autoResizeTextarea } from './_-----_ui_functions.js';
import * as state from './_-----_global_state.js';

// --- COPIED LOCALLY to break dependency cycle ---
function createFormField(labelText, name, value, type = 'text', instructionText = null) {
    const container = document.createElement('div');
    container.classList.add('form-field');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const inputId = `form-${name.replace(/[\.\[\]]/g, '-')}-${randomSuffix}`;

    const label = document.createElement('label');
    label.htmlFor = inputId;
    label.textContent = labelText;

    container.appendChild(label);

    if (instructionText) {
        const instr = document.createElement('p');
        instr.className = 'field-instruction';
        instr.textContent = instructionText;
        container.appendChild(instr);
    }

    let inputElement;

    if (type === 'checkbox') {
        container.innerHTML = '';
        container.classList.add('form-field-checkbox');
        inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.id = inputId;
        inputElement.name = name;
        inputElement.checked = !!value;

        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = inputId;
        checkboxLabel.textContent = labelText;
        container.appendChild(inputElement);
        container.appendChild(checkboxLabel);
    } else {
        if (type === 'textarea') {
            inputElement = document.createElement('textarea');
            inputElement.rows = 3;
        } else {
            inputElement = document.createElement('input');
            inputElement.type = type;
        }
        inputElement.id = inputId;
        inputElement.name = name;
        inputElement.value = value ?? '';
        container.appendChild(inputElement);
    }
    return container;
}


// --- Main exported function to create the editor ---
export function createDynamicHierarchyEditor(title, dataKey, data, config) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'hierarchy-editor-fieldset';
    
    const legend = document.createElement('legend');
    legend.textContent = title;
    fieldset.appendChild(legend);

    const editorContainer = document.createElement('div');
    editorContainer.id = `editor-${dataKey.replace(/\./g, '-')}`;
    editorContainer.className = 'hierarchy-editor-container';
    editorContainer.dataset.childrenKey = config.childrenKey;
    editorContainer.dataset.config = JSON.stringify(config);

    const list = document.createElement('ul');
    list.className = 'hierarchy-list-level-0';
    
    if (Array.isArray(data)) {
        data.forEach(itemData => {
            const itemElement = renderHierarchyItem(itemData, 0, config, config.onCancel);
            list.appendChild(itemElement);
        });
    }

    editorContainer.appendChild(list);
    fieldset.appendChild(editorContainer);
    
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'add-item-button';
    addButton.innerHTML = `${ICONS.add} Lägg till ${config.labels.mainItem}`;
    addButton.addEventListener('click', () => {
        renderHierarchyItemForm(null, 0, config, (newItemData) => {
            const newItemElement = renderHierarchyItem(newItemData, 0, config, config.onCancel);
            list.appendChild(newItemElement);
            updateMoveButtons(list);
            config.onCancel(); 
        }, config.onCancel);
    });
    fieldset.appendChild(addButton);

    updateMoveButtons(list);
    enableDragAndDrop(list);

    return fieldset;
}

export function parseHierarchyEditorData(editorContainer) {
    if (!editorContainer) return [];
    
    const config = JSON.parse(editorContainer.dataset.config);
    const childrenKey = config.childrenKey;
    const data = [];

    const topLevelItems = editorContainer.querySelectorAll(':scope > ul > li.hierarchy-item-level-0');
    
    topLevelItems.forEach(li => {
        const item = JSON.parse(li.dataset.itemData);
        const subList = li.querySelector(':scope > ul');
        
        item[childrenKey] = [];

        if (subList) {
            subList.querySelectorAll(':scope > li.hierarchy-item-level-1').forEach(subLi => {
                item[childrenKey].push(JSON.parse(subLi.dataset.itemData));
            });
        }
        data.push(item);
    });

    return data;
}

function renderHierarchyItem(itemData, level, config, onCancel) {
    const li = document.createElement('li');
    li.className = `hierarchy-item hierarchy-item-level-${level}`;
    li.dataset.itemData = JSON.stringify(itemData);
    li.draggable = true;

    const itemContent = document.createElement('div');
    itemContent.className = 'hierarchy-item-content';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '≡';
    dragHandle.setAttribute('aria-hidden', 'true');
    itemContent.appendChild(dragHandle);

    const moveButtons = document.createElement('div');
    moveButtons.className = 'move-buttons';
    const moveUpBtn = createMoveButton('up', `Flytta upp (${itemData.text})`, () => handleMove(li, 'up'));
    const moveDownBtn = createMoveButton('down', `Flytta ner (${itemData.text})`, () => handleMove(li, 'down'));
    moveButtons.appendChild(moveUpBtn);
    moveButtons.appendChild(moveDownBtn);
    itemContent.appendChild(moveButtons);

    const itemText = document.createElement('span');
    itemText.className = 'item-text';
    itemText.textContent = itemData.text;
    itemContent.appendChild(itemText);

    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit-item-btn req-edit-button';
    editBtn.innerHTML = `Redigera <span class="icon">${ICONS.edit}</span>`;
    editBtn.setAttribute('aria-label', `Redigera ${itemData.text}`);
    editBtn.addEventListener('click', () => {
        const currentData = JSON.parse(li.dataset.itemData);
        renderHierarchyItemForm(currentData, level, config, (updatedItemData) => {
            li.dataset.itemData = JSON.stringify(updatedItemData);
            li.querySelector('.item-text').textContent = updatedItemData.text;
            li.querySelectorAll('button[aria-label]').forEach(btn => {
                btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace(currentData.text, updatedItemData.text));
            });
            onCancel(); 
        }, onCancel);
    });
    actionButtons.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'remove-item-button button-danger';
    deleteBtn.innerHTML = `Ta bort <span class="icon">${ICONS.delete}</span>`;
    deleteBtn.setAttribute('aria-label', `Ta bort ${itemData.text}`);
    deleteBtn.addEventListener('click', () => {
        const children = itemData[config.childrenKey];
        const hasChildren = Array.isArray(children) && children.length > 0;
        const message = hasChildren
            ? `Är du säker på att du vill ta bort <strong>${escapeHtml(itemData.text)}</strong> och alla dess underobjekt?`
            : `Är du säker på att du vill ta bort <strong>${escapeHtml(itemData.text)}</strong>?`;
        displayConfirmationModal({
            title: 'Ta bort objekt?',
            message: message,
            confirmText: 'Ja, ta bort',
            onConfirm: () => {
                const parentList = li.parentElement;
                li.remove();
                updateMoveButtons(parentList);
            }
        });
    });
    actionButtons.appendChild(deleteBtn);
    itemContent.appendChild(actionButtons);
    
    li.appendChild(itemContent);
    
    if (level === 0) {
        const subList = document.createElement('ul');
        subList.className = 'hierarchy-list-level-1';
        const children = itemData[config.childrenKey];
        if (Array.isArray(children)) {
            children.forEach(subItemData => {
                subList.appendChild(renderHierarchyItem(subItemData, 1, config, onCancel));
            });
        }
        li.appendChild(subList);
        updateMoveButtons(subList);
        enableDragAndDrop(subList);

        const addSubButton = document.createElement('button');
        addSubButton.type = 'button';
        addSubButton.className = 'add-item-button sub-item-add-btn';
        addSubButton.innerHTML = `${ICONS.add} Lägg till ${config.labels.subItem}`;
        addSubButton.addEventListener('click', () => {
            renderHierarchyItemForm(null, 1, config, (newItemData) => {
                const newItemElement = renderHierarchyItem(newItemData, 1, config, onCancel);
                subList.appendChild(newItemElement);
                updateMoveButtons(subList);
                onCancel();
            }, onCancel);
        });
        li.appendChild(addSubButton);
    }
    
    // FIXED: The missing return statement that caused the crash.
    return li;
}

export function renderHierarchyItemForm(itemData, level, config, onSave, onCancel) {
    setupContentArea(true, false);
    const targetArea = document.getElementById('dynamicContentArea');
    targetArea.classList.add('form-container');

    const isEditing = itemData !== null;
    const itemTypeLabel = level === 0 ? config.labels.mainItem : config.labels.subItem;
    const fields = level === 0 ? config.fields.mainItem : config.fields.subItem;
    
    const form = document.createElement('form');
    
    const heading = document.createElement('h1');
    heading.textContent = `${isEditing ? 'Redigera' : 'Lägg till'} ${itemTypeLabel}`;
    form.appendChild(heading);

    // Render standard fields (name, description, etc.)
    fields.forEach(fieldConfig => {
        const value = isEditing ? itemData[fieldConfig.name] : (fieldConfig.type === 'checkbox' ? false : '');
        const formField = createFormField(fieldConfig.label, fieldConfig.name, value, fieldConfig.type, '');
        const input = formField.querySelector('input, textarea');
        if (input && fieldConfig.required) input.required = true;
        if (input && input.tagName === 'TEXTAREA') {
            input.addEventListener('input', () => autoResizeTextarea(input));
            setTimeout(() => autoResizeTextarea(input), 10);
        }
        form.appendChild(formField);
    });

    // --- Advanced management section for sub-items (level 1) ---
    if (level === 1 && isEditing) {
        
        // --- MODIFIED BLOCK STARTS HERE ---
        const moveFieldset = document.createElement('fieldset');
        const moveLegend = document.createElement('legend');
        moveLegend.textContent = 'Flytta till huvudkategori';
        moveFieldset.appendChild(moveLegend);
        
        const mainCategories = getVal(state.jsonData, 'metadata.contentTypes', []);
        // Create select element directly without a wrapper or an extra empty label
        const select = document.createElement('select');
        select.name = 'newMainCategoryId';
        select.id = 'newMainCategoryId';
        select.setAttribute('aria-label', 'Ny huvudkategori'); // For accessibility

        mainCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.text;
            if (Array.isArray(cat.types) && cat.types.some(sub => sub.id === itemData.id)) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        // Append the select element directly to the fieldset
        moveFieldset.appendChild(select);
        form.appendChild(moveFieldset);
        // --- MODIFIED BLOCK ENDS HERE ---

        // --- Requirement Association Section ---
        const associationFieldset = document.createElement('fieldset');
        const associationLegend = document.createElement('legend');
        associationLegend.textContent = 'Kopplade krav';
        associationFieldset.appendChild(associationLegend);

        const filterContainer = document.createElement('div');
        filterContainer.className = 'association-filter-container';
        const filterSelect = document.createElement('select');
        filterSelect.innerHTML = `
            <option value="associated">Visa kopplade krav</option>
            <option value="all">Visa alla krav</option>
        `;
        filterContainer.appendChild(filterSelect);
        associationFieldset.appendChild(filterContainer);

        const reqListContainer = document.createElement('div');
        reqListContainer.className = 'requirement-association-list';
        associationFieldset.appendChild(reqListContainer);

        const renderList = () => {
            renderRequirementAssociationList(reqListContainer, itemData.id, filterSelect.value);
        };
        
        filterSelect.addEventListener('change', renderList);
        renderList(); // Initial render

        form.appendChild(associationFieldset);
    }
    
    // --- Form Buttons ---
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'form-buttons';
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Spara';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Avbryt';
    cancelButton.addEventListener('click', onCancel);
    buttonGroup.appendChild(saveButton);
    buttonGroup.appendChild(cancelButton);
    form.appendChild(buttonGroup);
    
    targetArea.appendChild(form);

    // --- Save Logic ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const newItemData = isEditing ? { ...itemData } : {};
        let associationsChanged = false;
        let categoryMoved = false;

        fields.forEach(fieldConfig => {
            if (fieldConfig.type === 'checkbox') {
                newItemData[fieldConfig.name] = formData.has(fieldConfig.name);
            } else {
                newItemData[fieldConfig.name] = formData.get(fieldConfig.name).trim();
            }
        });
        if (!isEditing) {
            const newId = generateKeyFromName(newItemData.text);
            newItemData.id = newId ? newId + '-' + Math.random().toString(36).substr(2, 5) : 'item-' + Date.now();
        }

        if (level === 1 && isEditing) {
            const checkboxes = form.querySelectorAll('.requirement-association-list input[type="checkbox"]');
            checkboxes.forEach(cb => {
                const reqKey = cb.dataset.reqKey;
                const requirement = state.jsonData.requirements[reqKey];
                if (!requirement) return;
                
                if (!Array.isArray(requirement.contentType)) {
                    requirement.contentType = [];
                }
                const hasAssociation = requirement.contentType.includes(itemData.id);

                if (cb.checked && !hasAssociation) {
                    requirement.contentType.push(itemData.id);
                    associationsChanged = true;
                } else if (!cb.checked && hasAssociation) {
                    requirement.contentType = requirement.contentType.filter(id => id !== itemData.id);
                    associationsChanged = true;
                }
            });

            const newParentId = formData.get('newMainCategoryId');
            const mainCategories = getVal(state.jsonData, 'metadata.contentTypes', []);
            const oldParent = mainCategories.find(cat => Array.isArray(cat.types) && cat.types.some(sub => sub.id === itemData.id));
            
            if (oldParent && oldParent.id !== newParentId) {
                categoryMoved = true;
                oldParent.types = oldParent.types.filter(sub => sub.id !== itemData.id);
                const newParent = mainCategories.find(cat => cat.id === newParentId);
                if (newParent) {
                    if (!Array.isArray(newParent.types)) {
                        newParent.types = [];
                    }
                    newParent.types.push(newItemData);
                }
            }
        }
        
        if(associationsChanged || categoryMoved) {
            state.setState('isDataModified', true);
        }
        onSave(newItemData);
    });

    setTimeout(() => {
        form.querySelectorAll('textarea').forEach(ta => autoResizeTextarea(ta));
    }, 15);

    const firstInput = form.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
}

function renderRequirementAssociationList(container, contentTypeId, filter) {
    container.innerHTML = '';
    let requirements = Object.values(state.jsonData.requirements);

    if (filter === 'associated') {
        requirements = requirements.filter(req => Array.isArray(req.contentType) && req.contentType.includes(contentTypeId));
    }

    requirements.sort(sortRequirementsForAssociation);

    if (requirements.length === 0) {
        container.innerHTML = `<p><em>Inga krav att visa för detta filter.</em></p>`;
        return;
    }

    requirements.forEach(req => {
        const isChecked = Array.isArray(req.contentType) && req.contentType.includes(contentTypeId);
        const reqKey = req.key || 'nyckel-saknas';
        const labelText = `<strong>${escapeHtml(getVal(req, 'standardReference.text', reqKey))}</strong>: ${escapeHtml(req.title)}`;
        const field = createFormField(labelText, `req-assoc-${reqKey}`, reqKey, 'checkbox');
        field.querySelector('label').innerHTML = labelText;
        const checkbox = field.querySelector('input');
        checkbox.checked = isChecked;
        checkbox.dataset.reqKey = reqKey;
        container.appendChild(field);
    });
}

function sortRequirementsForAssociation(a, b) {
    const refA = getVal(a, 'standardReference.text', a.key || '');
    const refB = getVal(b, 'standardReference.text', b.key || '');
    
    const refCompare = refA.localeCompare(refB, 'sv', { numeric: true, sensitivity: 'base' });
    if (refCompare !== 0) {
        return refCompare;
    }
    
    const titleA = a.title || '';
    const titleB = b.title || '';
    return titleA.localeCompare(titleB, 'sv');
}

function createMoveButton(direction, ariaLabel, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `move-item-btn move-${direction}-btn`;
    btn.setAttribute('aria-label', ariaLabel);
    btn.innerHTML = direction === 'up' ? '▲' : '▼';
    btn.addEventListener('click', (e) => {
        onClick();
        e.currentTarget.focus();
    });
    return btn;
}

function handleMove(item, direction) {
    const parentList = item.parentElement;
    if (direction === 'up' && item.previousElementSibling) {
        parentList.insertBefore(item, item.previousElementSibling);
    } else if (direction === 'down' && item.nextElementSibling) {
        parentList.insertBefore(item.nextElementSibling, item);
    }
    updateMoveButtons(parentList);
}

function updateMoveButtons(list) {
    if (!list) return;
    const items = Array.from(list.children);
    items.forEach((item, index) => {
        const upBtn = item.querySelector('.move-up-btn');
        const downBtn = item.querySelector('.move-down-btn');
        if (upBtn) upBtn.disabled = (index === 0);
        if (downBtn) downBtn.disabled = (index === items.length - 1);
    });
}

function enableDragAndDrop(list) {
    let draggedItem = null;

    list.addEventListener('dragstart', (e) => {
        if (e.target.matches('li.hierarchy-item')) {
            draggedItem = e.target;
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0);
        } else {
            e.preventDefault();
        }
    });

    list.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            updateMoveButtons(list);
        }
    });
    
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(list, e.clientY);
        const currentlyDragged = document.querySelector('.dragging');
        if (currentlyDragged && currentlyDragged.parentElement === list) {
            if (afterElement == null) {
                list.appendChild(currentlyDragged);
            } else {
                list.insertBefore(currentlyDragged, afterElement);
            }
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(':scope > li.hierarchy-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}