// ----- DOM ELEMENT REFERENCES -----
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const contentDisplay = document.getElementById('contentDisplay');
const postUploadControlsContainer = document.getElementById('postUploadControlsContainer');
const dynamicContentArea = document.getElementById('dynamicContentArea');
const controlsDivider = document.getElementById('controlsDivider');
const showMetadataButton = document.getElementById('showMetadataButton');
const showRequirementsButton = document.getElementById('showRequirementsButton');
const addRequirementButton = document.getElementById('addRequirementButton');
const saveChangesButton = document.getElementById('saveChangesButton');
const sortControls = document.getElementById('sortControls');
const sortOrderSelect = document.getElementById('sortOrderSelect');
const searchInput = document.getElementById('searchInput');
const filterSortRow = document.getElementById('filterSortRow');

// ----- GLOBAL STATE -----
let jsonData = null;
let currentRequirementKey = null;
let lastFocusedReqKey = null;
let isDataModified = false;
// Default sort order remains category-asc
let currentSortOrder = 'category-asc'; // Options: category-asc, category-desc, ref-asc, ref-desc, impact-critical-first, impact-critical-last
let currentSearchTerm = '';

// ----- CONSTANTS -----
const commonLanguages = { "sv": "Svenska", "en": "English", "de": "Deutsch", "fr": "Français", "es": "Español", "fi": "Suomi", "no": "Norsk (Bokmål)", "nn": "Norsk (Nynorsk)", "da": "Dansk", "is": "Íslenska" };
const ICONS = { upload: '⬆️', info: 'ℹ️', list: '📋', add: '➕', save: '💾', edit: '✏️', delete: '🗑️', view: '👁️', cancel: '❌', back: '⬅️', confirm: '✔️', keep: '↩️', warning: '⚠️', search: '🔍' };

// Standard keys expected for each requirement when saving
// Used in downloadJsonFile to ensure keys exist
const STANDARD_REQUIREMENT_KEYS = [
    "metadata", "id", "title", "standardReference", "instructions", "checks",
    "exceptions", "examples", "tips", "commonErrors", "contentType", "key"
];
// Default values for keys if they are missing upon saving
const REQUIREMENT_KEY_DEFAULTS = {
    metadata: { // Will be handled more specifically to ensure nested structure
        mainCategory: { key: "", text: "" },
        subCategory: { key: "", text: "" },
        impact: { isCritical: false, primaryScore: 0, secondaryScore: 0, assumedCompliance: false }
    },
    id: "", // Generated UUID, should exist
    title: "",
    standardReference: { text: "", url: "" }, // Ensure object structure
    instructions: [],
    checks: [],
    exceptions: "",
    examples: "",
    tips: "",
    commonErrors: "",
    contentType: [],
    key: "" // Generated key, should exist
};
// Define possible monitoring types
const MONITORING_TYPES = [
    { type: 'web', text: 'Webbplats' },
    { type: 'app', text: 'Mobilapp' },
    { type: 'product', text: 'Produkt' } // Lägg till fler vid behov
];


// ----- UTILS / HELPERS -----
function isValidEmail(email) { if (!email || typeof email !== 'string') return false; const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return emailRegex.test(email.toLowerCase()); }

// Corrected escapeHtml function
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
function parseSimpleMarkdown(text) { if (typeof text !== 'string' || !text) return ''; const placeholders = {}; let placeholderId = 0; text = text.replace(/<(a|pre)\b[^>]*>.*?<\/\1>/gi, (match) => { const id = `__HTMLPLACEHOLDER_${placeholderId++}__`; placeholders[id] = match; return id; }); text = text.replace(/<(br|hr)\b[^>]*\/?>/gi, (match) => { const id = `__HTMLPLACEHOLDER_${placeholderId++}__`; placeholders[id] = match; return id; }); text = text.replace(/\*\*(?=\S)(.+?[_*]*)(?<=\S)\*\*|__(?=\S)(.+?[_*]*)(?<=\S)__/gs, (match, p1, p2) => `<strong>${p1 || p2}</strong>`); text = text.replace(/(?<!\w|\*|_)(\*|_)(?=\S)(.+?[_*]*)(?<=\S)\1(?!\w|\*|_)/gs, (match, marker, content) => `<em>${content}</em>`); text = escapeHtml(text); for (let i = placeholderId - 1; i >= 0; i--) { const id = `__HTMLPLACEHOLDER_${i}__`; text = text.replace(id, () => placeholders[id]); } return text; }

// *** DEL 2/5 - Fortsättning från föregående kodblock ***

function generateKeyFromName(name) { if (!name) return ''; return name.toLowerCase().replace(/[åáàâã]/g, 'a').replace(/[äæ]/g, 'a').replace(/[öøóòôõ]/g, 'o').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40); }
function generateRequirementKey(title, uuid) { const titleKeyPart = generateKeyFromName(title || 'untitled'); const uuidPart = uuid ? uuid.substring(0, 8) : Date.now().toString(36); let combined = `${titleKeyPart}-${uuidPart}`; if (!titleKeyPart) { combined = `req-${uuidPart}`; } return combined.replace(/-+/g, '-').replace(/^-+|-+$/g, ''); }

// Corrected getVal function
const getVal = (obj, path, defaultValue = null) => {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      // Check if result is not null/undefined before accessing property
      if (result !== null && result !== undefined && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        // Path does not exist fully
        return defaultValue;
      }
    }
     // Return the found value, or defaultValue if the final value is undefined
     return result !== undefined ? result : defaultValue;
  } catch (e) {
    console.error(`Error getting value for path "${path}" from object:`, obj, e);
    return defaultValue;
  }
};

// ----- UI FUNCTIONS -----
function initializeUI() {
    console.log("--- Running initializeUI ---");

    // Ensure main containers exist
    if (!contentDisplay) console.error("initializeUI: contentDisplay not found!");
    if (!uploadSection) console.error("initializeUI: uploadSection not found!");
    if (!postUploadControlsContainer) console.error("initializeUI: postUploadControlsContainer not found!");
    if (!controlsDivider) console.error("initializeUI: controlsDivider not found!");
    if (!dynamicContentArea) console.error("initializeUI: dynamicContentArea not found!");
    if (!filterSortRow) console.warn("initializeUI: filterSortRow not found.");


    // Show upload view inside contentDisplay
    if(contentDisplay) {
        contentDisplay.innerHTML = ''; // Clear first
         if (uploadSection) {
             if (uploadSection.parentNode !== contentDisplay) {
                 console.log("Appending uploadSection to contentDisplay.");
                contentDisplay.appendChild(uploadSection);
             }
            uploadSection.classList.remove('hidden');
            console.log("uploadSection should be visible.");
         }
        contentDisplay.classList.remove('hidden');
         console.log("contentDisplay should be visible.");
    }

    // Hide external controls and dynamic area
    if (postUploadControlsContainer) postUploadControlsContainer.classList.add('hidden');
    if (controlsDivider) controlsDivider.classList.add('hidden');
    if (dynamicContentArea) {
        dynamicContentArea.innerHTML = '';
        dynamicContentArea.classList.add('hidden');
        dynamicContentArea.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
    }
    if (filterSortRow) filterSortRow.classList.add('hidden'); // Explicitly hide filter/sort row

    // Reset state flags just in case
    contentDisplay?.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view');
    // Reset sort select to default
    if (sortOrderSelect) sortOrderSelect.value = 'category-asc';

    console.log("--- initializeUI Finished ---");
}

// Updated setupContentArea to log visibility setting
function setupContentArea(clearDynamic = true, showFilterSort = false) {
    const dynArea = document.getElementById('dynamicContentArea');
    if (dynArea) {
        if(clearDynamic) dynArea.innerHTML = '';
        dynArea.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
        dynArea.classList.remove('hidden');
        // console.log("Dynamic area prepared (cleared:", clearDynamic, ")"); // Keep if needed
    } else {
        console.error("Dynamic Content Area (#dynamicContentArea) not found!");
    }
    // Explicitly handle filter/sort row visibility
    if (filterSortRow) {
         // Ensure filterSortRow exists before trying to toggle class
         filterSortRow.classList.toggle('hidden', !showFilterSort);
         console.log(`Filter/Sort row visibility set to: ${showFilterSort ? 'visible' : 'hidden'}. Current classes: ${filterSortRow.className}`);
    } else {
        console.warn("Filter/Sort row (#filterSortRow) not found when trying to set visibility.");
    }
}

function showError(message, container = document.getElementById('dynamicContentArea') || contentDisplay) {
    if (!container) container = contentDisplay; // Fallback if dynamic area fails early

    // If showing error, ensure other controls are hidden if error is in main content area
    if (container === dynamicContentArea || container === contentDisplay) {
         if (postUploadControlsContainer) postUploadControlsContainer.classList.add('hidden');
         if (controlsDivider) controlsDivider.classList.add('hidden');
         if (filterSortRow) filterSortRow.classList.add('hidden');
         if (dynamicContentArea && container !== dynamicContentArea) dynamicContentArea.classList.add('hidden');
    }

    if (container) {
        container.innerHTML = `<p class="error">${escapeHtml(message)}</p>`;
        container.classList.remove('hidden');
        // Clear specific view classes if error is shown in these containers
        if(container === dynamicContentArea || container === contentDisplay) {
            container.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
        }
    } else {
        console.error("Cannot show error in any container. Message:", message);
        alert("Ett fel uppstod: " + message);
    }
}
function displayConfirmation(message, type = 'save', container = document.getElementById('dynamicContentArea')) {
    if (!container) {
        console.error("Confirmation container not found when trying to display:", message);
        return;
    }
    console.log(`Displaying confirmation (type: ${type}) in container:`, container);
    const existingConfirmations = container.querySelectorAll('.confirmation-message');
    existingConfirmations.forEach(el => el.remove());
    const confirmation = document.createElement('p');
    confirmation.textContent = message;
    confirmation.classList.add('confirmation-message', `${type}-confirmation`);
    confirmation.setAttribute('role', 'status');
    const firstHeading = container.querySelector('h2, h3');
    if (firstHeading && firstHeading.parentNode === container) {
        container.insertBefore(confirmation, firstHeading.nextSibling);
    } else {
        container.prepend(confirmation);
    }
    setTimeout(() => { if (confirmation && confirmation.parentNode) confirmation.remove(); }, 5000);
}
function resetUI() {
    if(contentDisplay) contentDisplay.innerHTML = '';
    if (uploadSection) {
        // Re-append uploadSection if it was detached
        if (uploadSection.parentNode !== contentDisplay && contentDisplay) {
            contentDisplay.appendChild(uploadSection);
        }
        uploadSection.classList.remove('hidden');
    }
    if (contentDisplay) contentDisplay.classList.remove('hidden', 'form-view', 'requirement-detail', 'delete-confirmation-view');
    if (postUploadControlsContainer) postUploadControlsContainer.classList.add('hidden');
    if (controlsDivider) controlsDivider.classList.add('hidden');
    const dynArea = document.getElementById('dynamicContentArea');
    if (dynArea) {
        dynArea.innerHTML = '';
        dynArea.classList.add('hidden');
        dynArea.classList.remove('form-view', 'requirement-detail', 'delete-confirmation-view', 'grouped-list-view', 'flat-list-view');
    }
    if(filterSortRow) filterSortRow.classList.add('hidden');

    // Reset state
    currentSortOrder = 'category-asc';
    if(sortOrderSelect) sortOrderSelect.value = currentSortOrder;
    if(searchInput) searchInput.value = '';
    currentSearchTerm = '';
    jsonData = null;
    currentRequirementKey = null;
    lastFocusedReqKey = null;
    isDataModified = false;

    // Remove query params from URL
    history.replaceState(null, '', window.location.pathname);
}

