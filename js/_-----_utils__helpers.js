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
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
* Tolkar en enkel variant av Markdown till HTML.
* Hanterar **fet**, _kursiv_. Nyradstecken bevaras (förutsätter CSS `white-space: pre-line` eller `break-spaces`).
* @param {string} text Texten att tolka.
* @returns {string} HTML-sträng.
*/

// NY, KORRIGERAD KOD
export function parseSimpleMarkdown(text) {
    if (typeof text !== 'string' || !text) {
        return text;
    }

    let processedText = text;

    // 1. Skydda medveten HTML som vi vill bevara (t.ex. länkar, br, hr)
    const placeholders = {};
    let placeholderId = 0;
    // Denna regex fångar både par-taggar som <a>...</a> och enskilda taggar som <br>
    processedText = processedText.replace(/<(a|pre)\b[^>]*>.*?<\/\1>|<(br|hr)\b[^>]*\/?>/gis, (match) => {
        const id = `__MARKDOWN_PLACEHOLDER_${placeholderId++}__`;
        placeholders[id] = match;
        return id;
    });

    // 2. Escapa ALLT annat för att neutralisera oönskad HTML
    processedText = escapeHtml(processedText);

    // 3. Applicera Markdown-regler på den nu säkra texten
    processedText = processedText.replace(/\*\*(?=\S)(.+?[_*]*)(?<=\S)\*\*|__(?=\S)(.+?[_*]*)(?<=\S)__/gs, (match, p1, p2) => `<strong>${p1 || p2}</strong>`);
    processedText = processedText.replace(/(?<!\w|\*|_)(\*|_)(?=\S)(.+?[_*]*)(?<=\S)\1(?!\w|\*|_)/gs, (match, marker, content) => `<em>${content}</em>`);

    // 4. Återställ de skyddade HTML-taggarna
    for (let i = placeholderId - 1; i >= 0; i--) {
        const id = `__MARKDOWN_PLACEHOLDER_${i}__`;
        processedText = processedText.replace(id, () => placeholders[id]);
    }

    return processedText;
}

/**
 * Converts URLs and email addresses within an HTML string to clickable HTML links.
 * Processes only text nodes to avoid breaking existing HTML structure.
 * @param {string} htmlString The HTML string to linkify.
 * @returns {string} HTML string with URLs and emails in text nodes converted to <a> tags.
 */
export function linkifyText(htmlString) {
    if (typeof htmlString !== 'string' || !htmlString) {
        return htmlString;
    }

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlString;

    const urlPattern = /(\b(?:https?|ftp):\/\/[-\w@:%\._\+~#=]{1,256}\.[a-zA-Z\d()]{1,6}\b(?:[-\w\d()@:%_\+.~#?&//=]*)|(?:www\.)[-\w@:%\._\+~#=]{1,256}\.[a-zA-Z\d()]{1,6}\b(?:[-\w\d()@:%_\+.~#?&//=]*))/gi;
    const emailPattern = /([\w\.\-\+]+@[\w\.\-]+\.[\w\-]+)/gi;

    function processNodeRecursively(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.parentNode &&
                (node.parentNode.nodeName === 'SCRIPT' ||
                 node.parentNode.nodeName === 'STYLE' ||
                 node.parentNode.closest('a'))) {
                return;
            }

            let textContent = node.nodeValue;
            const fragment = document.createDocumentFragment();
            let resultNodes = [document.createTextNode(textContent)];

            // Process URLs
            let currentNodesForUrlProcessing = [...resultNodes];
            resultNodes = [];
            currentNodesForUrlProcessing.forEach(subNode => {
                if (subNode.nodeType === Node.TEXT_NODE) {
                    let subText = subNode.nodeValue;
                    let lastUrlIndex = 0;
                    subText.replace(urlPattern, (match, url, offset) => {
                        if (offset > lastUrlIndex) {
                            resultNodes.push(document.createTextNode(subText.substring(lastUrlIndex, offset)));
                        }
                        const link = document.createElement('a');
                        let href = url;
                        if (href.startsWith('www.')) {
                            href = 'http://' + href;
                        }
                        link.href = href;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.appendChild(document.createTextNode(url));
                        resultNodes.push(link);
                        lastUrlIndex = offset + url.length;
                        return match;
                    });
                    if (lastUrlIndex < subText.length) {
                        resultNodes.push(document.createTextNode(subText.substring(lastUrlIndex)));
                    }
                } else {
                    resultNodes.push(subNode);
                }
            });

            // Process Emails on the potentially modified list of nodes
            let currentNodesForEmailProcessing = [...resultNodes];
            resultNodes = [];
            currentNodesForEmailProcessing.forEach(subNode => {
                if (subNode.nodeType === Node.TEXT_NODE) {
                    let subText = subNode.nodeValue;
                    let lastEmailIndex = 0;
                    subText.replace(emailPattern, (match, email, offset) => {
                        if (offset > lastEmailIndex) {
                            resultNodes.push(document.createTextNode(subText.substring(lastEmailIndex, offset)));
                        }
                        const mailLink = document.createElement('a');
                        mailLink.href = 'mailto:' + email;
                        mailLink.appendChild(document.createTextNode(email));
                        resultNodes.push(mailLink);
                        lastEmailIndex = offset + email.length;
                        return match;
                    });
                    if (lastEmailIndex < subText.length) {
                        resultNodes.push(document.createTextNode(subText.substring(lastEmailIndex)));
                    }
                } else {
                    resultNodes.push(subNode);
                }
            });

            resultNodes.forEach(fn => fragment.appendChild(fn));

            if (fragment.childNodes.length > 0 && (fragment.childNodes.length > 1 || fragment.firstChild.nodeType !== Node.TEXT_NODE || fragment.firstChild.nodeValue !== node.nodeValue )) {
                node.parentNode.replaceChild(fragment, node);
            }

        } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach(child => processNodeRecursively(child));
        }
    }

    processNodeRecursively(tempContainer);
    return tempContainer.innerHTML;
}

/**
* Genererar en URL-säker nyckel (slug) från ett namn/sträng.
* @param {string} name Strängen att konvertera.
* @returns {string} En normaliserad sträng (max 40 tecken).
*/
export function generateKeyFromName(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .trim()
        .toLowerCase()
        // Ersätt svenska tecken
        .replace(/å/g, 'a')
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        // Endast a-z, 0-9 och bindestreck
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') // Ta bort ledande/efterföljande -
        .substring(0, 40);
}

/**
* Genererar en unik nyckel för ett krav baserat på titel och UUID.
* @param {string} title Kravets titel.
* @param {string} uuid Kravets UUID.
* @returns {string} En genererad nyckel.
*/
export function generateRequirementKey(title, uuid) {
    const titleKeyPart = generateKeyFromName(title || 'untitled');
    const uuidPart = uuid ? uuid.substring(0, 8) : Date.now().toString(36);
    let combined = `${titleKeyPart}-${uuidPart}`;
    if (!titleKeyPart) {
        combined = `req-${uuidPart}`;
    }
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
        const keys = (typeof path === 'string' && path) ? path.split('.') : [];
        let result = obj;

        for (const key of keys) {
            if (result !== null && result !== undefined && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                return defaultValue;
            }
        }
        return result !== undefined ? result : defaultValue;
    } catch (e) {
        console.error(`[Error] getVal: Error getting value for path "${path}" from object:`, obj, e);
        return defaultValue;
    }
};

console.log("Module loaded: utils/helpers (v6 - Using new generateKeyFromName)");
