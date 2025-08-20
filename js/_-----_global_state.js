// js/_-----_global_state.js

// Denna modul håller reda på applikationens tillstånd (state).

// Innehåller den uppladdade och parsade JSON-datan.
export let jsonData = null;
// Håller reda på nyckeln för det krav som just nu visas i detalj- eller redigeringsläge.
export let currentRequirementKey = null;
// Håller reda på nyckeln för det krav som senast hade fokus (används för att scrolla dit efter spara/radera).
export let lastFocusedReqKey = null;
// En flagga som indikerar om datan har ändrats sedan den laddades/sparades senast.
export let isDataModified = false;
// Den nuvarande sorteringsordningen för kravlistan.
export let currentSortOrder = 'ref-asc';
// Den nuvarande söktermen som används för att filtrera kravlistan.
export let currentSearchTerm = '';

// --- NYTT: Versionshantering flyttad hit ---

/**
 * Uppdaterar versionsnumret i metadata enligt formatet ÅÅÅÅ.M.rSeq.
 */
function updateVersion() {
    if (!jsonData?.metadata) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const existingVersion = jsonData.metadata.version || '0.0.r0';
    let existingYear = 0, existingMonth = 0, existingSeq = 0;
    const versionRegex = /^(\d{4})\.(\d{1,2})\.r(\d+)$/;
    const match = existingVersion.match(versionRegex);
    if (match) {
        const yearPart = parseInt(match[1], 10);
        const monthPart = parseInt(match[2], 10);
        const seqPart = parseInt(match[3], 10);
        if (!isNaN(yearPart) && !isNaN(monthPart) && !isNaN(seqPart) && monthPart >= 1 && monthPart <= 12) {
            existingYear = yearPart; existingMonth = monthPart; existingSeq = seqPart;
        } else {
            console.warn(`Ogiltigt värde i befintligt versionsformat: "${existingVersion}". Återställer sekvens.`);
            existingYear = 0; existingMonth = 0;
        }
    } else {
        console.warn(`Oväntat befintligt versionsformat: "${existingVersion}". Försöker inte återanvända, återställer sekvens.`);
        existingYear = 0; existingMonth = 0;
    }
    let newSeq = (currentYear === existingYear && currentMonth === existingMonth) ? existingSeq + 1 : 1;
    jsonData.metadata.version = `${currentYear}.${currentMonth}.r${newSeq}`;
    console.log(`Version uppdaterad i minnet till: ${jsonData.metadata.version}`);
}

/**
 * Uppdaterar datumet för senaste ändring i metadata till dagens datum (YYYY-MM-DD).
 */
function updateDateModified() {
    if (!jsonData?.metadata) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    jsonData.metadata.dateModified = `${year}-${month}-${day}`;
    console.log(`DateModified uppdaterad i minnet till: ${jsonData.metadata.dateModified}`);
}


/**
 * ÄNDRAD: Central funktion för att uppdatera state.
 * Hanterar nu automatiskt versionsuppdatering vid första ändring.
 * @param {string} key Namnet på state-variabeln (t.ex. 'jsonData')
 * @param {*} value Det nya värdet
 */
export function setState(key, value) {
    // Specialhantering för isDataModified
    if (key === 'isDataModified') {
        // Om vi sätter flaggan till true och den inte redan var det...
        if (value === true && isDataModified === false) {
            console.log("Första ändringen upptäckt. Uppdaterar version och datum...");
            updateVersion();
            updateDateModified();
        }
        // ...sedan sätter vi värdet.
        isDataModified = value;
        return; // Avsluta här för denna specialnyckel
    }

    // Standardhantering för alla andra nycklar
    switch (key) {
        case 'jsonData': jsonData = value; break;
        case 'currentRequirementKey': currentRequirementKey = value; break;
        case 'lastFocusedReqKey': lastFocusedReqKey = value; break;
        case 'currentSortOrder': currentSortOrder = value; break;
        case 'currentSearchTerm': currentSearchTerm = value; break;
        default:
            console.warn(`Attempted to set unknown state: ${key}`);
    }
}

console.log("Module loaded: global_state");