// *** DEL 3/5 - Fortsättning från föregående kodblock ***

// ----- FILE HANDLING -----
function handleFileUpload(event) {
    const file = event.target.files[0];
    // Reset state completely on new upload attempt
    jsonData = null;
    currentRequirementKey = null;
    lastFocusedReqKey = null;
    isDataModified = false;
    currentSortOrder = 'category-asc'; // Reset sort order
    if(sortOrderSelect) sortOrderSelect.value = currentSortOrder;
    if(searchInput) searchInput.value = '';
    currentSearchTerm = '';

    if (!file) {
        console.log("No file selected.");
        resetFileInput();
        // Don't necessarily reset the whole UI if they just cancelled the dialog
        return;
    }

    const uploadSectionRef = document.getElementById('uploadSection');
    const errorContainer = uploadSectionRef || contentDisplay; // Show error in upload area if possible

    if (file.type !== 'application/json') {
        showError(`Felaktig filtyp. Förväntade JSON, fick: ${file.type || 'okänd'}`, errorContainer);
        resetFileInput();
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsedJson = JSON.parse(e.target.result);
            // Basic validation
            if (!parsedJson || typeof parsedJson !== 'object') throw new Error('JSON är inte ett objekt.');
            if (!parsedJson.metadata || typeof parsedJson.metadata !== 'object') throw new Error('Saknar eller har felaktig "metadata".');
            if (!parsedJson.requirements || typeof parsedJson.requirements !== 'object') throw new Error('Saknar eller har felaktig "requirements".');

            // ** Lägg till default för monitoringType om det saknas **
            if (!parsedJson.metadata.monitoringType) {
                console.log("JSON saknar monitoringType, lägger till default (webbplats).");
                parsedJson.metadata.monitoringType = { type: "web", text: "Webbplats" };
            }

            jsonData = parsedJson; // Assign successfully parsed data
            console.log("Parsed jsonData:", jsonData);
            isDataModified = false; // Reset modification flag

            // Update UI state
            if (contentDisplay) contentDisplay.classList.add('hidden'); // Hide initial upload/content area
            if (postUploadControlsContainer) postUploadControlsContainer.classList.remove('hidden');
            else console.error("Controls container not found!");
            if (controlsDivider) controlsDivider.classList.remove('hidden');
            else console.error("Divider not found!");
            if (saveChangesButton) saveChangesButton.classList.add('hidden'); // Hide save initially
            if (filterSortRow) filterSortRow.classList.add('hidden'); // Hide filter/sort initially
            if (dynamicContentArea) {
                 setupContentArea(true, false); // Clear dynamic area, don't show filter/sort yet
                 dynamicContentArea.classList.remove('hidden');
                 dynamicContentArea.innerHTML = `<p>Regelfil <strong>${escapeHtml(file.name)}</strong> uppladdad (Version: ${escapeHtml(jsonData?.metadata?.version || 'okänd')}). Välj vad du vill visa.</p>`;
            } else {
                 console.error("Dynamic content area not found!");
                 alert("Kunde inte visa innehållsområdet efter uppladdning.");
            }
            console.log("UI updated after successful upload.");

        } catch (error) {
            console.error("JSON parsing error:", error);
            // Reset UI to initial state on error
            resetUI();
            // Show error in the main content display area
            showError(`Kunde inte läsa JSON-filen. Är den korrekt formaterad?\nFel: ${escapeHtml(error.message)}`, contentDisplay);
        } finally {
            resetFileInput(); // Clear the file input regardless of success/failure
        }
    };

    reader.onerror = (e) => {
        console.error("File reading error:", e);
        // Reset UI to initial state on error
        resetUI();
        // Show error in the main content display area
        showError('Ett fel uppstod vid läsning av filen.', contentDisplay);
        resetFileInput();
    };

    reader.readAsText(file);
}

function resetFileInput() {
    // Ensure file input exists before trying to clear it
    if(fileInput) {
        fileInput.value = '';
    }
}

function updateVersion() {
    if (!jsonData || !jsonData.metadata) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // Månader är 0-indexerade, så +1 (1-12)
    const currentPaddedMonth = String(currentMonth).padStart(2, '0'); // Noll-utfyllnad (01, 02, ..., 12)

    const existingVersion = jsonData.metadata.version || '0-0-0'; // Fallback om version saknas
    let existingYear = 0;
    let existingPaddedMonth = '00';
    let existingSeq = 0;

    // Försök tolka befintlig version enligt ÅÅÅÅ-MM-Seq
    const parts = existingVersion.split('-');
    if (parts.length === 3) {
        const yearPart = parseInt(parts[0], 10);
        const monthPart = parseInt(parts[1], 10); // Månad ska vara 1-12
        const seqPart = parseInt(parts[2], 10);

        // Kontrollera att delarna är giltiga nummer och månaden är inom rimligt intervall
        if (!isNaN(yearPart) && !isNaN(monthPart) && !isNaN(seqPart) && monthPart >= 1 && monthPart <= 12) {
            existingYear = yearPart;
            existingPaddedMonth = String(monthPart).padStart(2, '0'); // Se till att den är paddad för jämförelse
            existingSeq = seqPart;
        } else {
            console.warn(`Ogiltigt befintligt versionsformat hittat: "${existingVersion}". Återställer sekvens.`);
            // Sätt värden som garanterat inte matchar currentYear/Month för att tvinga reset
            existingYear = 0;
            existingPaddedMonth = '00';
        }
    } else {
         // Hantera om formatet är helt annorlunda (t.ex. det gamla major.minor.patch)
         console.warn(`Oväntat befintligt versionsformat: "${existingVersion}". Återställer sekvens.`);
         existingYear = 0;
         existingPaddedMonth = '00';
    }

    let newSeq;
    // Jämför nuvarande år och månad med den befintliga versionens
    if (currentYear === existingYear && currentPaddedMonth === existingPaddedMonth) {
        // Samma år och månad: öka sekvensnumret
        newSeq = existingSeq + 1;
        console.log(`Samma år och månad (${currentYear}-${currentPaddedMonth}). Ökar sekvensnummer till ${newSeq}.`);
    } else {
        // Nytt år eller månad: återställ sekvensnumret till 1
        newSeq = 1;
        console.log(`Nytt år eller månad (${currentYear}-${currentPaddedMonth}). Återställer sekvensnummer till 1.`);
    }

    // Skapa den nya versionsträngen
    const newVersion = `${currentYear}-${currentPaddedMonth}-${newSeq}`;
    jsonData.metadata.version = newVersion; // Uppdatera dataobjektet
    console.log(`Version uppdaterad till: ${jsonData.metadata.version}`);
}

function updateDateModified() {
    if (!jsonData || !jsonData.metadata) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
    jsonData.metadata.dateModified = `${year}-${month}-${day}`;
    console.log(`DateModified uppdaterad till: ${jsonData.metadata.dateModified}`);
}

// ----- Metadata Functions -----

