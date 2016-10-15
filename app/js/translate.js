/* global Polyglot, jQuery */

TacoTranslator = (function(window, $, Polyglot) {
    'use strict';

    var SUPPORTED_TRANSLATIONS = ['es'];

    var locale = null;
    var phrases = null;
    var polyglot = null;

    function TacoTranslator() {}

    TacoTranslator.prototype.initialize = initialize;
    TacoTranslator.prototype.translatePhraseInElement = translatePhraseInElement;

    return TacoTranslator;

    /**
     * Initialize translator.
     *
     * @return {Object} Promise resolving when translations are done loading.
     */
    function initialize() {
        var deferred = $.Deferred();
        locale = browserLocale();

        var localeIdx = SUPPORTED_TRANSLATIONS.indexOf(locale);
        if (localeIdx < 0) {
            // browser locale not supported; leave untranslated
            deferred.resolve();
            return deferred;
        }

        $.get('js/i18n/' + locale + '.json').then(function(result) {
            phrases = result;
            polyglot = new Polyglot({phrases: phrases});
            translate();
            deferred.resolve();
        }, deferred.reject);

        return deferred;
    }

    /**
     * Translate an HTML snippet. Expects `translate` to have already been called.
     *
     * @param {Object} $el jQuery element to translate
     * @returns {Object} $el jQuery element, translated 
     */
    function translatePhraseInElement($el) {
        var phraseNames = Object.keys(phrases);
        
        for (var i = 0; i < phraseNames.length; i++) {
            var phraseName = phraseNames[i];
            $el.find('.i18n-' + phraseName).text(polyglot.t(phraseName));
        }
        return $el;
    }

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
    function translate() {
        var phraseNames = Object.keys(phrases);
        
        for (var i = 0; i < phraseNames.length; i++) {
            var phraseName = phraseNames[i];
            $('.i18n-' + phraseName).text(polyglot.t(phraseName));
        }
    }

})(window, jQuery, Polyglot);