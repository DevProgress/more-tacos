/* global Polyglot, jQuery */

(function(window, $, Polyglot) {

    var SUPPORTED_TRANSLATIONS = ['es'];

    /**
     * Inspect browser locale, as available to JavaScript.
     * Based on https://github.com/maxogden/browser-locale
     *
     * @return {string} the two-character language code found
     */
    function browserLocale() {
        var lang;
        if (navigator.languages) {
            lang = navigator.languages[0];
        } else if (navigator.userLanguage) {
            lang = navigator.userLanguage;
        } else {
            lang = navigator.language;
        }
        return lang.slice(0, 2);
    }

    /**
     * Replace English text on page with translations.
     * Expects the elements containing the text to have classes named
     * i18n-{phrase name} with phrase names matching those in the phrase dictionary.
     *
     * @param {Object} phrases Dictionary of translations
     */
    function translate(phrases) {
        var polyglot = new Polyglot({phrases: phrases});
        var phraseNames = Object.keys(phrases);
        
        for (var i = 0; i < phraseNames.length; i++) {
            var phraseName = phraseNames[i];
            $('.i18n-' + phraseName).text(polyglot.t(phraseName));
        }
    }

    var locale = browserLocale();

    var localeIdx = SUPPORTED_TRANSLATIONS.indexOf(locale);
    if (localeIdx < 0) {
        // browser locale not supported; leave untranslated
        return;
    }

    $.get('js/i18n/' + locale + '.json').then(function(result) {
        translate(result);
    });

})(window, jQuery, Polyglot);