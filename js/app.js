/* global google, jQuery */

(function(window, $, google) {

/**
 * Configuration values for Firebase, Google, and TacoMap options.
 */
var CONFIG = {
  // Firebase app initialize.
  FIREBASE: {
    apiKey: 'AIzaSyBqSP5M103Gk1MkvE3ANTiWoNzX1lz2B0U',
    authDomain: 'virtual-taco-tru-1473204584057.firebaseapp.com',
    databaseURL: 'https://virtual-taco-tru-1473204584057.firebaseio.com',
    storageBucket: 'virtual-taco-tru-1473204584057.appspot.com'
  },
  // Google API key.
  GOOGLE_API_KEY: 'AIzaSyC0xQ57bjRAv9JpC-u14Ps0DwG7EDFJAzU',
  // Taco Map settings.
  TACO_MAP: {
    // Center coordinates of the map when one isn't provided in the hash or
    // by using geolocation.
    defaultCenter: {
      lat: 38.897885,
      lng: -77.036508
    },
    // Static taco truck icon settings.
    staticMarker: {
      anchor: {
        x: 0,
        y: 0
      },
      origin: {
        x: 0,
        y: 0
      },
      height: 60,
      width: 42,
      url: 'images/marker_truck_white.png',
    },
    // Active taco truck icon settings.
    userMarker: {
      anchor: {
        x: 0,
        y: 0
      },
      origin: {
        x: 0,
        y: 0
      },
      height: 60,
      width: 42,
      url: 'images/marker_truck_blue.png',
    },
    // MarkerCluster options.
    mcOptions: {
      styles: [
        {
          height: 40,
          width: 60,
          url: 'images/marker_truck_plain.png',
          anchor: [-5, -5]
        }
      ]
    },
    // ELement selector for the inital tooltip save prompt.
    initialMessage: '#initial-content',
    initialMessageWithPos: '#initial-content-with-initial-pos',
    // ELement selector for the save prompt after initial drag.
    savePrompt: '#save-content',
    // format values for marker icons
    clusterCalculator: function(markers, numStyles) {
      var count = markers.length;
      if (count > 1000) {
        count = parseInt(count/100)/10+'k';
      }
      return {
        text: '&nbsp;&nbsp;&nbsp;'+count,
        index: 0
      };
    },

    // Element selector for save confirmation message.
    saveConfirmation: '#info-content',
    // Element selector for save error message.
    saveError: '#error-content',
    // Default initial map zoom level.
    initialZoom: 15,
  }
};

/**
 * @constructor
 * @param {HTMLElement} mapEl - HTML element containing the map.
 * @param {Firebase} database - Firebase reference to the marker DB.
 * @param {?Object} initalPosition - Optional lat, lng coordinates to set
 *   maps initial center.
 * @param {number} initialPosition.lat - Initial latitude.
 * @param {number} initialPosition.lng - Initial longitude.
 * @param {number} initialZoom - Optional zoom value to set on the map.
 */
var TacoMap = function(mapEl, database, initialPosition, initialZoom) {
  /** @private {Object} Initial map center coordinates. */
  this._initialPosition = initialPosition || CONFIG.TACO_MAP.defaultCenter;

  /** @private {Firebase} Firebase database for the marker database. */
  this._db = database;

  /** @private {google.maps.Map} Google map object. */
  this._map = new google.maps.Map(mapEl, {
    center: new google.maps.LatLng(this._initialPosition.lat,
        this._initialPosition.lng),
    zoom: initialZoom || CONFIG.TACO_MAP.initialZoom,
    mapTypeControl: false,
    streetViewControl: false
  });

  /** @private {MarkerClusterer} Pin clustering object. */
  this._mc = new window.MarkerClusterer(this._map, [], CONFIG.TACO_MAP.mcOptions);
  this._mc.setCalculator(CONFIG.TACO_MAP.clusterCalculator);

  /** @private {google.maps.InfoWindow} Pop-up window for the map. */
  this._iw = new google.maps.InfoWindow({maxWidth: 200});

  /** @private {google.maps.Marker} The user's draggable marker. */
  this._userMarker = new google.maps.Marker({
    draggable: true,
    icon: {
      anchor: new google.maps.Point(CONFIG.TACO_MAP.userMarker.anchor.x,
          CONFIG.TACO_MAP.userMarker.anchor.y),
      origin: new google.maps.Point(CONFIG.TACO_MAP.userMarker.origin.x,
          CONFIG.TACO_MAP.userMarker.origin.y),
      size: new google.maps.Size(CONFIG.TACO_MAP.userMarker.height,
          CONFIG.TACO_MAP.userMarker.width),
      url: CONFIG.TACO_MAP.userMarker.url
    },
    map: this._map,
    position: this._initialPosition,
    zIndex: 10
  });

  if (initialPosition) {
    this._iw.setContent($(CONFIG.TACO_MAP.initialMessageWithPos).html());
  } else {
    this._iw.setContent($(CONFIG.TACO_MAP.initialMessage).html());
  }

  /** @private {boolean} Whether or not this has been initialized. */
  this._isInitialized = false;

  /** @private {boolean} Whether or not this map is currently saving a new
    marker. */
  this._isBusy = false;

  this._init();
};

/**
 * If the map hasn't been intialized yet, add an event listener that appends
 * pins to the map on "child_added" event from Firebase. Add a "dragend" event
 * listener to the user marker pin that updates the location hash with the
 * latest marker position.
 * @method
 * @private
 * @return {this} TacoMap
 */
TacoMap.prototype._init = function() {
  if (this.isInitialized) {
    return this;
  }

  this._iw.open(this._map, this._userMarker);

    // Display the donation/share CTA.
  this._db.ref('trucks').on('child_added', function(data) {
    this.addMarker({
      lat: data.val().lat,
      lng: data.val().lng
    });
  }.bind(this));

  if ('replaceState' in history) {
    this._updateHash();
    google.maps.event.addListener(this._userMarker, 'dragend', function() {
      this._updateHash();
      this._map.panTo(this.getUserPosition());
    }.bind(this));

    this._map.addListener('zoom_changed', function() {
      this._updateHash();
    }.bind(this))
  }

  return this;
};

/**
 * Updates the location hash to reflectthe user's marker's position and map
 * zoom level.
 * @private
 * @return {this} TacoMap
 */
TacoMap.prototype._updateHash = function() {
  var newPos = this.getUserPosition();
  history.replaceState(null, null, '#' + newPos.lat + '_' + newPos.lng + '_' +
      this._map.getZoom());
  return this;
};

/**
 * Adds a marker to the map's MarkerClusterer manager at the provided
 * coordinates.
 * @method
 * @param {Object} coord - Coordinate object.
 * @param {Object} coord.lat - Coordinate object's latitude.
 * @param {Object} coord.lng - Coordinate object's latitude.
 * @return {this} TacoMap
 */
TacoMap.prototype.addMarker = function(coord) {
  if (!TacoMap.isValidCoord(coord)) {
    return this;
  }

  var marker = new google.maps.Marker({
    icon: {
      anchor: new google.maps.Point(CONFIG.TACO_MAP.staticMarker.anchor.x,
          CONFIG.TACO_MAP.staticMarker.anchor.y),
      origin: new google.maps.Point(CONFIG.TACO_MAP.staticMarker.origin.x,
          CONFIG.TACO_MAP.staticMarker.origin.y),
      size: new google.maps.Size(CONFIG.TACO_MAP.staticMarker.height,
          CONFIG.TACO_MAP.staticMarker.width),
      url: CONFIG.TACO_MAP.staticMarker.url
    },
    position: coord,
    zIndex: 9
  });
  this._mc.addMarker(marker);
  return this;
};

/**
 * Moves the center of the map to the provided coordinate and places the
 * user's marker there.
 * @method
 * @param {Object} coord - Coordinate object.
 * @param {Object} coord.lat - Coordinate object's latitude.
 * @param {Object} coord.lng - Coordinate object's latitude.
 * @return {this} TacoMap
 */
TacoMap.prototype.setCenter = function(coord) {
  if (!TacoMap.isValidCoord(coord)) {
    return this;
  }

  this._map.setCenter(coord);
  this._userMarker.setPosition(coord);
  return this;
};

/*
  Save an action to the /logs collection
*/
TacoMap.prototype.logAction = function(action) {
  var key = this._db.ref().child('logs/'+action).push().key;
  var update = {};
  update['/logs/' + action + '/'+ key] = this.getUserPosition();
  this._db.ref().update(update);
};

/**
 * Saves a marker to the database at the current user marker position and adds
 * a new marker at that location.
 * @method
 * @return {this} TacoMap
 */
TacoMap.prototype.saveMarker = function() {
  // Bounce the userMarker to indicate that something is happening.
  this._userMarker.setAnimation(google.maps.Animation.BOUNCE);

  // Fire a "saveStart" event on the map to provide an event hook.
  $(this._map).trigger('saveStart');

  // Update the database. Once it's successful, the "child_added" event will
  // fire and a new marker will be added to the map at which point we can
  // stop the bounce animation
  var key = this._db.ref().child('trucks').push().key;
  var update = {};
  update['/trucks/' + key] = this.getUserPosition();
  this._map._isBusy = true;
  this._db.ref().update(update).then(function() {
    // Success handler when the save is complete.
    var offset = Math.pow(2, 3 - this._map.getZoom());
    var position = this.getUserPosition();

    // Offset the marker so it doesn't overlap the new marker.
    this._userMarker.setAnimation(null);
    this._userMarker.setPosition({
      lat: position.lat - offset,
      lng: position.lng - offset
    });

    // Display the donation/share CTA.
    //this._iw.setContent($(CONFIG.TACO_MAP.saveConfirmation).html());
    this._iw.setContent(this.getInfoWindowHTML());
    this._iw.open(this._map, this._userMarker);
    // need to add this here because it wasn't in the DOM before
    $('.info-donate').on('click', function() {
      this.logAction('donate');
    }.bind(this));

    google.maps.event.addListenerOnce(this._userMarker, 'dragend', function() {
      this._iw.setContent($(CONFIG.TACO_MAP.savePrompt).html());
    }.bind(this));

    // Reset the map busy state and trigger a success event.
    this._map._isBusy = false;
    $(this._map).trigger('saveSuccess');
  }.bind(this), function() {
    // Error handler in case the save promise is rejected.
    this._userMarker.setAnimation(null);
    this._iw.setContent($(CONFIG.TACO_MAP.saveError).html());
    this._iw.open(this._map, this._userMarker);

    google.maps.event.addListenerOnce(this._userMarker, 'dragend', function() {
      this._iw.setContent($(CONFIG.TACO_MAP.savePrompt).html());
    }.bind(this));

    this._map._isBusy = false;
    $(this._map).trigger('saveError');
  }.bind(this));

  return this;
};


/**
 * Creates the info window content so we can dynamically set the share url.
 * @method
 * @return {HTML} Returns window html
 */

TacoMap.prototype.getInfoWindowHTML = function() {

    var url = window.location.href;

    var html = '<p>Tell your friend: ‘Hey! I just put a (virtual) taco truck on the map for you. Hopefully, when the taco truck invasion happens, they’ll put a real taco truck there!</p>';
    html += '<p><a href="https://www.hillaryclinton.com/donate/?amount=3.00&utm_source=tacotruckify" target="donate" class="btn btn-primary info-donate">Donate $3 to Hillary</a></p>';
    html += '<div>Share: <a href="http://twitter.com/intent/tweet?url='+ url +'" class="info-box-tweet">Tweet</a><a href="http://facebook.com/sharer/sharer.php?u='+ url +'">Share</a></div>';

    return html;
};

/**
 * Moves the center of the map to the provided coordinate and places the
 * user's marker there.
 * @method
 * @return {Object} lat, lng coordinate object
 */
TacoMap.prototype.getUserPosition = function() {
  var coord = {
    lat: this._userMarker.getPosition().lat(),
    lng: this._userMarker.getPosition().lng()
  };
  return coord;
};

/**
 * Returns
 * @method
 * @return {boolean}
 */
TacoMap.prototype.isBusy = function() {
  return this._isBusy;
};

/**
 * Validates a coordinate.
 * @static
 * @param {Object} coord - Coordinate object.
 * @param {Object} coord.lat - Coordinate object's latitude.
 * @param {Object} coord.lng - Coordinate object's latitude.
  * @return {boolean}
 */
TacoMap.isValidCoord = function(coord) {
  var lat = coord.lat;
  var lng = coord.lng;
  return (lat >= 0 && lat < 90 && lng >= -180 && lng <= 180);
};

/**
 * Initialization callback to kick things off once Google maps have loaded.
 * Set initial position and zoom level if present in the hash.
 */
function initialize() {
  var tacoMap;
  var initialPos = null;
  var initialZoom = null;

  if (location.hash) {
    var coords = location.hash.replace('#', '').split('_');
    try {
      var coord = {
        lat: parseFloat(coords[0]),
        lng: parseFloat(coords[1])
      };
      if (TacoMap.isValidCoord(coord)) {
        initialPos = coord;
      }
    } catch (e) {}
    if (coords[2]) {
      try {
        var zoom = parseInt(coords[2], 10);
        if (zoom >= 0 && zoom <= 18) {
          initialZoom = zoom;
        }
      } catch (e) {}
    }
  }

  tacoMap = new TacoMap(document.getElementById('map'),
      window.firebase.database(), initialPos, initialZoom);

  if (!initialPos && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
      tacoMap.setCenter({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    });
  }

  $('body').on('click', '.btn-save', function() {
    if (tacoMap.isBusy()) {
      return;
    }

    tacoMap.saveMarker();
  });
  $('.donate').on('click', function() {
    tacoMap.logAction('donate');
  });
}

/**
 * Initialize Firebase database connection.
 */
window.firebase.initializeApp(CONFIG.FIREBASE);

/**
 * Load the Google Maps API.
 */
google.load('maps', '3', {
  other_params: 'key=' + CONFIG.GOOGLE_API_KEY,
  callback: initialize
});

})(window, jQuery, google);
