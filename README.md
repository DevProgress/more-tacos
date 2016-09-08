# More taco trucks!

Display a Google map with a draggable taco truck marker.  On save, write coordinates to a Firebase database.  Get markers placed by others and display on the map.

https://devprogress.us/more-tacos/

## local setup

Clone this repo

Run `python -m SimpleHTTPServer 8888`

Go to `http://127.0.0.1:8888/`

## Firebase config

Taco truck icon coordinates stored in /trucks/_generatedId_:

    {
        "lat": 38.8976763,
        "lng": "-77.0365298"
    }

rules:
- create only; no edit or delete
- lng must be >= -180 and <= 180
- lat must be >= 0 and <= 90

```
    {
      "rules": {
        ".read": true,
          "trucks": {
            "$id": {
                    ".write":"!data.exists() && newData.exists()",
              "lat": {
                ".validate": "newData.isNumber() && newData.val() >=0 && newData.val() <= 90"
              },
              "lng": {
                ".validate": "newData.isNumber() && newData.val() >= -180 && newData.val() <= 180"
              }
            }
          }
      }
    }
```
