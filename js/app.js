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
        y: 30
      },
      origin: {
        x: 0,
        y: 0
      },
      height: 60,
      width: 60,
      url: '/images/taco_truck.png',
    },
    // Active taco truck icon settings.
    userMarker: {
      anchor: {
        x: 0,
        y: 30
      },
      origin: {
        x: 0,
        y: 0
      },
      height: 60,
      width: 60,
      url: '/images/taco_truck_active.png',
    },
    // MarkerCluster options.
    mcOptions: {
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
    },
    // Element selector for confirmation message.
    saveConfirmation: '#info-content',
    // Default initial map zoom level.
    initialZoom: 15
  }
};

/**
 * @constructor
 * @param {HTMLElement} mapEl - HTML element containing the map.
 * @param {Firebase} databaseRef - Firebase reference to the marker DB.
 * @param {?Object} initalPosition - Optional lat, lng coordinates to set
 *   maps initial center.
 * @param {number} initialPosition.lat - Initial latitude.
 * @param {number} initialPosition.lng - Initial longitude.
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
    zoom: initialZoom || CONFIG.TACO_MAP.initialZoom
  });

  /** @private {MarkerClusterer} Pin clustering object. */
  this._mc = new window.MarkerClusterer(this._map, [], CONFIG.TACO_MAP.mcOptions);

  /** @private {google.maps.InfoWindow} Pop-up window for the map. */
  this._iw = new google.maps.InfoWindow();

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
  this._db.ref().update(update).then(function() {
    this._userMarker.setAnimation(null);
    $(this._map).trigger('saveSuccess');
    this._iw.setContent($(CONFIG.TACO_MAP.saveConfirmation).html());
    this._iw.open(this._map, this._userMarker);
  }.bind(this));

  return this;
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
    var coord = {
      lat: parseFloat(coords[0]),
      lng: parseFloat(coords[1])
    };
    if (TacoMap.isValidCoord(coord)) {
      initialPos = coord;
    }
    if (coords[2] && isFinite(coords[2])) {
      initialZoom = parseInt(coords[2], 10);
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

  $('#save').on('click', function() {
    if (tacoMap.isBusy()) {
      return;
    }

    tacoMap.saveMarker();
  })
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
