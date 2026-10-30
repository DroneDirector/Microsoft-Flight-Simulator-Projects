# Recorded flights

Flights recorded by the PC app from Microsoft Flight Simulator (Documents\Airline Manager Pro\Recordings).
`npm test` plays each one back through the flight tracker.

Next to a recording, `<same name>.expect.json` holds the confirmed results it must give, for example:

```json
{ "events": ["blocks-off", "takeoff", "touchdown", "blocks-on"], "touchdownFpm": [120, 220], "from": "EKVG", "to": "EKCH", "pax": 168 }
```
