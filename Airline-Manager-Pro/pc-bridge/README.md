# Airline Manager Pro PC app

Runs on the Windows PC with Microsoft Flight Simulator 2024 (or 2020) and links it to the Airline Manager Pro Android app over your Wi-Fi, or over your phone's hotspot (mobile data).

- Reads your aircraft through SimConnect with [node-simconnect](https://github.com/EvenAR/node-simconnect). No SDK or SimConnect.dll is needed on the PC.
- Tracks each leg: blocks off, take-off, touchdown (landing rate, G, pitch), blocks on, with distance, block time and fuel used.
- Detects only what the sim can report: tail strikes, hard landings, flap and gear overspeed, engine failures, overstress, severe turbulence and crashes.
- Reads fuel, empty weight, total weight, max take-off weight and payload stations. Reads GSX Pro boarding numbers when GSX is running, and falls back to the sim's payload data when it isn't.
- Finds nearby airports through the sim's facilities data.
- Sends everything to the phone over a local WebSocket (port 47610) and answers discovery on UDP 47611. Phones pair once with a 6-digit code.

## Use

Download `AirlineManagerPro-PC-<version>.zip` from Releases, unzip it, and run `AirlineManagerPro-PC.exe`. Then link it from the phone. Run `AirlineManagerPro-PC.exe --demo 30` to try the link with a simulated flight, without Flight Simulator.

Windows may warn about an unrecognised app the first time, because the test builds aren't code-signed yet: choose **More info → Run anyway**. Allow it on **private networks** when the firewall asks.

## Sim check and flight recordings

- `AirlineManagerPro-PC.exe --check` (or **Check Flight Simulator.cmd**): with a flight loaded, reads everything the app uses from the simulator and the loaded aircraft, marks anything missing, refused or out of place, and saves the report to `Documents\Airline Manager Pro\Diagnostics`.
- Every flight is recorded to `Documents\Airline Manager Pro\Recordings` as the simulator sent it (`--no-record` to turn it off). `--replay <file> [speed]` (or drag the file onto **Play back a flight.cmd**) plays it back to the phone as if the simulator were flying it.
- Recordings copied into `test/recordings/` are played through the flight tracker by `npm test`; a `.expect.json` next to one holds the results it must give.

## Develop

```bash
npm install
npm run build
npm test          # simulated flights through the tracker, and pairing and live data over the link
npm run demo      # PC app with a simulated flight
```

`ci/package-pc.mjs` builds the Windows package on GitHub: a single `.exe`, plus node-simconnect as its own unmodified library folder (GNU LGPL v3).

## Weather

The PC app also sends the weather around your aircraft from Flight Simulator to the phone: wind, visibility, temperature, pressure, cloud and precipitation, and how turbulent the flight is (graded from the aircraft's load-factor swings: light, moderate, severe).