// Updated displayMetadata: Removed URL param check, added monitoringType display
function displayMetadata(metadata) {
    console.log("Entering displayMetadata...");
    setupContentArea(true, false); // Clear dynamic area, hide filter/sort
    const targetArea = document.getElementById('dynamicContentArea');
    if (!targetArea) {
        showError("Internt fel: Kunde inte hitta innehållsområdet (#dynamicContentArea).");
        return;
    }

    const heading = document.createElement('h2');
    heading.textContent = 'Metadata';
    targetArea.appendChild(heading);

    // NOTE: Confirmation message display moved to the end of saveMetadata

    // Action button container (Edit button)
    const actionContainer = document.createElement('div');
    actionContainer.className = 'action-button-container';
    const editButton = document.createElement('button');
    editButton.id = 'editMetadataButton';
    editButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.edit}</span> Redigera metadata`;
    editButton.addEventListener('click', renderMetadataForm);
    actionContainer.appendChild(editButton);
    // Insert buttons *before* the heading for better layout control with absolute positioning in CSS
    targetArea.insertBefore(actionContainer, heading);


    console.log("Starting loop through metadata keys...");
    let itemCount = 0;
    for (const key in metadata) {
        if (metadata.hasOwnProperty(key)) {
            // Skip contentTypes here, handle separately later
            if (key === 'contentTypes') continue;

            itemCount++;
            try {
                const value = metadata[key];
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('metadata-item');

                const keyStrong = document.createElement('strong');
                keyStrong.textContent = `${key}:`;

                // ** Specific handling for monitoringType **
                if (key === 'monitoringType' && typeof value === 'object' && value !== null) {
                    keyStrong.textContent = 'Typ av tillsyn:'; // Custom label
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${escapeHtml(value.text || value.type || '(okänd)')}`; // Show text, fallback to type
                    itemDiv.appendChild(valueSpan);
                } else if (key === 'publisher' && typeof value === 'object' && value !== null) {
                    const h = document.createElement('strong');
                    h.textContent = `${key}:`;
                    h.style.display = 'block';
                    itemDiv.appendChild(h);
                    const dl = document.createElement('div');
                    dl.style.marginLeft = '20px';
                    for (const sk in value) {
                        if (value.hasOwnProperty(sk)) {
                            dl.appendChild(createMetadataSubItem(sk, value[sk]));
                        }
                    }
                    itemDiv.appendChild(dl);
                } else if (key === 'source' && typeof value === 'object' && value !== null) {
                     const h = document.createElement('strong');
                     h.textContent = `${key}:`;
                     h.style.display = 'block';
                     itemDiv.appendChild(h);
                     const dl = document.createElement('div');
                     dl.style.marginLeft = '20px';
                     const u = value.url;
                     const t = value.title;
                     let urlDisplayed = false;
                     if (u && u.trim() !== '') {
                         const p = createMetadataSubItem('url', u, t);
                         dl.appendChild(p);
                         urlDisplayed = true;
                     }
                     for (const sk in value) {
                         if (value.hasOwnProperty(sk)) {
                             if ( (sk === 'url' && urlDisplayed) || (sk === 'title' && urlDisplayed && t && u) ) continue;
                             dl.appendChild(createMetadataSubItem(sk, value[sk]));
                         }
                     }
                     itemDiv.appendChild(dl);
                } else if (Array.isArray(value)) {
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${value.map(escapeHtml).join(', ')}`;
                    itemDiv.appendChild(valueSpan);
                } else {
                    itemDiv.appendChild(keyStrong);
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` ${escapeHtml(value)}`;
                    itemDiv.appendChild(valueSpan);
                }
                targetArea.appendChild(itemDiv);
            } catch (error) {
                console.error(`Error displaying metadata key "${key}":`, error);
                const errorDiv = document.createElement('div');
                errorDiv.textContent = `Fel vid visning av nyckel: ${key}`;
                errorDiv.style.color = 'red';
                targetArea.appendChild(errorDiv);
            }
        }
    }
     // Explicitly handle contentTypes at the end
     if (Array.isArray(metadata.contentTypes) && metadata.contentTypes.length > 0) {
         const ctDiv = document.createElement('div');
         ctDiv.classList.add('metadata-item');
         const ctHeading = document.createElement('strong');
         ctHeading.textContent = 'contentTypes:';
         ctHeading.style.display = 'block';
         ctDiv.appendChild(ctHeading);
         const ctList = document.createElement('ul');
         ctList.style.listStyle = 'none';
         ctList.style.marginLeft = '20px';
         ctList.style.paddingLeft = '0';
         metadata.contentTypes.forEach(ct => {
             const li = document.createElement('li');
             li.textContent = `${ct.text} (ID: ${ct.id})`;
             ctList.appendChild(li);
         });
         ctDiv.appendChild(ctList);
         targetArea.appendChild(ctDiv);
     }

    console.log(`Finished metadata display. Displayed ${itemCount} items.`);
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

// Updated renderMetadataForm: Added monitoringType dropdown
function renderMetadataForm() {
    if (!jsonData || !jsonData.metadata) {
        showError("Metadata saknas eller kunde inte laddas.");
        return;
    }

    setupContentArea(true);
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

    const metadata = jsonData.metadata;

    // ** Add monitoringType dropdown first **
    const monitoringTypeContainer = createFormField('Typ av tillsyn*', 'monitoringType', '', 'select');
    const monitoringTypeSelect = document.createElement('select');
    const monitoringTypeId = monitoringTypeContainer.querySelector('label').htmlFor;
    monitoringTypeSelect.id = monitoringTypeId;
    monitoringTypeSelect.name = 'monitoringType'; // Use simple name for form data

    MONITORING_TYPES.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.type; // Store type value
        option.textContent = opt.text;
        // Ensure metadata.monitoringType exists before accessing its type property
        if (metadata.monitoringType && metadata.monitoringType.type === opt.type) {
            option.selected = true;
        }
        monitoringTypeSelect.appendChild(option);
    });
    // If no type is preselected (e.g., if default was added), ensure 'web' is selected
    if (!metadata.monitoringType?.type && monitoringTypeSelect.options.length > 0) {
         monitoringTypeSelect.value = 'web'; // Default to 'web' if nothing else matches
    }

    monitoringTypeContainer.appendChild(monitoringTypeSelect);
    form.appendChild(monitoringTypeContainer);

    // Iterate through other metadata keys
    for (const key in metadata) {
        if (metadata.hasOwnProperty(key)) {
            // Skip fields handled separately or not editable
            if (['version', 'dateCreated', 'dateModified', 'contentTypes', 'monitoringType'].includes(key)) continue;

            const value = metadata[key];
            let fieldContainer;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Create fieldset for nested objects (publisher, source)
                fieldContainer = document.createElement('div');
                const fieldset = document.createElement('fieldset');
                const legend = document.createElement('legend');
                legend.textContent = key;
                fieldset.appendChild(legend);

                for (const subKey in value) {
                    if (value.hasOwnProperty(subKey)) {
                        const subValue = value[subKey];
                         const inputType = (subKey === 'contactPoint') ? 'email'
                                         : (subKey === 'url') ? 'url'
                                         : (['retrievedDate'].includes(subKey)) ? 'date'
                                         : 'text';
                        const placeholder = (inputType === 'url') ? 'https://exempel.com' : '';
                        fieldset.appendChild(createFormField(subKey, `${key}.${subKey}`, subValue, inputType, placeholder));
                    }
                }
                fieldContainer.appendChild(fieldset);
            } else if (key === 'language') {
                 fieldContainer = createFormField(key, key, value, 'text');
                 const input = fieldContainer.querySelector('input');
                 input.setAttribute('list', 'language-list');
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
                 const instr = document.createElement('p');
                 instr.className = 'field-instruction';
                 instr.textContent = 'Ange språkkod (t.ex. sv, en) eller välj från listan.';
                 fieldContainer.appendChild(instr);
            } else if (key === 'keywords') {
                 fieldContainer = createFormField(key, key, Array.isArray(value) ? value.join(' ') : '', 'textarea');
                 const instr = document.createElement('p');
                 instr.className = 'field-instruction';
                 instr.textContent = 'Separera nyckelord med mellanslag.';
                 fieldContainer.appendChild(instr);
            } else {
                fieldContainer = createFormField(key, key, value, (key === 'description') ? 'textarea' : 'text');
            }
            form.appendChild(fieldContainer);
        }
    }

     // Handle contentTypes separately
     const ctValue = Array.isArray(metadata.contentTypes) ? metadata.contentTypes.map(ct => ct.text).join(' ') : '';
     const ctContainer = createFormField('Innehållstyper (contentTypes)', 'contentTypes', ctValue, 'textarea');
     const ctInstruction = document.createElement('p');
     ctInstruction.className = 'field-instruction';
     ctInstruction.textContent = 'Ange önskade innehållstyper separerade med mellanslag. ID genereras automatiskt.';
     ctContainer.appendChild(ctInstruction);
     form.appendChild(ctContainer);


    // Add Save and Cancel buttons
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.save}</span> Spara ändringar`;
    buttonDiv.appendChild(saveBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.cancel}</span> Avbryt`;
    cancelBtn.addEventListener('click', () => displayMetadata(jsonData.metadata));
    buttonDiv.appendChild(cancelBtn);
    form.appendChild(buttonDiv);

    targetArea.appendChild(form);
} // Slut på renderMetadataForm


// *** DEL 4/5 - Fortsättning från föregående kodblock ***

// Updated saveMetadata: Handles monitoringType, calls displayMetadata directly
function saveMetadata(event) {
    event.preventDefault(); // Prevent default form submission
    const form = event.target;
    const formData = new FormData(form);
    let changed = false;

    if (!jsonData || !jsonData.metadata) return;

    // Create a deep copy to compare against later
    const originalDataString = JSON.stringify(jsonData.metadata);
    const updatedMetadata = JSON.parse(originalDataString);

    // ** Update monitoringType **
    const selectedMonitoringType = formData.get('monitoringType');
    const monitoringTypeObject = MONITORING_TYPES.find(opt => opt.type === selectedMonitoringType) || MONITORING_TYPES[0]; // Fallback
    // Check if monitoringType actually changed
    if (JSON.stringify(updatedMetadata.monitoringType) !== JSON.stringify(monitoringTypeObject)) {
        updatedMetadata.monitoringType = monitoringTypeObject;
    }

    // Update other values
    for (const key in updatedMetadata) {
        if (updatedMetadata.hasOwnProperty(key)) {
            // Skip fields handled separately or not editable
            if (['version', 'dateCreated', 'dateModified', 'contentTypes', 'monitoringType'].includes(key)) continue;

            if (typeof updatedMetadata[key] === 'object' && !Array.isArray(updatedMetadata[key]) && updatedMetadata[key] !== null) {
                // Handle nested objects (publisher, source)
                for (const subKey in updatedMetadata[key]) {
                    if (updatedMetadata[key].hasOwnProperty(subKey)) {
                        const formName = `${key}.${subKey}`;
                        if (formData.has(formName)) {
                            let newValue = formData.get(formName).trim();
                            // Only update if changed (simple comparison)
                            if (updatedMetadata[key][subKey] !== newValue) {
                                updatedMetadata[key][subKey] = newValue;
                            }
                        }
                    }
                }
            } else if (key === 'keywords') {
                 // Handle keywords array
                 const keywordsString = formData.get(key) || '';
                 const newKeywords = keywordsString.split(/\s+/).map(k => k.trim()).filter(Boolean); // Split, trim, remove empty
                 // Check if keywords array actually changed (string comparison is simpler here)
                 if (JSON.stringify(updatedMetadata[key] || []) !== JSON.stringify(newKeywords)) {
                     updatedMetadata[key] = newKeywords;
                 }
            } else {
                // Handle simple string fields
                if (formData.has(key)) {
                    const newValue = formData.get(key).trim();
                     if (updatedMetadata[key] !== newValue) {
                        updatedMetadata[key] = newValue;
                     }
                }
            }
        }
    }

    // Handle contentTypes update
    const contentTypesString = formData.get('contentTypes') || '';
    const contentTypeTexts = contentTypesString.split(/\s+/).map(t => t.trim()).filter(Boolean);
    const newContentTypes = [];
    const seenIds = new Set();
    contentTypeTexts.forEach(text => {
        const id = generateKeyFromName(text);
        if (id && !seenIds.has(id)) {
            newContentTypes.push({ id: id, text: text });
            seenIds.add(id);
        } else if (id && seenIds.has(id)) {
            console.warn(`Duplicate content type ID generated for "${text}", skipping.`);
        } else {
            console.warn(`Could not generate valid ID for content type "${text}", skipping.`);
        }
    });
    // Sort alphabetically by text
    updatedMetadata.contentTypes = newContentTypes.sort((a, b) => a.text.localeCompare(b.text, 'sv'));


    // Compare the updated object with the original string to detect any change
    if (originalDataString !== JSON.stringify(updatedMetadata)) {
        changed = true;
        jsonData.metadata = updatedMetadata; // Update the main data object
        isDataModified = true; // Mark data as modified
        if (saveChangesButton) saveChangesButton.classList.remove('hidden'); // Show save button

        // Re-render metadata view directly
        displayMetadata(jsonData.metadata);
        const targetArea = document.getElementById('dynamicContentArea');
        if(targetArea) {
             // Display confirmation in the new view
             displayConfirmation('Metadata uppdaterad! Glöm inte att spara den nedladdade filen.', 'save', targetArea);
        }

    } else {
        // No changes detected, just go back to display view
        displayMetadata(jsonData.metadata);
        console.log("Inga ändringar i metadata upptäcktes.");
    }
} // Slut på saveMetadata


// --- Requirement Functions ---

// Updated displayRequirements: Removed URL param check, uses lastFocusedReqKey
function displayRequirements(requirements) {
    console.log(`Entering displayRequirements. Sort order: ${currentSortOrder}, Search: "${currentSearchTerm}"`);
    setupContentArea(true, true); // Clear dynamic area, DO show filter/sort
    const targetArea = document.getElementById('dynamicContentArea');
    if (!targetArea) {
        showError("Internt fel: Kunde inte hitta innehållsområdet (#dynamicContentArea).");
        return;
    }
    // Make sure filter/sort row is visible (redundant check, belt-and-suspenders)
    if (filterSortRow) filterSortRow.classList.remove('hidden');

    const heading = document.createElement('h2');
    // Append heading early so confirmations can appear after it if needed
    targetArea.appendChild(heading);

    // NOTE: Confirmation messages are now displayed directly by save/delete functions

    const keyToFocus = lastFocusedReqKey; // Use only last focused key now
    console.log("Key to focus (from last focus):", keyToFocus);

    if (!requirements || Object.keys(requirements).length === 0) {
        heading.textContent = 'Krav (0 st)';
        targetArea.appendChild(document.createElement('p')).textContent = 'Inga krav finns i den laddade filen.';
        if (filterSortRow) filterSortRow.classList.add('hidden'); // Hide filter/sort if no requirements
        return;
    }

    // Convert requirements object to array for easier filtering/sorting
    let requirementsArray;
    try {
        requirementsArray = Object.entries(requirements).map(([key, value]) => {
            // Basic validation of requirement structure
            if(typeof value !== 'object' || value === null) {
                console.warn(`Requirement with key "${key}" is not a valid object. Skipping.`);
                return null; // Skip invalid entries
            }
            value.key = key; // Ensure the key is part of the object for easy access
             // Provide a default title if missing, essential for display
            if (!value.title) {
                 console.warn(`Requirement with key "${key}" is missing a title. Using key as placeholder.`);
                 value.title = `[Titel saknas: ${key}]`;
             }
            return value;
        }).filter(Boolean); // Remove any null entries from map
    } catch(e) {
         console.error("Error converting requirements to array:", e);
         showError("Kunde inte bearbeta kravlistan.");
         return;
    }


    // Apply search filter
    const searchTerm = currentSearchTerm.toLowerCase().trim();
    let filteredRequirements = requirementsArray;
    if (searchTerm) {
        console.log(`Filtering by: "${searchTerm}"`);
        filteredRequirements = requirementsArray.filter(req => {
            // Check various fields for the search term
            const titleMatch = req.title?.toLowerCase().includes(searchTerm);
            const refTextMatch = req.standardReference?.text?.toLowerCase().includes(searchTerm);
            // Check if any instruction text matches
            const instructionMatch = req.instructions?.some(instr => instr.text?.toLowerCase().includes(searchTerm));
             // Check if any check condition text matches
            const checkConditionMatch = req.checks?.some(check => check.condition?.toLowerCase().includes(searchTerm));
            // Check if any check requirement text matches
            const checkRequirementMatch = req.checks?.some(check =>
                check.passCriteria?.some(crit => crit.requirement?.toLowerCase().includes(searchTerm))
            );
            // Combine matches
            return titleMatch || refTextMatch || instructionMatch || checkConditionMatch || checkRequirementMatch;
        });
        console.log(`Found ${filteredRequirements.length} matching requirements after filtering.`);
    }

    // Update heading with the count of *filtered* requirements
    heading.textContent = `Krav (${filteredRequirements.length} st)`;

    let elementToFocus = null; // Element to potentially scroll to and focus

    // Determine view type based on sort order
    const isCategorySort = currentSortOrder.startsWith('category-');
    targetArea.classList.toggle('grouped-list-view', isCategorySort);
    targetArea.classList.toggle('flat-list-view', !isCategorySort);

    if (filteredRequirements.length === 0) {
        targetArea.appendChild(document.createElement('p')).textContent = searchTerm ? 'Inga krav matchade sökningen.' : 'Inga krav att visa.';
    } else if (isCategorySort) {
        // --- Grouped View (by Category) ---
        console.log("Rendering grouped by category...");
        const grouped = {};
        try {
            filteredRequirements.forEach(req => {
                const mainCatObj = req.metadata?.mainCategory;
                const subCatObj = req.metadata?.subCategory;
                // Handle cases where category might be just a string or an object {text: ..., key: ...}
                const mainCatText = mainCatObj?.text || (typeof mainCatObj === 'string' ? mainCatObj : null) || 'Okategoriserad';
                const subCatText = subCatObj?.text || (typeof subCatObj === 'string' ? subCatObj : null) || ''; // Default to empty string for no subcategory

                if (!grouped[mainCatText]) grouped[mainCatText] = {};
                if (!grouped[mainCatText][subCatText]) grouped[mainCatText][subCatText] = [];
                grouped[mainCatText][subCatText].push(req);
            });
        } catch(e) {
             console.error("Error grouping requirements:", e);
             showError("Kunde inte gruppera kraven per kategori.");
             return;
        }

        // Sort main categories alphabetically (respecting asc/desc order)
        const sortedMainCategories = Object.keys(grouped).sort((a, b) => {
            const compare = a.localeCompare(b, 'sv');
            return currentSortOrder === 'category-asc' ? compare : -compare;
        });

        if (sortedMainCategories.length === 0) {
             console.warn("No categories found after grouping.");
        }

        // Render categories and subcategories
        for (const mainCategory of sortedMainCategories) {
             if (grouped.hasOwnProperty(mainCategory)) {
                 const mainCatHeading = document.createElement('h3');
                 const mainCatId = `maincat-${generateKeyFromName(mainCategory)}`;
                 mainCatHeading.textContent = mainCategory;
                 mainCatHeading.id = mainCatId;
                 targetArea.appendChild(mainCatHeading);

                 const categoryContent = grouped[mainCategory];
                 // Sort subcategories alphabetically
                 const sortedSubCategories = Object.keys(categoryContent).sort((a, b) => a.localeCompare(b, 'sv'));

                 for (const subCategory of sortedSubCategories) {
                     if (categoryContent.hasOwnProperty(subCategory)) {
                         const reqList = categoryContent[subCategory];
                         // Sort requirements within subcategory by title
                         reqList.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'sv'));

                         let subCatHeading = null;
                         let subCatId = '';
                         if (subCategory !== '') { // Only render subcategory heading if it exists
                             subCatHeading = document.createElement('h4');
                             subCatId = `subcat-${generateKeyFromName(subCategory)}`;
                             subCatHeading.textContent = subCategory;
                             subCatHeading.id = subCatId;
                             targetArea.appendChild(subCatHeading);
                         }

                         const ul = document.createElement('ul');
                         ul.classList.add('requirement-list');
                         ul.setAttribute('aria-labelledby', subCatHeading ? subCatId : mainCatId);
                         targetArea.appendChild(ul);

                         reqList.forEach(req => {
                             try {
                                 const li = renderRequirementListItem(req, keyToFocus);
                                 if (li.dataset.focusTarget) {
                                     elementToFocus = li.querySelector('.requirement-text');
                                 }
                                 ul.appendChild(li);
                             } catch (itemError) {
                                 console.error(`Error rendering list item for key ${req.key}:`, itemError);
                                 const errorLi = document.createElement('li');
                                 errorLi.textContent = `Fel vid rendering av krav: ${req.key}`;
                                 errorLi.style.color = 'red';
                                 ul.appendChild(errorLi);
                             }
                         });
                     }
                 }
             }
         }
    } else {
        // --- Flat View (Sorted by Reference or Impact) ---
        console.log(`Rendering flat list sorted by ${currentSortOrder}...`);
        try {
             filteredRequirements.sort(getSortFunction(currentSortOrder));
        } catch(e) {
             console.error("Error sorting requirements:", e);
             showError("Kunde inte sortera kravlistan.");
             return;
        }

        const ul = document.createElement('ul');
        ul.classList.add('requirement-list', 'flat-list');
        targetArea.appendChild(ul);

        filteredRequirements.forEach(req => {
            try {
                const li = renderRequirementListItem(req, keyToFocus);
                if (li.dataset.focusTarget) {
                    elementToFocus = li.querySelector('.requirement-text');
                }
                ul.appendChild(li);
            } catch (itemError) {
                console.error(`Error rendering flat list item for key ${req.key}:`, itemError);
                const errorLi = document.createElement('li');
                errorLi.textContent = `Fel vid rendering av krav: ${req.key}`;
                errorLi.style.color = 'red';
                ul.appendChild(errorLi);
            }
        });
    }

    console.log("Render loop finished.");

    // Focus the target element if found
    if (elementToFocus) {
        console.log("Attempting focus on element:", elementToFocus);
        setTimeout(() => {
             elementToFocus.focus({ preventScroll: false });
             elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
             lastFocusedReqKey = null; // Reset focus hint *after* focusing
        }, 50);
    } else if (keyToFocus) {
        console.warn(`Could not find element to focus for key: ${keyToFocus}`);
        lastFocusedReqKey = null; // Reset anyway if focus target wasn't found
    }
} // Slut på displayRequirements


function renderRequirementListItem(req, keyToFocus) {
    const li = document.createElement('li');
    li.classList.add('requirement-item');
    li.id = `req-item-${req.key}`;

    const textDiv = document.createElement('div');
    textDiv.classList.add('requirement-text');

    const refStrong = document.createElement('strong');
    refStrong.textContent = escapeHtml(getVal(req, 'standardReference.text', req.id || req.key || 'REFERENS SAKNAS'));
    textDiv.appendChild(refStrong);

    textDiv.appendChild(document.createTextNode(` ${escapeHtml(req.title || 'TITEL SAKNAS')}`));

    textDiv.tabIndex = -1;
    li.appendChild(textDiv);

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

    if (req.key === keyToFocus) {
        li.dataset.focusTarget = 'true';
    }

    return li;
} // Slut på renderRequirementListItem

// Updated sort function to handle new options and safe value access
function getSortFunction(sortOrder) {
    return (a, b) => {
        let valA, valB;
        try {
            switch (sortOrder) {
                case 'ref-asc':
                case 'ref-desc':
                    valA = getVal(a, 'standardReference.text', a.key || '');
                    valB = getVal(b, 'standardReference.text', b.key || '');
                    const compareRef = valA.localeCompare(valB, 'sv', { numeric: true, sensitivity: 'base' });
                    return sortOrder === 'ref-asc' ? compareRef : -compareRef;

                case 'impact-critical-first':
                case 'impact-critical-last':
                    const criticalA = getVal(a, 'metadata.impact.isCritical', false) === true;
                    const criticalB = getVal(b, 'metadata.impact.isCritical', false) === true;
                    const primaryA = getVal(a, 'metadata.impact.primaryScore', 0);
                    const primaryB = getVal(b, 'metadata.impact.primaryScore', 0);
                    const secondaryA = getVal(a, 'metadata.impact.secondaryScore', 0);
                    const secondaryB = getVal(b, 'metadata.impact.secondaryScore', 0);

                    if (criticalA !== criticalB) {
                        const critCompare = criticalA ? -1 : 1;
                        return sortOrder === 'impact-critical-first' ? critCompare : -critCompare;
                    }
                    if (primaryA !== primaryB) {
                        const primCompare = primaryB - primaryA;
                         return sortOrder === 'impact-critical-first' ? primCompare : -primCompare;
                    }
                    if (secondaryA !== secondaryB) {
                         const secCompare = secondaryB - secondaryA;
                         return sortOrder === 'impact-critical-first' ? secCompare : -secCompare;
                    }
                     valA = getVal(a, 'standardReference.text', a.key || '');
                     valB = getVal(b, 'standardReference.text', b.key || '');
                     return valA.localeCompare(valB, 'sv', { numeric: true, sensitivity: 'base' });

                case 'category-asc':
                case 'category-desc':
                default:
                    valA = getVal(a, 'metadata.mainCategory.text', getVal(a, 'metadata.mainCategory', 'Okategoriserad'));
                    valB = getVal(b, 'metadata.mainCategory.text', getVal(b, 'metadata.mainCategory', 'Okategoriserad'));
                    const compareCat = valA.localeCompare(valB, 'sv');

                    if (compareCat !== 0) {
                         return currentSortOrder === 'category-asc' ? compareCat : -compareCat;
                    }
                     const subA = getVal(a, 'metadata.subCategory.text', getVal(a, 'metadata.subCategory', ''));
                     const subB = getVal(b, 'metadata.subCategory.text', getVal(b, 'metadata.subCategory', ''));
                     const compareSub = subA.localeCompare(subB, 'sv');
                     if (compareSub !== 0) {
                         return currentSortOrder === 'category-asc' ? compareSub : -compareSub;
                     }
                     const refA = getVal(a, 'standardReference.text', a.key || '');
                     const refB = getVal(b, 'standardReference.text', b.key || '');
                     return refA.localeCompare(refB, 'sv', { numeric: true, sensitivity: 'base' });
            }
        } catch (sortError) {
            console.error("Error during sorting comparison:", sortError, "Data A:", a, "Data B:", b);
            return 0;
        }
    };
} // Slut på getSortFunction


function displayRequirementDetail(reqKey) {
    const requirement = jsonData?.requirements?.[reqKey];
    if (!requirement) {
        showError(`Kunde inte hitta krav med nyckel: ${reqKey}`);
        if (jsonData?.requirements) displayRequirements(jsonData.requirements);
        return;
    }

    currentRequirementKey = reqKey;
    lastFocusedReqKey = reqKey;

    setupContentArea(true, false);
    const targetArea = document.getElementById('dynamicContentArea');
    if (!targetArea) { return; }
    targetArea.classList.add('requirement-detail');

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

    targetArea.appendChild(actionButtonContainer);

    const title = document.createElement('h2');
    title.textContent = requirement.title;
    targetArea.appendChild(title);

    const stdRefP = document.createElement('p');
    stdRefP.classList.add('standard-ref');
    if (requirement.standardReference) {
        const refStrong = document.createElement('strong');
        refStrong.textContent = 'Referens: ';
        stdRefP.appendChild(refStrong);

        let refText = '';
        let refUrl = '';
        if (typeof requirement.standardReference === 'object' && requirement.standardReference !== null) {
            refText = requirement.standardReference.text || '';
            refUrl = requirement.standardReference.url || '';
        } else if (typeof requirement.standardReference === 'string') {
            refText = requirement.standardReference;
        }

        if (refUrl) {
            const refLink = document.createElement('a');
            refLink.href = refUrl;
            refLink.textContent = escapeHtml(refText || refUrl);
            refLink.target = '_blank';
            refLink.rel = 'noopener noreferrer';
            stdRefP.appendChild(refLink);
        } else {
            stdRefP.appendChild(document.createTextNode(escapeHtml(refText)));
        }
    }
    targetArea.appendChild(stdRefP);
// *** DEL 5/5 - Fortsättning från föregående kodblock ***

    // --- Fortsättning av displayRequirementDetail ---

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
            li.innerHTML = parseSimpleMarkdown(getVal(instr, 'text', ''));
            ol.appendChild(li);
        });
        instrSection.appendChild(ol);
        targetArea.appendChild(instrSection);
    }

    // Examples, Exceptions, CommonErrors, Tips (if they exist)
    const optionalSections = {
        examples: 'Exempel',
        exceptions: 'Undantag',
        commonErrors: 'Vanliga Fel',
        tips: 'Tips'
    };

    for (const key in optionalSections) {
        if (requirement[key]) { // Check if key exists and has a truthy value
            const section = document.createElement('div');
            section.classList.add('detail-section');
            if (key === 'exceptions') {
                section.classList.add('exceptions'); // Special styling for exceptions
            }
            const heading = document.createElement('h3');
            heading.textContent = optionalSections[key];
            section.appendChild(heading);
            const p = document.createElement('p');
            p.innerHTML = parseSimpleMarkdown(requirement[key]); // Use markdown parser
            section.appendChild(p);
            targetArea.appendChild(section);
        }
    }


    // Checks
    if (Array.isArray(requirement.checks) && requirement.checks.length > 0) {
        const checkSection = document.createElement('div');
        checkSection.classList.add('detail-section');
        const checkHeading = document.createElement('h3');
        checkHeading.textContent = 'Kontroller';
        checkSection.appendChild(checkHeading);

        requirement.checks.forEach(check => {
            const checkItemDiv = document.createElement('div');
            checkItemDiv.classList.add('check-item');

            // Condition
            const conditionP = document.createElement('p');
            conditionP.classList.add('check-condition');
            conditionP.innerHTML = parseSimpleMarkdown(getVal(check, 'condition', 'Villkor saknas'));
            checkItemDiv.appendChild(conditionP);

             // Logic (AND/OR) - Display only if multiple criteria exist
             const passCriteriaCount = getVal(check, 'passCriteria.length', 0);
             if (getVal(check, 'logic') && passCriteriaCount > 1) {
                 const logicP = document.createElement('p');
                 logicP.classList.add('check-logic');
                 logicP.textContent = `(${check.logic === 'OR' ? 'Minst ett av följande krävs:' : 'Alla följande krävs:'})`;
                 checkItemDiv.appendChild(logicP);
             } else if (passCriteriaCount > 1) {
                  // Default to AND if logic missing but multiple criteria
                  const logicP = document.createElement('p');
                  logicP.classList.add('check-logic');
                  logicP.textContent = `(Alla följande krävs:)`; // Assume AND
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

             // If No Criteria (Optional)
             if (Array.isArray(check.ifNo) && check.ifNo.length > 0) {
                 const noHeading = document.createElement('p');
                 noHeading.textContent = 'Om Nej:';
                 noHeading.style.fontWeight = 'bold';
                 noHeading.style.marginTop = '0.75em';
                 checkItemDiv.appendChild(noHeading);

                 const noUl = document.createElement('ul');
                 noUl.classList.add('pass-criteria-list'); // Reuse same list style
                 check.ifNo.forEach(criterion => {
                     const li = document.createElement('li');
                     li.innerHTML = parseSimpleMarkdown(getVal(criterion, 'requirement', ''));
                     noUl.appendChild(li);
                 });
                 checkItemDiv.appendChild(noUl);
             }


            checkSection.appendChild(checkItemDiv);
        });
        targetArea.appendChild(checkSection);
    }

     // Content Types
     if (Array.isArray(requirement.contentType) && requirement.contentType.length > 0 && Array.isArray(jsonData.metadata?.contentTypes)) {
         const ctSection = document.createElement('div');
         ctSection.classList.add('detail-section');
         const ctHeading = document.createElement('h3');
         ctHeading.textContent = 'Relevanta Innehållstyper';
         ctSection.appendChild(ctHeading);
         const ctUL = document.createElement('ul');
         ctUL.style.listStyle = 'disc'; // Or other appropriate style

         // Create a map for quick lookup of content type text by ID
         const masterTypes = jsonData.metadata.contentTypes.reduce((acc, type) => {
             acc[type.id] = type.text;
             return acc;
         }, {});

         requirement.contentType.forEach(ctId => {
             if (masterTypes[ctId]) { // Check if the ID exists in metadata
                 const li = document.createElement('li');
                 li.textContent = masterTypes[ctId];
                 ctUL.appendChild(li);
             } else {
                 console.warn(`Content type ID "${ctId}" referenced in requirement "${reqKey}" not found in metadata.contentTypes.`);
             }
         });

         if (ctUL.children.length > 0) { // Only add section if there are valid types to display
             ctSection.appendChild(ctUL);
             targetArea.appendChild(ctSection);
         }
     }


    // Category and Impact Info
    const catInfo = document.createElement('p');
    catInfo.classList.add('category-info');
    let mainCatDisplay = getVal(requirement, 'metadata.mainCategory.text', getVal(requirement, 'metadata.mainCategory', 'Okänd'));
    let subCatDisplay = getVal(requirement, 'metadata.subCategory.text', getVal(requirement, 'metadata.subCategory', ''));
    catInfo.textContent = `Kategori: ${escapeHtml(mainCatDisplay)}${subCatDisplay ? ` / ${escapeHtml(subCatDisplay)}` : ''}`;
    targetArea.appendChild(catInfo);

    if (requirement.metadata?.impact) {
        const impact = requirement.metadata.impact;
        const impactP = document.createElement('p');
        impactP.classList.add('impact-info');
        let impactText = `Påverkan: ${impact.isCritical ? 'Kritisk' : 'Icke-kritisk'}`;
         // Use nullish coalescing for scores
         const primaryScore = impact.primaryScore ?? 0;
         const secondaryScore = impact.secondaryScore ?? 0;
        impactText += ` (Poäng: ${primaryScore}.${secondaryScore}, `;
         // Handle assumedCompliance, defaulting to true if undefined/null
         const assumedCompliance = (impact.assumedCompliance === undefined || impact.assumedCompliance === null) ? true : impact.assumedCompliance;
         impactText += `Antagen efterlevnad: ${assumedCompliance ? 'Ja' : 'Nej'})`;
        impactP.textContent = impactText;
        targetArea.appendChild(impactP);
    }


    // Back Button
    const backButton = document.createElement('button');
    backButton.id = 'backButton';
    backButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.back}</span> Tillbaka till listan`;
    backButton.addEventListener('click', () => {
        // Go back to the list, preserving sort/filter state potentially
        displayRequirements(jsonData.requirements);
    });
    targetArea.appendChild(backButton);
} // Slut på displayRequirementDetail


