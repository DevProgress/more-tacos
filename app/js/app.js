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
      // Google maps marker creation has these backwards
      height: 60,
      width: 34,
      url: 'images/marker_truck_blue.png',
    },
    // Active taco truck icon settings.
    userMarker: {
      height: 60,
      width: 34,
      url: 'images/marker_truck_dkblue.png',
    },
    // MarkerCluster options.
    mcOptions: {
      zoomOnClick: false,
      maxZoom: 15,
      styles: [
        {
          height: 34,
          width: 60,
          url: 'images/marker_truck_blue_plain.png',
          textColor: '#fece3f'
        }
      ]
    },
    // ELement selector for the inital tooltip save prompt.
    initialMessage: '#initial-content',
    initialMessageWithPos: '#initial-content-with-initial-pos',
    // format values for marker icons
    clusterCalculator: function(markers, numStyles) {
      var count = markers.length;
      if (count > 1000) {
        count = parseInt(count/100)/10+'k';
      }
      return {
        text: count,
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
    streetViewControl: false,
    clickableIcons: false
  });

  /** @private {MarkerClusterer} Pin clustering object. */
  this._mc = new window.MarkerClusterer(this._map, [], CONFIG.TACO_MAP.mcOptions);
  this._mc.setCalculator(CONFIG.TACO_MAP.clusterCalculator);

  /** @private {google.maps.InfoWindow} Pop-up window for the map. */
  this._iw = new google.maps.InfoWindow({maxWidth: 270});

  /** @private {google.maps.Marker} The user's draggable marker. */
  this._userMarker = new google.maps.Marker({
    draggable: true,
    raiseOnDrag: false,
    icon: {
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

  google.maps.event.addListener(this._userMarker, 'dragend', function() {
    this._updateHash();
    this._map.panTo(this.getUserPosition());
  }.bind(this));

  google.maps.event.addListener(this._map, 'click', function(ev) {
    this._userMarker.setPosition(ev.latLng);
    this._updateHash();
  }.bind(this));

  this._map.addListener('center_changed', debounce(function() {
    this._userMarker.setPosition(this._map.getCenter());
    this._updateHash();
  }.bind(this), 100));

  this._map.addListener('zoom_changed', function() {
    this._updateHash();
  }.bind(this));

  this._updateHash();

  return this;
};

/**
 * Updates the location hash to reflectthe user's marker's position and map
 * zoom level.
 * @private
 * @return {this} TacoMap
 */
TacoMap.prototype._updateHash = function() {

  if (!('replaceState' in history)) {
    return this;
  }

  $(this._map).trigger('updatedHash');

  var newPos = this.getUserPosition();
  var hash = '#/lat/' + newPos.lat + '/lng/' + newPos.lng + '/zoom/' + this._map.getZoom();

  history.replaceState(null, null,hash);

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
    icon: CONFIG.TACO_MAP.staticMarker,
    position: coord,
    zIndex: 9,
    map: this._map
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
    this._iw.setContent(this.getInfoWindowHTML());
    this._iw.open(this._map, this._userMarker);
    // need to add this here because it wasn't in the DOM before
    $('.log-action').on('click', function(self) {
      this.logAction($(self.target).attr('data-action'));
    }.bind(this));

    google.maps.event.addListenerOnce(this._userMarker, 'dragend', function() {
      this._iw.setContent($('#initial-content').html());
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
      this._iw.setContent($('#initial-content').html());
    }.bind(this));

    this._map._isBusy = false;
    $(this._map).trigger('saveError');
  }.bind(this));

  return this;
};


/**
 * Creates & maintains the share urls for the app
 * @method
 * @return {Object} twitter, facebook urls
 */

TacoMap.prototype.getShareLinks = function() {

    // pulls from the updated url
    var url = window.location.href;

    return {
        twitter: 'http://twitter.com/intent/tweet?url='+ encodeURIComponent(url) + '&text=I%20just%20sponsored%20a%20virtual%20taco%20truck.%20You%20can,%20too.%20Taco trucks on every corner.&hashtags=ImWithHer,TacoTrucksOnEveryCorner',
        facebook: 'http://facebook.com/sharer/sharer.php?u='+ encodeURIComponent(url)
    };

};


