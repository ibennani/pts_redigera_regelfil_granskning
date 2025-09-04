// js/_-----_ui_functions.js
/*
    MODIFIED:
    - The 'autoResizeTextarea' function has been replaced with the full-featured,
      more robust version from the original requirement_functions.js. This version
      accurately calculates line-height and padding for consistent behavior
      across all textareas in the application, including the "+ 1 row" feature.
*/

// Importer
import {
    contentDisplay, uploadSection, postUploadControlsContainer,
    controlsDivider, dynamicContentArea, filterSortRow, sortOrderSelect,
    searchInput, topBar, bottomBar
} from './_-----_dom_element_references.js';
import { escapeHtml } from './_-----_utils__helpers.js';
import { ICONS } from './_-----_constants.js';
import * as state from './_-----_global_state.js';

// --- MODIFIED: Upgraded to the full-featured auto-resize function ---
export function autoResizeTextarea(textarea) {
    if (!textarea) return;
    const originalOverflow = textarea.style.overflowY;
    textarea.style.overflowY = 'hidden';
    textarea.style.height = 'auto';

    const computedStyle = getComputedStyle(textarea);
    let lineHeight = parseFloat(computedStyle.lineHeight);
    if (isNaN(lineHeight) || lineHeight === 0) {
        const tempSpan = document.createElement('span');
        tempSpan.innerHTML = 'A';
        tempSpan.style.font = computedStyle.font;
        tempSpan.style.padding = '0';
        tempSpan.style.border = '0';
        tempSpan.style.position = 'absolute';
        tempSpan.style.visibility = 'hidden';
        document.body.appendChild(tempSpan);
        lineHeight = tempSpan.offsetHeight;
        document.body.removeChild(tempSpan);
        if (lineHeight === 0) lineHeight = 20; // Fallback line-height
    }

    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

    const contentAndPaddingHeight = textarea.scrollHeight;
    const minHeightBasedOnRows = (textarea.rows * lineHeight) + paddingTop + paddingBottom;

    let targetHeight = Math.max(contentAndPaddingHeight, minHeightBasedOnRows);
    
    // Add space for one extra line for better UX, as requested
    if (textarea.value.trim() !== '' || textarea.placeholder) {
       targetHeight += lineHeight;
    }

    const absoluteMinHeight = (2 * lineHeight) + paddingTop + paddingBottom;
    targetHeight = Math.max(targetHeight, absoluteMinHeight);

    textarea.style.height = targetHeight + 'px';
    textarea.style.overflowY = originalOverflow || 'auto';
}

export function createSaveButton(id) {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'save-button';
    button.innerHTML = `Spara filen <span class="icon" aria-hidden="true">${ICONS.save}</span>`;
    return button;
}

export function removeSaveButtons() {
    const buttons = document.querySelectorAll('.save-button');
    buttons.forEach(button => button.remove());
}

export function initializeUI() {
    if (!contentDisplay || !uploadSection || !postUploadControlsContainer) {
        return;
    }
    if (uploadSection.parentNode !== contentDisplay) {
        contentDisplay.appendChild(uploadSection);
    }
    uploadSection.classList.remove('hidden');
    contentDisplay.classList.remove('hidden');
    postUploadControlsContainer.classList.add('hidden');
    if (controlsDivider) controlsDivider.classList.add('hidden');
    if (dynamicContentArea) {
        dynamicContentArea.innerHTML = '';
        dynamicContentArea.classList.add('hidden');
    }
    if (filterSortRow) filterSortRow.classList.add('hidden');
    if (topBar) topBar.classList.remove('hidden');
    if (bottomBar) bottomBar.classList.add('hidden');
    removeSaveButtons();
    if (sortOrderSelect) sortOrderSelect.value = 'ref-asc';
}

