// js/_-----_utils__helpers.js

/**
 * Validerar om en sträng är en giltig e-postadress.
 * @param {string} email E-postadressen att validera.
 * @returns {boolean} True om giltig, annars false.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
}

/**
* Escapar HTML-specialtecken i en sträng för säker rendering.
* @param {*} unsafe Strängen att escapa. Om inte en sträng returneras värdet oförändrat.
* @returns {string} Den escapade strängen.
*/
export function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe; // Returnera oförändrat om inte sträng
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
* Tolkar en enkel variant av Markdown till HTML.
* Hanterar **fet**, _kursiv_, och behåller vissa HTML-taggar (<a, pre, br, hr>).
* @param {string} text Texten att tolka.
* @returns {string} HTML-sträng.
*/
export function parseSimpleMarkdown(text) {
  if (typeof text !== 'string' || !text) return ''; // Returnera tom sträng om ingen text

  const placeholders = {};
  let placeholderId = 0;

  // Temporärt ersätt <a...>...</a> och <pre...>...</pre> med platshållare
  text = text.replace(/<(a|pre)\b[^>]*>.*?<\/\1>/gis, (match) => {
      const id = `__HTMLPLACEHOLDER_${placeholderId++}__`;
      placeholders[id] = match;
      return id;
  });

  // Temporärt ersätt <br> och <hr> med platshållare
  text = text.replace(/<(br|hr)\b[^>]*\/?>/gi, (match) => {
      const id = `__HTMLPLACEHOLDER_${placeholderId++}__`;
      placeholders[id] = match;
      return id;
  });

  // Hantera **fet** och __fet__
  text = text.replace(/\*\*(?=\S)(.+?[_*]*)(?<=\S)\*\*|__(?=\S)(.+?[_*]*)(?<=\S)__/gs, (match, p1, p2) => `<strong>${p1 || p2}</strong>`);

  // Hantera *kursiv* och _kursiv_ (mer restriktiv för att undvika problem med t.ex. filnamn_med_understreck)
  // Only match if the marker is not preceded or followed by a word character or another marker
  text = text.replace(/(?<!\w|\*|_)(\*|_)(?=\S)(.+?[_*]*)(?<=\S)\1(?!\w|\*|_)/gs, (match, marker, content) => `<em>${content}</em>`);

  // Escapa resten av texten EFTER markdown-tolkning
  text = escapeHtml(text);

  // Återställ platshållare (baklänges för nästlade taggar)
  for (let i = placeholderId - 1; i >= 0; i--) {
      const id = `__HTMLPLACEHOLDER_${i}__`;
      // Använd en funktion i replace för att undvika problem med $ i ersättningstexten
      text = text.replace(id, () => placeholders[id]);
  }

  return text;
}


/**
* Genererar en URL-säker nyckel (slug) från ett namn/sträng.
* @param {string} name Strängen att konvertera.
* @returns {string} En normaliserad sträng (max 40 tecken).
*/
export function generateKeyFromName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase()
      .replace(/[åáàâã]/g, 'a').replace(/[äæ]/g, 'a') // Normalisera a/ä/å
      .replace(/[öøóòôõ]/g, 'o') // Normalisera o/ö
      .replace(/[^\w\s-]/g, '') // Ta bort specialtecken (behåll alfanum, underscore, space, bindestreck)
      .replace(/\s+/g, '-') // Ersätt mellanslag med bindestreck
      .replace(/-+/g, '-') // Ersätt flera bindestreck med ett
      .replace(/^-+|-+$/g, '') // Ta bort bindestreck i början/slutet
      .substring(0, 40); // Begränsa längden
}

/**
* Genererar en unik nyckel för ett krav baserat på titel och UUID.
* @param {string} title Kravets titel.
* @param {string} uuid Kravets UUID.
* @returns {string} En genererad nyckel.
*/
export function generateRequirementKey(title, uuid) {
  const titleKeyPart = generateKeyFromName(title || 'untitled');
  // Använd bara en del av UUID för att hålla nyckeln kortare
  const uuidPart = uuid ? uuid.substring(0, 8) : Date.now().toString(36);
  let combined = `${titleKeyPart}-${uuidPart}`;
  // Fallback om titeln inte gav någon nyckeldel
  if (!titleKeyPart) {
      combined = `req-${uuidPart}`;
  }
  // Säkerställ inga dubbla bindestreck eller i början/slutet
  return combined.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

/**
* Hämtar ett nästlat värde från ett objekt säkert.
* @param {object} obj Objektet att söka i.
* @param {string} path Sökvägen med punkter som separator (t.ex. 'metadata.mainCategory.text').
* @param {*} [defaultValue=null] Värdet som returneras om sökvägen inte finns.
* @returns {*} Värdet på sökvägen eller defaultValue.
*/
export const getVal = (obj, path, defaultValue = null) => {
  try {
      // Splitta bara om path är en sträng och inte tom
      const keys = (typeof path === 'string' && path) ? path.split('.') : [];
      let result = obj;

      for (const key of keys) {
          // Kontrollera att result är ett objekt och har nyckeln innan vi går vidare
          if (result !== null && result !== undefined && typeof result === 'object' && key in result) {
              result = result[key];
          } else {
              // Sökvägen finns inte fullt ut
              return defaultValue;
          }
      }
      // Returnera det hittade värdet, eller defaultValue om det slutliga värdet är undefined
      return result !== undefined ? result : defaultValue;
  } catch (e) {
      // Logga felet men returnera defaultValue för att undvika krasch
      console.error(`Error getting value for path "${path}" from object:`, obj, e);
      return defaultValue;
  }
};

console.log("Module loaded: utils/helpers"); // För felsökning
