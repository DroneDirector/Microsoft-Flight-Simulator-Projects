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
  Our own models only: no downloaded third-party models and no manufacturers' or airlines' logos. The owner may later
  put models he has bought (with a licence for commercial sale) in `www/models/` (see the rule on replaceable models).
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
- **People are one figure system everywhere**: staff, pilots, mechanics, passengers, your own avatar, the people in the
  office and the courtroom are all built with `src/graphics/human.ts` (`Human.build`), from the same look the app's
  pictures use (`dressed(look, role)`). An improvement to how people look must show in every place they appear:
  the app's pictures, the cabin, the 3D views, the office and the courtroom. Never add a separate figure for one place.
- **Talking mouths follow the voice**: every person who talks, in every place now and later (office, court, cabin, any new
  room), gets their mouth from `humanTalk(name, text, at)` in `src/graphics/human.ts`. While their line is being got
  ready to play the mouth stays still; from the moment the voice is heard it moves until the voice ends, and again from
  the start each time Play is pressed (`humanVoiceBusy` stops the silent reading-mouth while a voice is coming).
- **Your own lines are voiced too**: what you (the manager/pilot) say in a dialogue is spoken with your own voice
  (`me|sex|mood`, chosen when you create or edit your pilot: 20 male and 20 female voices); the other person never
  reads your lines.
- Sign every commit as `DroneDirector <simon@dronedirector.fo>`, with no co-author or session lines.
- Never mention in code, comments, text or commits that anything is made with AI.
- Licences of anything used must allow commercial sale.
- Updates install over the old version and keep the user's data.
- Always build and release the phone app and the PC app together.
- Work goes to branch `amp-0.5.1-work`; merging to `main` releases (the build runs on `Airline-Manager-Pro/**` changes on main).
- Never put registration keys or reactivation codes in this (public) repository: only their fingerprints.
- **Replaceable models**: every aircraft type, ground vehicle, the jet bridge, the people (per gender and group of
  looks), the hangar buildings (per size, with an optional `-pc` file used first on the PC), the hangar and lounge furniture, the vending items, every helicopter type (`helicopters/`) and the crash scene's vehicles, wreckage and effect pictures (`crash/`) have a file name in `www/models/` (`src/graphics/models.ts`; the build writes `www/models/README.md` with
  every name). A `.glb` there is used instead of the app's own model everywhere that model appears; without it, the
  app's own model. Anything new of these kinds (a new aircraft type, a new vehicle, new people) gets its file name
  and goes through `Models.swap` / `modelsPeople` the same way, in the same change.
- **The PC gets extra quality** (`hiQ()` in `src/core/util.ts`, true in the PC app): real lights and shadows instead of
  drawn ones, bigger shadow maps, a higher pixel ratio, sharper pictures and finer detail. Anything made lighter for
  phones and tablets stays full quality on the PC. Applies to everything from the seven batches of 0.9.105–0.9.111 on.

## Before the final release (1.0)
Remind the owner of this when the app is made final (version 1.0 or the release called final), before publishing:
- **VATSIM**: its user agreement forbids using its data in a paid app without written permission.
- **IVAO, SimBrief's flight plan import and Hoppie ACARS**: none of them publish terms for paid apps, and SimBrief issues access keys on request.
All four are built but switched off in `app.config.json` → `services`. Turn one on only once its permission is in writing.
The build prints this reminder for any version 1.0 or later while one of them is still off.