export function setupContentArea(clearDynamic = true, showFilterSort = false) {
    if (!dynamicContentArea) {
        showError("Internt fel: Kunde inte hitta innehållsområdet.", contentDisplay);
        return;
    }
    if (clearDynamic) {
        dynamicContentArea.innerHTML = '';
    }
    dynamicContentArea.classList.remove('form-container', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
    dynamicContentArea.classList.remove('hidden');
    if (filterSortRow) {
        filterSortRow.classList.toggle('hidden', !showFilterSort);
    }
}

export function showError(message, container = dynamicContentArea) {
    if (!container) container = contentDisplay;
    if (container === dynamicContentArea || container === contentDisplay) {
        if (postUploadControlsContainer) postUploadControlsContainer.classList.add('hidden');
        if (controlsDivider) controlsDivider.classList.add('hidden');
        if (filterSortRow) filterSortRow.classList.add('hidden');
        if (bottomBar) bottomBar.classList.add('hidden');
        removeSaveButtons();
        if (dynamicContentArea && container === contentDisplay) {
            dynamicContentArea.classList.add('hidden');
        }
    }
    if (container) {
        container.innerHTML = `<p class="error">${ICONS.warning} ${escapeHtml(message)}</p>`;
        container.classList.remove('hidden');
    } else {
        alert("Ett allvarligt fel uppstod: " + message);
    }
}

export function displayConfirmation(message, type = 'info', container = dynamicContentArea) {
    if (!container) return;
    const existingConfirmations = container.querySelectorAll('.confirmation-message');
    existingConfirmations.forEach(el => el.remove());
    const confirmation = document.createElement('p');
    const icon = type === 'save' ? ICONS.confirm : type === 'delete' ? ICONS.delete : ICONS.info;
    confirmation.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span> ${escapeHtml(message)}`;
    confirmation.classList.add('confirmation-message', `${type}-confirmation`);
    confirmation.setAttribute('role', 'status');
    const firstHeading = container.querySelector('h2, h3');
    if (firstHeading && firstHeading.parentNode === container) {
        firstHeading.parentNode.insertBefore(confirmation, firstHeading.nextSibling);
    } else {
        container.prepend(confirmation);
    }
    setTimeout(() => { if (confirmation.parentNode) confirmation.remove(); }, 5000);
}

export function resetUI() {
    initializeUI();
    state.setState('jsonData', null);
    state.setState('currentRequirementKey', null);
    state.setState('lastFocusedReqKey', null);
    state.setState('isDataModified', false);
    state.setState('currentSortOrder', 'category-asc');
    state.setState('currentSearchTerm', '');
    if (sortOrderSelect) sortOrderSelect.value = state.currentSortOrder;
    if (searchInput) searchInput.value = '';
    if (window.history.replaceState) {
       history.replaceState(null, '', window.location.pathname);
    }
}

export function updateSaveButtonsState() {
    const buttons = document.querySelectorAll('.save-button');
    if (buttons.length === 0) return;
    const hasUnsavedChanges = state.isDataModified;
    const text = hasUnsavedChanges ? "Spara nya ändringar" : "Spara filen";
    const iconHTML = `<span class="icon" aria-hidden="true">${ICONS.save}</span>`;
    buttons.forEach(button => {
        button.innerHTML = `${text} ${iconHTML}`;
        button.classList.toggle('has-unsaved-changes', hasUnsavedChanges);
    });
}

export function displayConfirmationModal({ title, message, confirmText, cancelText = 'Avbryt', onConfirm }) {
    const triggerElement = document.activeElement;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content confirmation-modal';
    modalContent.setAttribute('role', 'alertdialog');
    modalContent.setAttribute('aria-modal', 'true');
    modalContent.setAttribute('aria-labelledby', 'modal-title');
    modalContent.setAttribute('aria-describedby', 'modal-message');

    modalContent.innerHTML = `
        <h3 id="modal-title">${ICONS.warning} ${escapeHtml(title)}</h3>
        <p id="modal-message">${message}</p>
    `;

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'form-buttons';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = cancelText;
    cancelButton.addEventListener('click', closeModal);
    
    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'button-danger';
    confirmButton.textContent = confirmText;
    confirmButton.addEventListener('click', () => {
        onConfirm();
        closeModal();
    });

    buttonGroup.appendChild(cancelButton);
    buttonGroup.appendChild(confirmButton);
    modalContent.appendChild(buttonGroup);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    cancelButton.focus();

    const focusableElements = [cancelButton, confirmButton];
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    function trapFocus(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        }
        if (e.key === 'Escape') {
            closeModal();
        }
    }
    
    document.addEventListener('keydown', trapFocus);

    function closeModal() {
        document.removeEventListener('keydown', trapFocus);
        if(modalOverlay.parentNode) {
            document.body.removeChild(modalOverlay);
        }
        if (triggerElement) {
            triggerElement.focus();
        }
    }
}