function renderRequirementForm(reqKey) {
    const isEditing = reqKey !== null && jsonData?.requirements?.[reqKey];
    const requirement = isEditing ? jsonData.requirements[reqKey] : {}; // Start with empty if adding
    const formTitle = isEditing ? `Redigera krav: ${escapeHtml(requirement.title || reqKey)}` : 'Lägg till nytt krav';

    setupContentArea(true, false); // Clear dynamic area, hide filter/sort
    const targetArea = document.getElementById('dynamicContentArea');
    if (!targetArea) { /* Error handling */ return; }
    targetArea.classList.add('form-view'); // Apply form styling

    const form = document.createElement('form');
    form.id = isEditing ? `requirementForm-${reqKey}` : 'requirementForm-new';
    form.noValidate = true; // We'll do basic validation in JS
    form.addEventListener('submit', (event) => saveRequirement(event, reqKey));

    const heading = document.createElement('h2');
    heading.textContent = formTitle;
    form.appendChild(heading);

    // --- Basic Info ---
    form.appendChild(createFormField('Titel*', 'title', requirement.title || '', 'text', 'Kravets titel'));

    // Standard Reference (as fieldset)
    const stdRefFieldset = document.createElement('fieldset');
    const stdRefLegend = document.createElement('legend');
    stdRefLegend.textContent = 'Standardreferens';
    let refText = '';
    let refUrl = '';
    if (typeof requirement.standardReference === 'object' && requirement.standardReference !== null) {
        refText = requirement.standardReference.text || '';
        refUrl = requirement.standardReference.url || '';
    } else if (typeof requirement.standardReference === 'string') {
        refText = requirement.standardReference; // Handle legacy string format if needed
    }
    stdRefFieldset.appendChild(createFormField('Text', 'standardReference.text', refText, 'text', 't.ex. 9.1.4.2 Audio Control'));
    stdRefFieldset.appendChild(createFormField('URL (valfri)', 'standardReference.url', refUrl, 'url', 'https://www.w3.org/WAI/...'));
    form.appendChild(stdRefFieldset);

    // --- Dynamic Lists: Instructions ---
    const instrFieldset = document.createElement('fieldset');
    const instrLegend = document.createElement('legend');
    instrLegend.textContent = 'Instruktioner';
    instrFieldset.appendChild(instrLegend);
    const instrList = document.createElement('ol'); // Use ordered list for instructions
    instrList.id = 'instructionList';
    instrList.classList.add('dynamic-list');
    (requirement.instructions || []).forEach((instr, index) => {
        // Ensure instr is an object with a 'text' property
        const instructionText = typeof instr === 'object' && instr !== null ? instr.text || '' : '';
        instrList.appendChild(createInstructionListItem(instructionText, index));
    });
    instrFieldset.appendChild(instrList);
    const addInstrButton = createDynamicListButton('Lägg till instruktion', () => {
        const list = document.getElementById('instructionList');
        list.appendChild(createInstructionListItem('', list.children.length));
    });
    instrFieldset.appendChild(addInstrButton);
    form.appendChild(instrFieldset);


    // --- Text Areas for Optional Fields ---
    form.appendChild(createFormField('Exempel', 'examples', requirement.examples || '', 'textarea'));
    form.appendChild(createFormField('Undantag', 'exceptions', requirement.exceptions || '', 'textarea'));
    form.appendChild(createFormField('Vanliga Fel', 'commonErrors', requirement.commonErrors || '', 'textarea'));
    form.appendChild(createFormField('Tips', 'tips', requirement.tips || '', 'textarea'));


    // --- Dynamic Fieldsets: Checks ---
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
        container.appendChild(createCheckFieldset({}, container.children.length)); // Add empty check
    });
    checksFieldset.appendChild(addCheckButton);
    form.appendChild(checksFieldset);

    // --- Content Types Checkboxes ---
    const masterContentTypes = jsonData?.metadata?.contentTypes || [];
    if (masterContentTypes.length > 0) {
        const ctFieldset = document.createElement('fieldset');
        const ctLegend = document.createElement('legend');
        ctLegend.textContent = 'Relevanta Innehållstyper';
        ctFieldset.appendChild(ctLegend);
        const currentTypes = requirement.contentType || []; // Ensure it's an array
        masterContentTypes.forEach(type => {
             // Create a checkbox for each content type in metadata
             const isChecked = currentTypes.includes(type.id);
             // Use createFormField for consistent structure
             const checkboxField = createFormField(type.text, 'contentType', type.id, 'checkbox', '', false);
             const checkboxInput = checkboxField.querySelector('input[type="checkbox"]');
             if(checkboxInput) {
                 checkboxInput.checked = isChecked;
                 checkboxInput.value = type.id; // Set value to the ID
             }
             ctFieldset.appendChild(checkboxField);
         });
        form.appendChild(ctFieldset);
    }


    // --- Metadata (Category & Impact) ---
    const metaFieldset = document.createElement('fieldset');
    const metaLegend = document.createElement('legend');
    metaLegend.textContent = 'Kategorisering & Påverkan'; // Combined fieldset
    metaFieldset.appendChild(metaLegend);

    // Categories
    const { mainCategories, subCategories } = extractCategories(jsonData?.requirements || {});
    const currentMainCatText = getVal(requirement, 'metadata.mainCategory.text', getVal(requirement, 'metadata.mainCategory', ''));
    if (mainCategories.length > 0) {
         metaFieldset.appendChild(createCategorySelect('Huvudkategori*', 'metadata.mainCategory.text', mainCategories, currentMainCatText, false));
    } else {
         // Fallback to text input if no categories extracted
         metaFieldset.appendChild(createFormField('Huvudkategori*', 'metadata.mainCategory.text', currentMainCatText, 'text', 'Ange huvudkategori'));
    }
    const currentSubCatText = getVal(requirement, 'metadata.subCategory.text', getVal(requirement, 'metadata.subCategory', ''));
    if (subCategories.length > 0) {
         metaFieldset.appendChild(createCategorySelect('Underkategori (valfri)', 'metadata.subCategory.text', subCategories, currentSubCatText, true)); // Allow empty
    } else {
        metaFieldset.appendChild(createFormField('Underkategori (valfri)', 'metadata.subCategory.text', currentSubCatText, 'text', 'Ange underkategori (om relevant)'));
    }

    // Impact
    const impactFieldset = document.createElement('fieldset'); // Separate fieldset for impact for clarity
    const impactLegend = document.createElement('legend');
    impactLegend.textContent = 'Påverkan (Impact)';
    impactFieldset.appendChild(impactLegend);
    impactFieldset.appendChild(createFormField('Kritisk?', 'metadata.impact.isCritical', getVal(requirement, 'metadata.impact.isCritical', false), 'checkbox'));
    impactFieldset.appendChild(createFormField('Primär poäng', 'metadata.impact.primaryScore', getVal(requirement, 'metadata.impact.primaryScore', 0), 'number', '0'));
    impactFieldset.appendChild(createFormField('Sekundär poäng', 'metadata.impact.secondaryScore', getVal(requirement, 'metadata.impact.secondaryScore', 0), 'number', '0'));
    // Default assumedCompliance to false when editing/creating (needs explicit check)
    const defaultAssumedCompliance = getVal(requirement, 'metadata.impact.assumedCompliance') ?? false;
    impactFieldset.appendChild(createFormField('Antagen efterlevnad?', 'metadata.impact.assumedCompliance', defaultAssumedCompliance, 'checkbox'));

    metaFieldset.appendChild(impactFieldset); // Append impact fieldset inside the main meta fieldset
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
             lastFocusedReqKey = reqKey; // Set focus hint
            displayRequirementDetail(reqKey); // Go back to detail view
        } else {
            displayRequirements(jsonData.requirements); // Go back to list view
        }
    });
    buttonDiv.appendChild(cancelButton);
    form.appendChild(buttonDiv);

    targetArea.appendChild(form);
} // Slut på renderRequirementForm

