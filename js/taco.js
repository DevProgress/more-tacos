var config = {
    apiKey: "AIzaSyBqSP5M103Gk1MkvE3ANTiWoNzX1lz2B0U",
    authDomain: "virtual-taco-tru-1473204584057.firebaseapp.com",
    databaseURL: "https://virtual-taco-tru-1473204584057.firebaseio.com",
    storageBucket: "virtual-taco-tru-1473204584057.appspot.com",
  };
firebase.initializeApp(config);
var trucksRef = firebase.database().ref('trucks');

var markers = [],
    map, lat, lng, activeImage, image, markerClusterer;

function addMarker(coord, isActive) {
    var options = {
        position: coord,
        zIndex: 10,
    };
    if (isActive) {
        options.icon = activeImage;
        options.draggable = true;
    } else {
        options.icon = image;
    }
    var marker = new google.maps.Marker(options);
    if (isActive) {
        google.maps.event.addListener(marker,'dragend',function(event)  {
            lat = event.latLng.lat();
            lng = event.latLng.lng();
            console.log('drag end: lat='+lat+' lng='+lng);
        });
    } else {

        markerClusterer = markerClusterer || new MarkerClusterer(map, markers, {
            styles: [
                {
                    height: 52,
                    width: 53,
                    url: '/images/m1.png'
                },
                {
                    height: 56,
                    width: 55,
                    url: '/images/m2.png'
                },
                {
                    height: 66,
                    width: 65,
                    url: '/images/m3.png'
                },
                {
                    height: 78,
                    width: 77,
                    url: '/images/m4.png'
                },
                {
                    height: 90,
                    width: 89,
                    url: '/images/m5.png'
                }
            ]
        });
        markers.push(marker);
        console.log('add marker to clusterer');
        markerClusterer.addMarker(marker);
    }

}

function setupMap(mapOptions) {
    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    addMarker(mapOptions.center, true);
    trucksRef.on('child_added', function(data) {
        var val = data.val();
        addMarker(new google.maps.LatLng(val.lat, val.lng));
    });
}

function initialize() {
    var mapOptions = {
      zoom: 12,
      center: new google.maps.LatLng(38.897885, -77.036508)
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            mapOptions.center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            setupMap(mapOptions);
        }, function error(msg) {
            mapOptions.zoom = 17;
            setupMap(mapOptions);
        });
    } else {
        mapOptions.zoom = 5;
        setupMap(mapOptions);
    }

    activeImage = {
       url: 'taco_truck_sm.png',
       size: new google.maps.Size(60, 60),
       origin: new google.maps.Point(0, 0),
       anchor: new google.maps.Point(0, 32)
    };
    image = {
       url: 'taco_truck_sm.png',
       size: new google.maps.Size(60, 60),
       origin: new google.maps.Point(0, 0),
       anchor: new google.maps.Point(0, 32)
    };
}

$(function() {
    $("#save").on("click", function() {
        if (!lat || !lng) {
            return;
        }
        var key = firebase.database().ref().child('trucks').push().key;
        var update = {};
        update['/trucks/'+key] = {lat: lat, lng: lng};
        firebase.database().ref().update(update);
    });
});
