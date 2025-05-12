// js/_-----_dom_element_references.js

// Här hämtar vi referenser till alla viktiga HTML-element som behövs i olika delar av koden.
// Genom att exportera dem härifrån kan andra moduler importera och använda dem
// utan att själva behöva köra document.getElementById.

export const fileInput = document.getElementById('fileInput');
export const uploadSection = document.getElementById('uploadSection');
export const contentDisplay = document.getElementById('contentDisplay');
export const postUploadControlsContainer = document.getElementById('postUploadControlsContainer');
export const dynamicContentArea = document.getElementById('dynamicContentArea');
export const controlsDivider = document.getElementById('controlsDivider');
export const showMetadataButton = document.getElementById('showMetadataButton');
export const showRequirementsButton = document.getElementById('showRequirementsButton');
export const addRequirementButton = document.getElementById('addRequirementButton');
export const saveChangesButton = document.getElementById('saveChangesButton');
// export const sortControls = document.getElementById('sortControls'); // Omslutande div, behövs sällan direkt
export const sortOrderSelect = document.getElementById('sortOrderSelect');
export const searchInput = document.getElementById('searchInput');
export const filterSortRow = document.getElementById('filterSortRow'); // Raden som innehåller sök/filter/sort

// Lägg till fler referenser här om det behövs senare

console.log("Module loaded: dom_element_references"); // För felsökning