// Updated saveRequirement: Calls displayRequirementDetail directly with confirmation and focus logic
function saveRequirement(event, reqKey) {
    event.preventDefault(); // Stop default form submission
    const form = event.target;
    const isEditing = reqKey !== null && jsonData?.requirements?.[reqKey];
    const originalRequirement = isEditing ? jsonData.requirements[reqKey] : {};
    const originalRequirementString = isEditing ? JSON.stringify(originalRequirement) : null; // For change detection

    try {
        // --- Basic Validation ---
        const titleValue = form.elements['title']?.value.trim();
        const mainCategoryElement = form.elements['metadata.mainCategory.text'];
        const mainCategoryValue = mainCategoryElement?.value.trim();

        if (!titleValue) {
            alert("Titel är obligatorisk.");
            form.elements['title']?.focus();
            return;
        }
        if (!mainCategoryValue) {
            alert("Huvudkategori är obligatorisk.");
            mainCategoryElement?.focus();
            return;
        }

        // --- Generate ID and Key ---
        const newId = isEditing ? (originalRequirement.id || crypto.randomUUID()) : crypto.randomUUID();
        const newReqKey = isEditing ? reqKey : generateRequirementKey(titleValue, newId);

        // --- Collect Form Data ---
        const formData = new FormData(form);
        const selectedContentTypes = formData.getAll('contentType'); // Get all checked content type IDs

        // --- Build Updated Requirement Object ---
         const updatedRequirement = {
             id: newId,
             key: newReqKey,
             title: titleValue,
             metadata: {
                 mainCategory: {
                     text: mainCategoryValue,
                     key: generateKeyFromName(mainCategoryValue) || ""
                 },
                 subCategory: {
                      text: getVal(form.elements, 'metadata.subCategory.text.value', '').trim(),
                      key: generateKeyFromName(getVal(form.elements, 'metadata.subCategory.text.value', '').trim()) || ""
                 },
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
             instructions: [],
             checks: [],
             contentType: selectedContentTypes
         };

          // Handle empty subcategory object -> store empty string
          if (!updatedRequirement.metadata.subCategory.text) {
             updatedRequirement.metadata.subCategory = "";
          }

         // Handle empty reference object -> store empty string
         if (!updatedRequirement.standardReference.text && !updatedRequirement.standardReference.url) {
            updatedRequirement.standardReference = "";
         }


        // Populate Instructions array
        const instructionTextareas = form.querySelectorAll('#instructionList .instruction-item textarea');
        instructionTextareas.forEach((textarea, index) => { // Added index
             const text = textarea.value.trim();
             if (text) {
                 updatedRequirement.instructions.push({ id: (index + 1).toString(), text: text }); // Use index for ID
             }
         });

        // Populate Checks array
        const checkFieldsets = form.querySelectorAll('#checksContainer .check-fieldset');
        checkFieldsets.forEach((fieldset, checkIndex) => {
            const condition = fieldset.querySelector(`textarea[name="check-${checkIndex}-condition"]`)?.value.trim();
            if (!condition) return; // Skip check if condition is empty

            const check = {
                id: (checkIndex + 1).toString(),
                condition: condition,
                logic: fieldset.querySelector(`select[name="check-${checkIndex}-logic"]`)?.value || 'AND', // Default to AND
                passCriteria: [],
                ifNo: [] // Ensure ifNo array exists
            };

            // Populate Pass Criteria
            const passCritTextareas = fieldset.querySelectorAll(`.pass-criteria-list textarea`);
            passCritTextareas.forEach((textarea, critIndex) => {
                 const reqText = textarea.value.trim();
                 if (reqText) {
                     check.passCriteria.push({ id: `${check.id}.${critIndex + 1}`, requirement: reqText });
                 }
             });

             // Populate IfNo Criteria
             const ifNoCritTextareas = fieldset.querySelectorAll(`.if-no-criteria-list textarea`);
             ifNoCritTextareas.forEach((textarea, critIndex) => {
                 const reqText = textarea.value.trim();
                 if (reqText) {
                     check.ifNo.push({ id: `${check.id}.no.${critIndex + 1}`, requirement: reqText });
                 }
             });

            // Only add check if it has a condition and potentially criteria
            updatedRequirement.checks.push(check);
        });

        // --- Detect Changes and Update ---
        const updatedRequirementString = JSON.stringify(updatedRequirement);
        let changed = !isEditing || (originalRequirementString !== updatedRequirementString);

        if (changed) {
             console.log(isEditing ? "Requirement changed:" : "New requirement created:", updatedRequirement);

             if (isEditing && reqKey !== newReqKey) {
                 console.warn(`Requirement key changed during edit from ${reqKey} to ${newReqKey}. Deleting old key.`);
                 delete jsonData.requirements[reqKey];
             }

            jsonData.requirements[newReqKey] = updatedRequirement; // Add or update in the main data object
            isDataModified = true;
            if(saveChangesButton) saveChangesButton.classList.remove('hidden'); // Show save button

             // Sätt fokus-hinten *innan* renderingen
             lastFocusedReqKey = newReqKey;

             // Rendera om detaljvyn för det sparade kravet
             displayRequirementDetail(newReqKey);

            // Hitta visningsområdet igen efter rendering
            const targetArea = document.getElementById('dynamicContentArea');
             if (targetArea) {
                 const actionText = isEditing ? 'uppdaterat' : 'tillagt';
                 displayConfirmation(`Kravet "${escapeHtml(updatedRequirement.title)}" har ${actionText}. Glöm inte spara filen.`, 'save', targetArea);

                // Försök sätta fokus efter en kort fördröjning
                setTimeout(() => {
                     const elementToFocus = targetArea.querySelector(`h2`);
                    if (elementToFocus) {
                        console.log("Attempting focus on saved requirement detail heading...");
                        elementToFocus.focus({ preventScroll: false });
                        elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        lastFocusedReqKey = null; // Nollställ fokus-hinten
                     } else {
                        console.warn("Could not find heading to focus in detail view after save.");
                     }
                 }, 100);
            }

        } else {
             lastFocusedReqKey = reqKey;
            displayRequirementDetail(reqKey); // No changes, just go back
            console.log("Inga ändringar upptäcktes i kravet.");
        }

    } catch (error) {
        console.error("Error saving requirement:", error);
        showError("Kunde inte spara kravet. Se konsolen för detaljer.");
    }
} // Slut på saveRequirement


function extractCategories(requirements) {
    const mainCategoriesSet = new Set();
    const subCategoriesSet = new Set();

    if (requirements && typeof requirements === 'object') {
        Object.values(requirements).forEach(req => {
            if (req?.metadata) {
                const mainCat = getVal(req, 'metadata.mainCategory.text', getVal(req, 'metadata.mainCategory'));
                const subCat = getVal(req, 'metadata.subCategory.text', getVal(req, 'metadata.subCategory'));

                if (mainCat && typeof mainCat === 'string' && mainCat.trim()) {
                    mainCategoriesSet.add(mainCat.trim());
                }
                if (subCat && typeof subCat === 'string' && subCat.trim()) {
                    subCategoriesSet.add(subCat.trim());
                }
            }
        });
    }
    return {
        mainCategories: Array.from(mainCategoriesSet).sort((a, b) => a.localeCompare(b, 'sv')),
        subCategories: Array.from(subCategoriesSet).sort((a, b) => a.localeCompare(b, 'sv'))
    };
}

function createCategorySelect(labelText, name, categories, selectedValue, allowEmpty = false) {
    const container = createFormField(labelText, name, '', 'select');
    const select = document.createElement('select');
    const inputId = container.querySelector('label').htmlFor;
    select.id = inputId;
    select.name = name;

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
    return ""; // Return empty string if no category selected/entered
}

function confirmDeleteRequirement(reqKey) {
    const requirement = jsonData?.requirements?.[reqKey];
    if (!requirement) {
         showError(`Kan inte radera: Krav med nyckel ${reqKey} hittades inte.`);
         displayRequirements(jsonData?.requirements || {}); // Go back to list
         return;
     }

    currentRequirementKey = reqKey;
    lastFocusedReqKey = reqKey;

    setupContentArea(true, false);
    const targetArea = document.getElementById('dynamicContentArea');
    if (!targetArea) { return; }
    targetArea.classList.add('delete-confirmation-view');

    const heading = document.createElement('h2');
    heading.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.warning}</span> Radera krav?`;
    targetArea.appendChild(heading);

    const warningText = document.createElement('p');
    warningText.innerHTML = `Är du säker på att du vill radera kravet: <strong>${escapeHtml(requirement.title || reqKey)}</strong>?<br>Åtgärden kan inte ångras.`;
    targetArea.appendChild(warningText);

    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('form-buttons');

    const keepButton = document.createElement('button');
    keepButton.type = 'button';
    keepButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.keep}</span> Behåll kravet`;
    keepButton.addEventListener('click', () => displayRequirementDetail(reqKey));
    buttonDiv.appendChild(keepButton);

    const deleteConfirmButton = document.createElement('button');
    deleteConfirmButton.type = 'button';
    deleteConfirmButton.classList.add('button-danger');
    deleteConfirmButton.innerHTML = `<span class="icon" aria-hidden="true">${ICONS.delete}</span> Ja, radera kravet`;
    deleteConfirmButton.addEventListener('click', () => deleteRequirement(reqKey));
    buttonDiv.appendChild(deleteConfirmButton);

    targetArea.appendChild(buttonDiv);
    keepButton.focus();
} // Slut på confirmDeleteRequirement