/**
 * Creates the info window content so we can dynamically set the share url.
 * @method
 * @return {HTML} Returns window html
 */

TacoMap.prototype.getInfoWindowShareButtons = function() {
    var shares = this.getShareLinks();
    //var html = '<a href="https://www.hillaryclinton.com/donate/?amount=10.00&utm_source=tacotrucksparty" target="donate" class="btn btn-xs btn-primary log-action" data-action="donate">Donate</a> ';
    var html = '<a href="' + shares.twitter + '" class="btn btn-xs btn-secondary btn-tweet js-share-twitter log-action" data-action="tweet"><i class="fa fa-twitter" /></i> Tweet</a> ';
    html += '<a href="'+ shares.facebook +'" class="btn btn-xs btn-secondary btn-share js-share-facebook log-action" data-action="share" target="share"><i class="fa fa-facebook-official" ></i> Share</a>';
    return html;
};

TacoMap.prototype.getInfoWindowHTML = function() {
    var html = '<div class="popup-share"><p>Tell your friends:<br>"I just sponsored a taco truck at TacoTrucks.Party"</p>';
    html += '<p>'+this.getInfoWindowShareButtons()+'</p></div>';
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
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 * @param {function} func - Function to debounce.
 * @param {number} wait - Debounce interval.
 * @param {boolean} immediate - Whether to trigger the function on the leading
 *   or trailing edge.
 * @return {function}
 */
function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

/**
 * Initialization callback to kick things off once Google maps have loaded.
 * Set initial position and zoom level if present in the hash.
 */
function initialize() {
  var tacoMap;
  var initialPos = null;
  var initialZoom = null;

  // show description as dismissible popover on mobile
  if (!$('.description:visible').length) {
    $('#description-popover').popover({
      placement: 'bottom',
      html: true,
      content: $('#description-text').html()
    });
    $('#description-popover').popover('show');
    $('#description-popover').on('click', function() {
      $('#description-popover').popover('toggle');
    });
    setTimeout(function() {
      $('#description-popover').popover('hide');
    }, 10000);
    $('.popover-content').on('click', function (e) {
      $('#description-popover').popover('hide');
    });
  }
  var r = Rlite();

  r.add('lat/:lat/lng/:lng/zoom/:zoom', function (r) {

      try {
        var coord = {
          lat: parseFloat(r.params.lat),
          lng: parseFloat(r.params.lng)
        };
        if (TacoMap.isValidCoord(coord)) {
          initialPos = coord;
        }
      } catch (e) {}

      if (r.params.zoom) {
        try {
          var zoom = parseInt(r.params.zoom, 10);
          if (zoom >= 0 && zoom <= 18) {
            initialZoom = zoom;
          }
        } catch (e) {}
      }

  });

  // quick & dirty for routing

  // Hash-based routing
  function processHash() {
    var hash = location.hash || '#';
    r.run(hash.slice(1));
  }

  window.addEventListener('hashchange', processHash);

  processHash();


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
    return true;
  });
  $('.log-action').on('click', function() {
    tacoMap.logAction($(this).attr('data-action'));
  });

  /**
   * Set the initial share links and watch for changes to the hash
 */

  createShareLinks(tacoMap);

  $(tacoMap._map).on('updatedHash', function(event) {
     createShareLinks(tacoMap);
  });

  $('body').on('.js-share-twitter,.js-share-facebook', 'click', function(event) {
      event.preventDefault();

      var url = $(this).attr('href');
      handleShareLinks(url, 400,400);
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



// helpers

/**
 * Updates the share links (on top of the map)
 * @param {Object} passes the taco object for access to API
 **/

function createShareLinks(tacoMap) {

    var shares = tacoMap.getShareLinks();

    $('.js-share-twitter').attr('href', shares.twitter);
    $('.js-share-facebook').attr('href', shares.facebook);
    $('#social').css('left', ($('#map').width()-190)+'px');
}

/**
 * Creates the popup links for sharing
 **/

function handleShareLinks(url, winWidth, winHeight) {
    var winTop = (screen.height / 2) - (winHeight / 2);
    var winLeft = (screen.width / 2) - (winWidth / 2);
    window.open(url, 'sharer', 'top=' + winTop + ',left=' + winLeft + ',toolbar=0,status=0,width=' + winWidth + ',height=' + winHeight);
}
