firebase.initializeApp({
    apiKey: 'AIzaSyBqSP5M103Gk1MkvE3ANTiWoNzX1lz2B0U',
    authDomain: 'virtual-taco-tru-1473204584057.firebaseapp.com',
    databaseURL: 'https://virtual-taco-tru-1473204584057.firebaseio.com',
    storageBucket: 'virtual-taco-tru-1473204584057.appspot.com'
});

firebase.database().ref('trucks').once('value', function(snapshot) {
    $('#truck-count').text(snapshot.numChildren().toLocaleString());
});

firebase.database().ref('logs/donate').once('value', function(snapshot) {
    $('#donate-count').text(snapshot.numChildren().toLocaleString());
});

firebase.database().ref('logs/share').once('value', function(snapshot) {
    $('#facebook-count').text(snapshot.numChildren().toLocaleString());
});

firebase.database().ref('logs/tweet').once('value', function(snapshot) {
    $('#twitter-count').text(snapshot.numChildren().toLocaleString());
});
