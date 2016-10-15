/* global Polyglot, jQuery */

(function(window, $, Polyglot) {

    var phrases = {
        "make-reality": "TESTING"
    };

    var polyglot = new Polyglot({phrases: phrases});

    window.phrases = phrases;

    var phraseNames = Object.keys(phrases);
    
    window.phraseNames = phraseNames;
    for (var i = 0; i < phraseNames.length; i++) {
        var phraseName = phraseNames[i];
        $('.i8ln-' + phraseName).text(polyglot.t(phraseName));
    }

})(window, jQuery, Polyglot);