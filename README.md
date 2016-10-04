# More taco trucks!

Display a Google map with a draggable taco truck marker.  On save, write coordinates to a Firebase database.  Get markers placed by others and display on the map.

https://devprogress.us/more-tacos/

## Local setup

  Clone this repository.

  To run directly on the host:

    - install node >= 0.12
    - install dependencies in the app directory: `npm install`
    - start the development server from the app directory: `npm run gulp-watch`

  To run from within Docker container (helpful if you do not want to install node on the host):

    - install docker and docker-compose
    - build container: `docker-compose build`
    - install dependencies: `docker-compose run more-tacos npm install`
    - start the development server: `docker-compose up`

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
