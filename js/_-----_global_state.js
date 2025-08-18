// js/_-----_global_state.js

// Denna modul håller reda på applikationens tillstånd (state).
// Variablerna exporteras så att andra moduler kan läsa och modifiera dem.

// Innehåller den uppladdade och parsade JSON-datan.
export let jsonData = null;

// Håller reda på nyckeln för det krav som just nu visas i detalj- eller redigeringsläge.
export let currentRequirementKey = null;

// Håller reda på nyckeln för det krav som senast hade fokus (används för att scrolla dit efter spara/radera).
export let lastFocusedReqKey = null;

// En flagga som indikerar om datan har ändrats sedan den laddades/sparades senast.
export let isDataModified = false;

// Den nuvarande sorteringsordningen för kravlistan.
// Möjliga värden definieras där sorteringen hanteras (t.ex. i requirement_functions).
// Default är 'category-asc'.
export let currentSortOrder = 'ref-asc';

// Den nuvarande söktermen som används för att filtrera kravlistan.
export let currentSearchTerm = '';

/**
 * Funktion för att uppdatera en state-variabel.
 * Detta är ett sätt att centralisera uppdateringar om det behövs senare,
 * men just nu tillåter vi direkt modifiering via export let.
 * @param {string} key Namnet på state-variabeln (t.ex. 'jsonData')
 * @param {*} value Det nya värdet
 */
export function setState(key, value) {
    switch (key) {
        case 'jsonData': jsonData = value; break;
        case 'currentRequirementKey': currentRequirementKey = value; break;
        case 'lastFocusedReqKey': lastFocusedReqKey = value; break;
        case 'isDataModified': isDataModified = value; break;
        case 'currentSortOrder': currentSortOrder = value; break;
        case 'currentSearchTerm': currentSearchTerm = value; break;
        default:
            console.warn(`Attempted to set unknown state: ${key}`);
    }
}

console.log("Module loaded: global_state"); // För felsökning