// Updated deleteRequirement: Calls displayRequirements directly with confirmation
function deleteRequirement(reqKeyToDelete) {
    const requirement = jsonData?.requirements?.[reqKeyToDelete];
    if (!requirement) {
         showError(`Kan inte radera: Krav med nyckel ${reqKeyToDelete} hittades inte.`);
         displayRequirements(jsonData?.requirements || {});
         return;
     }

    const deletedTitle = requirement.title;

    delete jsonData.requirements[reqKeyToDelete];
    isDataModified = true;
    if(saveChangesButton) saveChangesButton.classList.remove('hidden');

    currentRequirementKey = null;
    lastFocusedReqKey = null;

    console.log(`Requirement "${deletedTitle}" (key: ${reqKeyToDelete}) deleted.`);

    // Rendera om listvyn direkt
    displayRequirements(jsonData.requirements);

    const targetArea = document.getElementById('dynamicContentArea');
    if (targetArea) {
         // Visa bekräftelse i den nya vyn
         displayConfirmation(`Kravet "${escapeHtml(deletedTitle)}" har raderats. Glöm inte spara filen.`, 'delete', targetArea);
    }

} // Slut på deleteRequirement


// ----- Form Field Creation Helpers -----

function createFormField(labelText, name, value, type = 'text', placeholder = '', readonly = false) {
    const container = document.createElement('div');
    container.classList.add('form-field');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const inputId = `form-${name.replace(/[\.\[\]]/g, '-')}-${randomSuffix}`;
    const label = document.createElement('label');
    label.htmlFor = inputId;
    let inputElement;

    if (type === 'checkbox') {
        inputElement = document.createElement('input');
        inputElement.type = 'checkbox';
        inputElement.id = inputId;
        inputElement.name = name;
        inputElement.checked = !!value;
        if (readonly) inputElement.disabled = true;
        label.textContent = labelText;
        container.appendChild(inputElement);
        container.appendChild(label);
        container.classList.add('form-field-checkbox');
    } else {
        label.textContent = labelText.endsWith('*') ? labelText : `${labelText}:`;
        container.appendChild(label);
        if (type === 'textarea') {
            inputElement = document.createElement('textarea');
            inputElement.rows = 3;
        } else if (type === 'select') {
            return container; // Select skapas separat
        } else {
            inputElement = document.createElement('input');
            inputElement.type = type;
            if (type === 'number') {
                 inputElement.step = 'any';
             }
        }
        inputElement.id = inputId;
        inputElement.name = name;
        inputElement.value = value ?? '';
        if (placeholder) inputElement.placeholder = placeholder;
        if (readonly) {
            inputElement.readOnly = true;
            inputElement.classList.add('readonly-field');
             inputElement.style.cursor = 'not-allowed';
             inputElement.style.backgroundColor = 'var(--disabled-bg)';
             inputElement.style.color = 'var(--disabled-text)';
        }
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
    textarea.rows = 2;
    textarea.value = text;
    textarea.placeholder = "Instruktionstext...";
    textarea.setAttribute('aria-label', `Instruktion ${index + 1}`);
    li.appendChild(textarea);
    const removeButton = createDynamicListButton('Ta bort', (e) => {
        e.target.closest('li.dynamic-list-item')?.remove();
    }, 'remove-item-button');
    removeButton.setAttribute('aria-label', `Ta bort instruktion ${index + 1}`);
    li.appendChild(removeButton);
    return li;
}


function createCheckFieldset(checkData, index) {
    const fieldset = document.createElement('fieldset');
    fieldset.classList.add('check-fieldset', 'dynamic-list-item');
    fieldset.dataset.index = index;
    const legend = document.createElement('legend');
    legend.textContent = `Kontrollpunkt ${index + 1}`;
    fieldset.appendChild(legend);
    const removeCheckButton = createDynamicListButton('Ta bort Kontrollpunkt', (e) => {
        e.target.closest('fieldset.check-fieldset')?.remove();
    }, ['remove-item-button', 'remove-check-button', 'button-danger']);
    removeCheckButton.setAttribute('aria-label', `Ta bort kontrollpunkt ${index + 1}`);
    fieldset.appendChild(removeCheckButton);
    const conditionContainer = createFormField(`Villkor för kontroll ${index + 1}`, `check-${index}-condition`, checkData.condition || '', 'textarea', 'Villkor...');
    conditionContainer.querySelector('textarea').rows = 2;
    fieldset.appendChild(conditionContainer);
    const logicContainer = createFormField(`Logik...`, `check-${index}-logic`, '', 'select');
    const logicSelect = document.createElement('select');
    const logicId = logicContainer.querySelector('label').htmlFor;
    logicSelect.id = logicId;
    logicSelect.name = `check-${index}-logic`;
    const optionAnd = document.createElement('option');
    optionAnd.value = 'AND';
    optionAnd.textContent = 'ALLA...';
    const optionOr = document.createElement('option');
    optionOr.value = 'OR';
    optionOr.textContent = 'Minst ETT...';
    logicSelect.appendChild(optionAnd);
    logicSelect.appendChild(optionOr);
    logicSelect.value = checkData.logic || 'AND';
    logicContainer.appendChild(logicSelect);
    fieldset.appendChild(logicContainer);
    const passFieldset = document.createElement('fieldset');
    passFieldset.classList.add('criteria-group');
    const passLegend = document.createElement('legend');
    passLegend.textContent = 'Godkänd-kriterier...';
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
    fieldset.appendChild(passFieldset);
    const ifNoFieldset = document.createElement('fieldset');
    ifNoFieldset.classList.add('criteria-group');
    const ifNoLegend = document.createElement('legend');
    ifNoLegend.textContent = '"Om Nej"-kriterier...';
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
    fieldset.appendChild(ifNoFieldset);
    return fieldset;
}

function createCriterionListItem(text, checkIndex, type, critIndex) {
    const li = document.createElement('li');
    li.classList.add(`${type}-criterion-item`, 'dynamic-list-item');
    li.dataset.checkIndex = checkIndex;
    li.dataset.critIndex = critIndex;
    const typeText = type === 'pass' ? 'Godkänd-kriterium' : '"Om Nej"-kriterium';
    const labelText = `${typeText} ${critIndex + 1} för kontroll ${checkIndex + 1}`;
    const textarea = document.createElement('textarea');
    textarea.name = `check-${checkIndex}-${type}Crit-${critIndex}`;
    textarea.rows = 1;
    textarea.value = text;
    textarea.placeholder = 'Kravtext...';
    textarea.setAttribute('aria-label', labelText);
    li.appendChild(textarea);
    const removeButton = createDynamicListButton('Ta bort', (e) => {
        e.target.closest('li.dynamic-list-item')?.remove();
    }, 'remove-item-button');
    removeButton.setAttribute('aria-label', `Ta bort ${typeText.toLowerCase()} ${critIndex + 1}`);
    li.appendChild(removeButton);
    return li;
}

function createDynamicListButton(text, onClick, classNames = 'add-item-button') {
    const button = document.createElement('button');
    button.type = 'button';
    let icon = ICONS.add;
    if (text.toLowerCase().includes('ta bort')) {
        icon = ICONS.delete;
    }
    button.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span> ${escapeHtml(text)}`;
    if (Array.isArray(classNames)) {
        button.classList.add(...classNames);
    } else {
        button.classList.add(classNames);
    }
    button.addEventListener('click', onClick);
    return button;
}


// --- Updated Download Function with Key Ensurance ---
function downloadJsonFile() {
    if (!jsonData) {
        showError("Ingen data att spara.");
        return;
    }

    try {
        // Uppdatera version och datum *innan* vi hämtar värdena för filnamnet
        updateVersion(); // Använder den NYA logiken
        updateDateModified();

        // Hämta den *nya* versionen och titeln från metadata
        const currentVersion = jsonData.metadata.version;
        const title = jsonData.metadata?.title || 'kravdata';

        // Skapa säkert filnamn: ersätt ogiltiga tecken, konvertera till små bokstäver
        const safeTitle = title.replace(/[^a-z0-9_\-]/gi, '_').replace(/_+/g, '_').toLowerCase(); // Lägg till .toLowerCase()
        // Versionen har redan bindestreck, så ersätt bara potentiellt ogiltiga tecken (mindre troligt här)
        const safeVersion = String(currentVersion).replace(/[^a-z0-9\-]/gi, '-');
        const filename = `${safeTitle}_${safeVersion}.json`;

        console.log(`Genererar filnamn: ${filename}`);

        // --- START: Säkerställ att alla standardnycklar finns i requirements ---
        // (Denna logik är densamma som tidigare)
        const processedRequirements = {};
        if (jsonData.requirements && typeof jsonData.requirements === 'object') {
             for (const key in jsonData.requirements) {
                 if (jsonData.requirements.hasOwnProperty(key)) {
                     const originalReq = jsonData.requirements[key];
                     if (typeof originalReq !== 'object' || originalReq === null) {
                          console.warn(`Skipping invalid requirement object with key: ${key}`);
                          continue;
                     }
                     const processedReq = {};
                     STANDARD_REQUIREMENT_KEYS.forEach(stdKey => {
                         if (originalReq.hasOwnProperty(stdKey) && originalReq[stdKey] !== null && originalReq[stdKey] !== undefined) {
                              if (stdKey === 'metadata') {
                                 const origMeta = originalReq.metadata;
                                 const defaultMeta = REQUIREMENT_KEY_DEFAULTS.metadata;
                                 processedReq.metadata = {
                                     mainCategory: origMeta?.mainCategory ?? { ...defaultMeta.mainCategory },
                                     subCategory: origMeta?.subCategory ?? { ...defaultMeta.subCategory },
                                     impact: origMeta?.impact ?? { ...defaultMeta.impact }
                                 };
                                 if (processedReq.metadata.impact && typeof processedReq.metadata.impact === 'object') {
                                      processedReq.metadata.impact.isCritical = processedReq.metadata.impact.isCritical ?? defaultMeta.impact.isCritical;
                                      processedReq.metadata.impact.primaryScore = processedReq.metadata.impact.primaryScore ?? defaultMeta.impact.primaryScore;
                                      processedReq.metadata.impact.secondaryScore = processedReq.metadata.impact.secondaryScore ?? defaultMeta.impact.secondaryScore;
                                      processedReq.metadata.impact.assumedCompliance = processedReq.metadata.impact.assumedCompliance ?? defaultMeta.impact.assumedCompliance;
                                 } else {
                                     processedReq.metadata.impact = { ...defaultMeta.impact };
                                 }
                                 ['mainCategory', 'subCategory'].forEach(catKey => {
                                     let catValue = processedReq.metadata[catKey];
                                     if (typeof catValue === 'string') {
                                         processedReq.metadata[catKey] = { text: catValue, key: generateKeyFromName(catValue) || "" };
                                     } else if (typeof catValue !== 'object' || catValue === null) {
                                          processedReq.metadata[catKey] = JSON.parse(JSON.stringify(defaultMeta[catKey]));
                                     } else {
                                         catValue.text = catValue.text ?? "";
                                         catValue.key = catValue.key ?? (catValue.text ? generateKeyFromName(catValue.text) : "");
                                     }
                                     if (catKey === 'subCategory' && !processedReq.metadata.subCategory?.text) {
                                        processedReq.metadata.subCategory = "";
                                     }
                                 });
                              } else if (stdKey === 'standardReference') {
                                 if (typeof originalReq.standardReference === 'object' && originalReq.standardReference !== null) {
                                      processedReq.standardReference = {
                                          text: originalReq.standardReference.text ?? "",
                                          url: originalReq.standardReference.url ?? ""
                                      };
                                      if (!processedReq.standardReference.text && !processedReq.standardReference.url) {
                                          processedReq.standardReference = "";
                                      }
                                 } else if (typeof originalReq.standardReference === 'string') {
                                      processedReq.standardReference = originalReq.standardReference;
                                 } else {
                                      processedReq.standardReference = "";
                                 }
                              } else if (Array.isArray(originalReq[stdKey])) {
                                  processedReq[stdKey] = JSON.parse(JSON.stringify(originalReq[stdKey]));
                              } else if (typeof originalReq[stdKey] === 'object' && originalReq[stdKey] !== null) {
                                   processedReq[stdKey] = JSON.parse(JSON.stringify(originalReq[stdKey]));
                              }
                              else {
                                  processedReq[stdKey] = originalReq[stdKey];
                              }
                         } else {
                              console.log(`Adding default value for missing key '${stdKey}' to requirement '${key}'`);
                              const defaultValue = REQUIREMENT_KEY_DEFAULTS[stdKey];
                              if (typeof defaultValue === 'object' && defaultValue !== null) {
                                  processedReq[stdKey] = JSON.parse(JSON.stringify(defaultValue));
                              } else {
                                  processedReq[stdKey] = defaultValue;
                              }
                         }
                     });
                     for(const originalKey in originalReq) {
                         if (originalReq.hasOwnProperty(originalKey) && !processedReq.hasOwnProperty(originalKey)) {
                             console.warn(`Requirement '${key}' has non-standard key '${originalKey}'. Including it.`);
                             processedReq[originalKey] = originalReq[originalKey];
                         }
                     }
                     processedRequirements[key] = processedReq;
                 }
             }
         }
        // --- SLUT: Säkerställ att alla standardnycklar finns ---

        const dataToSave = {
            ...jsonData,
            requirements: processedRequirements
        };

        const jsonString = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

        if (typeof saveAs === 'function') {
            saveAs(blob, filename);
            console.log(`FileSaver.js: JSON-fil "${filename}" initierade nedladdning.`);
        } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log(`Link Method: JSON-fil "${filename}" initierade nedladdning.`);
        }

        isDataModified = false;
        if (saveChangesButton) saveChangesButton.classList.add('hidden');

         const controlsContainer = document.getElementById('postUploadControlsContainer');
         if (controlsContainer) {
             const confirmationSpan = document.createElement('span');
             confirmationSpan.textContent = ` Fil sparad (v ${escapeHtml(currentVersion)})!`;
             confirmationSpan.style.color = 'var(--success-color)';
             confirmationSpan.style.fontWeight = 'bold';
             confirmationSpan.style.marginLeft = '1em';
             confirmationSpan.classList.add('save-confirmation-inline');
             const existingSpan = controlsContainer.querySelector('.save-confirmation-inline');
             if(existingSpan) existingSpan.remove();
             const secondaryControls = controlsContainer.querySelector('.secondary-controls');
             if (secondaryControls) secondaryControls.appendChild(confirmationSpan);
             else controlsContainer.appendChild(confirmationSpan);
             setTimeout(() => { confirmationSpan.remove(); }, 4000);
         } else {
             alert(`Filen sparades med version ${escapeHtml(currentVersion)}!`);
         }

    } catch (error) {
        console.error("Error preparing or triggering JSON download:", error);
        showError("Kunde inte skapa filen för nedladdning. Se konsolen för detaljer.");
    }
}



// ----- EVENT LISTENERS -----
document.addEventListener('DOMContentLoaded', initializeUI);

if (fileInput) {
     fileInput.addEventListener('change', handleFileUpload);
} else { console.error("File input not found"); }

if (showMetadataButton) {
    showMetadataButton.addEventListener('click', () => {
        currentRequirementKey = null;
        lastFocusedReqKey = null;
        if (jsonData?.metadata) {
            displayMetadata(jsonData.metadata);
        } else {
            showError('Ingen metadata att visa. Ladda upp en fil först.');
        }
    });
} else { console.error("Show Metadata button not found"); }

if (showRequirementsButton) {
    showRequirementsButton.addEventListener('click', () => {
        currentRequirementKey = null;
        lastFocusedReqKey = null;
        if (jsonData?.requirements) {
             currentSortOrder = 'category-asc';
             if(sortOrderSelect) sortOrderSelect.value = currentSortOrder;
             currentSearchTerm = '';
             if(searchInput) searchInput.value = currentSearchTerm;
            displayRequirements(jsonData.requirements);
        } else {
            showError('Inga krav att visa. Ladda upp en fil först.');
        }
    });
} else { console.error("Show Requirements button not found"); }


if (addRequirementButton) {
    addRequirementButton.addEventListener('click', () => {
        currentRequirementKey = null;
        lastFocusedReqKey = null;
        renderRequirementForm(null);
    });
} else { console.error("Add Requirement button not found"); }

if (saveChangesButton) {
    saveChangesButton.addEventListener('click', downloadJsonFile);
} else { console.error("Save Changes button not found"); }


if (sortOrderSelect) {
    sortOrderSelect.addEventListener('change', (event) => {
        currentSortOrder = event.target.value;
        console.log("Sort order changed to:", currentSortOrder);
        // Re-render the requirements list if it's currently displayed
        if (jsonData?.requirements && dynamicContentArea &&
            !dynamicContentArea.classList.contains('form-view') &&
            !dynamicContentArea.classList.contains('requirement-detail') &&
            !dynamicContentArea.classList.contains('delete-confirmation-view'))
        {
            displayRequirements(jsonData.requirements);
        }
    });
} else { console.error("Sort order select not found"); }

// Debounced search handler
let searchTimeout;
function handleSearchInput(event) {
    const searchTerm = event.target.value || '';
    clearTimeout(searchTimeout); // Clear previous timeout

    searchTimeout = setTimeout(() => {
        currentSearchTerm = searchTerm;
        console.log(`Search term updated: "${currentSearchTerm}"`);
        // Re-render the requirements list if it's currently displayed
        if (jsonData?.requirements && dynamicContentArea &&
            !dynamicContentArea.classList.contains('form-view') &&
            !dynamicContentArea.classList.contains('requirement-detail') &&
            !dynamicContentArea.classList.contains('delete-confirmation-view'))
        {
            displayRequirements(jsonData.requirements);
        }
    }, 300); // Wait 300ms after last input before triggering search/render
}

if(searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('search', handleSearchInput);
} else { console.error("Search input not found"); }


console.log("Script loaded and all listeners attached.");




