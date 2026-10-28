# Airline Manager Pro PC app

Runs on the Windows PC with Microsoft Flight Simulator 2024 (or 2020) and links it to the Airline Manager Pro Android app over your Wi-Fi.

- Reads your aircraft through SimConnect with [node-simconnect](https://github.com/EvenAR/node-simconnect). No SDK or SimConnect.dll is needed on the PC.
- Tracks each leg: blocks off, take-off, touchdown (landing rate, G, pitch), blocks on, with distance, block time and fuel used.
- Detects only what the sim can report: tail strikes, hard landings, flap and gear overspeed, engine failures, overstress, severe turbulence and crashes.
- Reads fuel, empty weight, total weight, max take-off weight and payload stations. Reads GSX Pro boarding numbers when GSX is running, and falls back to the sim's payload data when it isn't.
- Finds nearby airports through the sim's facilities data.
- Sends everything to the phone over a local WebSocket (port 47610) and answers discovery on UDP 47611. Phones pair once with a 6-digit code.

## Use

Download `AirlineManagerPro-PC-<version>.zip` from Releases, unzip it, and run `AirlineManagerPro-PC.exe`. Then link it from the phone. Run `AirlineManagerPro-PC.exe --demo 30` to try the link with a simulated flight, without Flight Simulator.

Windows may warn about an unrecognised app the first time, because the test builds aren't code-signed yet: choose **More info → Run anyway**. Allow it on **private networks** when the firewall asks.

## Develop

```bash
npm install
npm run build
npm test          # simulated flights through the tracker, and pairing and live data over the link
npm run demo      # PC app with a simulated flight
```

`ci/package-pc.mjs` builds the Windows package on GitHub: a single `.exe`, plus node-simconnect as its own unmodified library folder (GNU LGPL v3).
