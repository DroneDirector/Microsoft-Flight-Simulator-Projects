# Airline Manager Pro

A virtual airline manager for **Microsoft Flight Simulator 2024**, built for Android in landscape, with a Windows version and an in-sim toolbar panel planned.

Start your own airline or bush outfit, buy the aircraft you actually have installed in the simulator (default aircraft and add-ons), hire pilots who fly your routes on a live world map, and fly your own trips with a pilot profile that syncs with your simulator flights.

> **Status: 0.1.4, early preview.** Every screen, graphic and animation is in place and runs on demo data. The simulator link (PC bridge) is the next build stage.

## Get the app

Each push to `main` builds an APK in the cloud, signed with the same test key every time (see `signing/`), so new versions install over the old one and keep your saved airline. Download it from **Releases** (pre-release `airline-manager-pro-v…`) or from the latest run under **Actions**.

## Project layout

| Path | Contents |
|---|---|
| `app.config.json` | App name, app ID and version. Change the name here, nowhere else. |
| `src/` | TypeScript source: screens, map, aircraft illustrations, sounds |
| `www/` | Page template, styles and bundled fonts |
| `scripts/build.mjs` | Builds the app into `www/` (add `--preview` for a single-file preview in `dist/`) |
| `scripts/android-setup.sh` | Creates and configures the Android project (landscape, name, version) |
| `docs/FEATURES.md` | Full feature list: what's built and what's planned |
| `CHANGELOG.md`, `release-notes/` | Version history |

## Build locally

```bash
npm install
npm run build          # web app into www/
npm run preview        # single-file preview in dist/preview.html
bash scripts/android-setup.sh && (cd android && ./gradlew assembleDebug)
```

## Why it's built this way

The whole interface is plain HTML, CSS and TypeScript compiled to one classic script, and the map is drawn on a 2D canvas. The same code can run inside the Android app, a Windows desktop wrapper and the simulator's own toolbar panel, so nothing has to be redrawn or rewritten when it's ported.

## Credits

- Inter typeface by The Inter Project Authors, SIL Open Font License 1.1
- MapLibre GL JS, BSD 3-Clause License (optional street and satellite maps)
- Street map © OpenStreetMap contributors, OpenMapTiles, served by OpenFreeMap
- Satellite map: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0
- Aircraft illustrations, icons, map outlines and sounds are original to this project
- Aircraft makers and add-on developers are named only to identify products installed in the simulator
