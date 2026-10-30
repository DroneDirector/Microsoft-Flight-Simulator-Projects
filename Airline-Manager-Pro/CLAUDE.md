# Airline Manager Pro: project rules

## Aircraft performance data (take-off and landing)
- Take-off and landing speeds, MTOW, MLW and typical seats for every aircraft type come from the reference
  documents in `docs/reference/`:
  - `takeoff-speeds-and-weights.txt` and `landing-speeds-and-weights.txt` (the owner's documents),
  - `additional-aircraft-speeds-and-weights.txt` (the types those two don't list).
- **Every aircraft type added to the app from now on gets the same data.** If it isn't in any of the
  documents, look it up (manufacturer data, the aircraft's POH/AFM, airport-planning documents, pilot
  organisations' reviews), add a row to `additional-aircraft-speeds-and-weights.txt` in the same format,
  with sources, and mark values that are worked out rather than published (D: rotation ≈ 1.2 × Vso,
  approach ≈ 1.3 × Vso). Do this in the same change that adds the aircraft.
- **Flaps, gear and phase speeds**: every type also gets its flap settings with their limit speeds (VFE), gear
  limits (VLO/VLE), take-off and landing settings, the speeds crews select each flap step at, and its
  climb, cruise and descent speeds, in `docs/reference/flap-gear-and-phase-speeds.txt` (with sources) and
  `src/data/flight-configs.ts`. The aircraft in the app configure and fly by these.
- **Shape and 3D model**: every type gets an entry in `src/data/aircraft-shapes.ts` from its published
  dimensions (length, span, height, fuselage, wing position/chords/sweep, engines, tail, nose, wingtips,
  gear). The aircraft pictures and the 3D view are built from it, so a new type looks like itself.
  Our own models only: no downloaded third-party models and no manufacturers' or airlines' logos.
- **Runways and capacity**: every type also gets its take-off and landing field lengths, minimum runway width
  and rough-strip ability (`src/core/runway-req.ts`), and its typical/all-economy/maximum seats
  (`src/data/capacity.ts`), listed in `docs/reference/runway-requirements.txt`.
- **Weather limits**: every type also gets its crosswind, tailwind, landing and take-off minima, IFR and
  known-icing approval (`WX_LIMITS` in `src/core/weather.ts`), listed in `docs/reference/weather-limits.txt`.
- **Engines**: every type also lists the engines it is built with (`src/data/engines.ts`, `docs/reference/engines.txt`),
  with their effect on fuel, maintenance, reliability and price where there is a choice.
- Taxi speeds (all types): tight turns or near obstacles 5–10 kt; normal straight taxiways 15–25 kt;
  long straight taxiways up to about 30 kt; approaching the runway or the stand 5–10 kt; pushback 3–5 kt.

## Working rules
- Sign every commit as `DroneDirector <simon@dronedirector.fo>`, with no co-author or session lines.
- Never mention in code, comments, text or commits that anything is made with AI.
- Licences of anything used must allow commercial sale.
- Updates install over the old version and keep the user's data.
- Always build and release the phone app and the PC app together.
- Work goes to branch `amp-0.5.1-work`; merging to `main` releases (the build runs on `Airline-Manager-Pro/**` changes on main).
- Never put registration keys or reactivation codes in this (public) repository: only their fingerprints.

## Before the final release (1.0)
Remind the owner of this when the app is made final (version 1.0 or the release called final), before publishing:
- **VATSIM**: its user agreement forbids using its data in a paid app without written permission.
- **IVAO, SimBrief's flight plan import and Hoppie ACARS**: none of them publish terms for paid apps, and SimBrief issues access keys on request.
All four are built but switched off in `app.config.json` → `services`. Turn one on only once its permission is in writing.
The build prints this reminder for any version 1.0 or later while one of them is still off.
