// Enkel ersättning för Helpers och Translation om de inte redan finns i ditt projekt.
(function() {
    'use strict';

    // -- Helper-objekt --
    window.Helpers = window.Helpers || {};

    // Genererar ett enkelt pseudo-slumpmässigt UUID v4.
    if (!window.Helpers.generate_uuid_v4) {
        window.Helpers.generate_uuid_v4 = function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
    }

    // Laddar en CSS-fil dynamiskt i <head>.
    if (!window.Helpers.load_css) {
        window.Helpers.load_css = function(path) {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`link[href="${path}"]`)) {
                    resolve();
                    return;
                }
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = path;
                link.onload = () => resolve();
                link.onerror = () => reject(new Error(`Failed to load CSS: ${path}`));
                document.head.appendChild(link);
            });
        };
    }

    // -- Translation-objekt --
    window.Translation = window.Translation || {};

    // Enkel översättningsfunktion som bara returnerar nyckeln.
    // I en riktig applikation skulle denna slå upp nyckeln i en språkfil.
    if (!window.Translation.t) {
        window.Translation.t = function(key) {
            // Tar bort prefix (t.ex. 'md_tooltip_') och ersätter understreck med mellanslag.
            const friendlyText = key.replace(/^md_tooltip_/, '').replace(/_/g, ' ');
            // Gör första bokstaven stor.
            return friendlyText.charAt(0).toUpperCase() + friendlyText.slice(1);
        };
    }

})();