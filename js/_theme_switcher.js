// js/_theme_switcher.js

const themeToggleButton = document.getElementById('themeToggleButton'); // Ditt befintliga ID
const bodyElement = document.body;

const THEME_KEY = 'user-preferred-theme'; // Nyckel för localStorage
const LIGHT_THEME_CLASS = 'light-theme';
const DARK_THEME_CLASS = 'dark-theme';
const DEFAULT_THEME = 'light'; // Sätt ditt önskade standardtema här (light eller dark)

function applyTheme(theme) {
    if (!bodyElement || !themeToggleButton) {
        console.error("applyTheme: bodyElement eller themeToggleButton saknas!");
        return;
    }

    bodyElement.classList.remove(LIGHT_THEME_CLASS, DARK_THEME_CLASS); // Ta bort båda först

    if (theme === 'dark') {
        bodyElement.classList.add(DARK_THEME_CLASS);
        themeToggleButton.textContent = 'Byt till ljust tema';
        themeToggleButton.setAttribute('aria-label', 'Växla till ljust tema');
    } else { // theme === 'light'
        bodyElement.classList.add(LIGHT_THEME_CLASS);
        themeToggleButton.textContent = 'Byt till mörkt tema';
        themeToggleButton.setAttribute('aria-label', 'Växla till mörkt tema');
    }
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
 * Ignorerar systeminställning om ett val redan är sparat.
 */
export function initializeThemeSwitcher() {
    if (!themeToggleButton || !bodyElement) {
        console.warn("Temaväxlare kunde inte initieras: knapp eller body-element saknas.");
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
    
    themeToggleButton.addEventListener('click', toggleTheme);
    console.log(`Temaväxlare initierad. Knapptext initialt: "${themeToggleButton.textContent}"`);
}