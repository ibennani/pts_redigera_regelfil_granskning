// js/_theme_switcher.js

// ÄNDRAD: Hämta båda knapparna från DOM-referensfilen
import { themeToggleButtonTop, themeToggleButtonBottom } from './_-----_dom_element_references.js';

const bodyElement = document.body;
// ÄNDRAD: Samla knapparna i en array för enklare hantering
const themeToggleButtons = [themeToggleButtonTop, themeToggleButtonBottom].filter(Boolean); // .filter(Boolean) tar bort null/undefined om en knapp inte skulle hittas

const THEME_KEY = 'user-preferred-theme'; // Nyckel för localStorage
const LIGHT_THEME_CLASS = 'light-theme';
const DARK_THEME_CLASS = 'dark-theme';
const DEFAULT_THEME = 'light'; // Sätt ditt önskade standardtema här (light eller dark)

function applyTheme(theme) {
    if (!bodyElement || themeToggleButtons.length === 0) {
        console.error("applyTheme: bodyElement eller temaknappar saknas!");
        return;
    }

    bodyElement.classList.remove(LIGHT_THEME_CLASS, DARK_THEME_CLASS);

    let newText, newAriaLabel;

    if (theme === 'dark') {
        bodyElement.classList.add(DARK_THEME_CLASS);
        newText = 'Byt till ljust tema';
        newAriaLabel = 'Växla till ljust tema';
    } else { // theme === 'light'
        bodyElement.classList.add(LIGHT_THEME_CLASS);
        newText = 'Byt till mörkt tema';
        newAriaLabel = 'Växla till mörkt tema';
    }

    // ÄNDRAD: Loopa igenom och uppdatera alla temaknappar
    themeToggleButtons.forEach(button => {
        button.textContent = newText;
        button.setAttribute('aria-label', newAriaLabel);
    });
    
    console.log(`applyTheme: Tema satt till ${theme}. Body klasser: ${bodyElement.className}`);
}

function toggleTheme() {
    if (!bodyElement) return;

    let newTheme;
    if (bodyElement.classList.contains(DARK_THEME_CLASS)) {
        newTheme = 'light';
    } else {
        newTheme = 'dark';
    }

    applyTheme(newTheme);
    try {
        localStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {
        console.warn("Kunde inte spara temainställning till localStorage:", e);
    }
    console.log(`Tema växlat och sparat: ${newTheme}`);
}

/**
 * Initierar temat baserat på sparat val eller standardtema.
 */
export function initializeThemeSwitcher() {
    if (themeToggleButtons.length === 0 || !bodyElement) {
        console.warn("Temaväxlare kunde inte initieras: knappar eller body-element saknas.");
        return;
    }

    let currentTheme = null;
    try {
        currentTheme = localStorage.getItem(THEME_KEY);
    } catch (e) {
        console.warn("Kunde inte läsa temainställning från localStorage:", e);
    }

    if (!currentTheme) { // Inget sparat val, använd standardtema
        currentTheme = DEFAULT_THEME;
        console.log(`Inget sparat tema hittades, använder standardtema: ${DEFAULT_THEME}`);
    } else {
        console.log(`Hittade sparat tema: ${currentTheme}`);
    }
    
    applyTheme(currentTheme);
    
    // ÄNDRAD: Lägg till lyssnare på alla temaknappar
    themeToggleButtons.forEach(button => {
        button.addEventListener('click', toggleTheme);
    });
    
    console.log(`Temaväxlare initierad för ${themeToggleButtons.length} knapp(ar).`);
}