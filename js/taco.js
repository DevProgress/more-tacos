var config = {
    apiKey: "AIzaSyBqSP5M103Gk1MkvE3ANTiWoNzX1lz2B0U",
    authDomain: "virtual-taco-tru-1473204584057.firebaseapp.com",
    databaseURL: "https://virtual-taco-tru-1473204584057.firebaseio.com",
    storageBucket: "virtual-taco-tru-1473204584057.appspot.com",
  };
firebase.initializeApp(config);
var trucksRef = firebase.database().ref('trucks');

var markers = [],
    map, lat, lng, activeImage, image, markerClusterer, activeMarker, infowindow;

function addMarker(coord, isActive) {

    // set up default options for a marker
    var options = {
        position: coord,
        zIndex: 10,
    };

    // if marker is active, set specific options
    // if default, set the default image
    if (isActive) {
        options.icon = activeImage;
        options.draggable = true;
        options.map = map;
        console.log('adding active', options);
    } else {
        options.icon = image;
    }


    // create the new marker
    var marker = new google.maps.Marker(options);

    // if active marker, set up the drag end event and set this marker as the active marker
    // if inactive marker, push to the cluster of markers
    if (isActive) {

        google.maps.event.addListener(marker,'dragend',function(event)  {
            lat = event.latLng.lat();
            lng = event.latLng.lng();
            console.log('drag end: lat='+lat+' lng='+lng);
        });

        activeMarker = marker;

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

// setup the map

function setupMap(mapOptions) {
    // create map object
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    // set lat/lng
    lat = mapOptions.center.lat();
    lng = mapOptions.center.lng();

    // create the draggable marker for the user to set a taco truck
    addMarker(mapOptions.center, true);

    // watch for locations being added to firebase db; push them to the map
    trucksRef.on('child_added', function(data) {
        var val = data.val();
        addMarker(new google.maps.LatLng(val.lat, val.lng));
    });
    infowindow = new google.maps.InfoWindow({
        content: $('#info-content').html()
    });
    // show tooltip for 10 seconds
    var tooltip = new google.maps.InfoWindow({
        content: $('#tooltip').html()
    });
    tooltip.open(map, activeMarker);
    window.setTimeout(function() {
        tooltip.close();
    }, 10000);
    // position buttons
    var mapWidth = $('#map').width();
    var saveWidth = $('#save-button').width();
    //$('#save-button').css({top: '10px', left: parseInt(mapWidth/2 - saveWidth/2)+'px'});
    $('#social').css({top: '10px', left: (mapWidth-50)+'px'});
    google.maps.event.addListenerOnce(map, 'idle', function() {
    });
}

function initialize() {
    activeImage = {
       url: 'taco_truck_active.png',
       size: new google.maps.Size(60, 60),
       origin: new google.maps.Point(0, 0),
       anchor: new google.maps.Point(30, 30)
    };
    image = {
       url: 'taco_truck.png',
       size: new google.maps.Size(60, 60),
       origin: new google.maps.Point(0, 0),
       anchor: new google.maps.Point(0, 0)
    };

    var mapOptions = {
        zoom: 15,
        center: new google.maps.LatLng(38.897885, -77.036508),
        mapTypeControl: false
    };

    if (location.hash) {
        var coords = location.hash.replace('#', '').split(/_/);
        try {
            lat = parseFloat(coords[1]);
            lng = parseFloat(coords[0]);
            if (lat >= 0 && lat < 90 && lng >= -180 && lng <= 180) {
                mapOptions.center = new google.maps.LatLng(lat, lng);
                return setupMap(mapOptions);
            }
        } catch (e) {
            console.log('invalid hash coordinates');
        }
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            mapOptions.center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            return setupMap(mapOptions);
        }, function error(msg) {
            return setupMap(mapOptions);
        });
    } else {
        return setupMap(mapOptions);
    }

}

$(function() {
    $('#save').on('click', function() {
        if (!lat || !lng) {
            return;
        }
        var key = firebase.database().ref().child('trucks').push().key;
        var update = {};
        update['/trucks/'+key] = {lat: lat, lng: lng};
        firebase.database().ref().update(update);
        location.hash = lat+'_'+lng;

        // change icon
        activeMarker.setIcon(image);
        activeMarker.setAnimation(google.maps.Animation.BOUNCE);
        window.setTimeout(function() {
            activeMarker.setAnimation(null);
            // Should always have a map by this point, but just in case....
            if (map) {
                zoomLevel = map.getZoom();
                offset = Math.pow(2, 3-zoomLevel);
                addMarker(new google.maps.LatLng(lat - offset, lng - offset), true);
            }
        }, 500);


        // set info content html
        infowindow = new google.maps.InfoWindow({
            content: $('.info-content').html()
        });

        // open info window
        infowindow.open(map, activeMarker);
    });
});
