# Changelog

## 0.9.81 (2026-11-03)

- the phone lies on the desk in the office (in front of the laptop) and in Operations (right of the keyboard), no longer past the desk edge
- held phone: still body and phone (frozen body time), turn and tilt on request (phoneTurn; buttons, L1/R1, d-pad), grip fitted per hand against the phone (humanHandPts, phoneFit)
- glass with reflections on the office laptop and the Operations monitor (roomGlassMat)
- Operations monitor: twice the pixels on the PC, departures board and a 12-hour timeline at the screen's own proportions

## 0.9.80 (2026-11-03)

- phone keyboard on the screen (letters, shift and caps lock, numbers and symbols, emoji, space, delete, send), toggle kept in settings.phoneKb; drafts kept while you type
- controller: Circle in your office and Operations closes the phone screen, puts the phone down, closes what is open, then leaves; Cross with the phone in hand brings its screen up
- fix: saying something on a call no longer also sent it as a message

## 0.9.79 (2026-11-03)

- phone-talk.ts: replies follow what you write (tone and topic: greetings, how are you, thanks, praise, apologies, insults, firing, work, pay, time off, sickness, home, love, jokes, goodbye, call me), family or staff, and the relationship (State.phoneRel: rel, hurt); several lines with typing; call-backs
- calls: ringing, answered or not, their voice and yours, suggested lines or your own words, incoming calls with Answer and Decline, missed calls; recents show direction and length

## 0.9.78 (2026-11-03)

- 3D view: going into the cabin (Cabin, Walk, the window views) shows a Loading cabin screen (cabinLoadShow) while the cabin is built; v3dModeSet
- cabin on touch screens: the walking stick in the Cabin view as well (cabinTouchPad); pushing it gets you up and walking; shown on PCs with a touch screen too

## 0.9.77 (2026-11-03)

- figures: wrist turn (uWr), finger curl at knuckles and middle joints (uC1/uC2), thumb turn (uTh); hand basis from the mesh (joints F/N/T); humanHandAim; humanReach/humanHandAt can reach with the wrist
- phone: phoneGrip (desk grip from above, hold with the fingers round the left edge and the thumb on the glass), frames blended as turns
- Game Booster: memory chart in GB, used of total

## 0.9.76 (2026-11-03)

- phone-apps.ts: dock (Messages, Phone, Store) centred at the bottom of the phone home screen; Messages with threads, typing and replies (State.phoneMsgs) and notifications; Phone with favourites, recents, contacts, keypad and a call screen (calls not connected yet); Store
- icons: phone, chat, store

## 0.9.75 (2026-11-03)

- phone home screen: icons centred in a fixed 4-column grid, labels on two lines
- phoneNote: notification banners on the phone in use, from mailAdd and from new notices (alertsTick); tap opens the mail or the notice, swipe up dismisses

## 0.9.74 (2026-11-03)

- phone (phone3d.ts, shared by the office and Operations): model with lock screen and glass, pick-up with the right hand (selfPose arms), screen brought up in its frame (FLIP from the held phone), laptop OS in phone mode (lapMount(root, true)), glare; mail one column at a time on the phone

## 0.9.73 (2026-11-03)

- faceSculpt: nose and mouth widths fitted to the face photograph's proportions (head space moves with them, so the projection stays put)
- softer relief glints

## 0.9.72 (2026-11-03)

- faces: photographic face textures (assets/faces) mapped by per-head landmarks (eyes, nose, mouth, chin, ears) and tinted to the skin; ear photograph mapped onto the ear; finer pore layer close up; skin detail on hands and arms
- skin: relief, cavities and oil from the photograph, warm wrap past the terminator, light through the ears from behind

## 0.9.71 (2026-11-03)

- figure system: ankles (uAnkL/R about the foot joints) and a spine (uSpine about the waist) in the body shader; shoes, headPivot and a chest group follow
- humanWalk: gait cycle (hip, two-bump knee, ankle push-off and toe lift, pelvis turn and roll, shoulder counter-turn, arm swing with elbow, steady head), per-person seed and speed; humanSitMove for sitting down and standing up; cabinLerpG blends the new fields

## 0.9.70 (2026-11-03)

- mouths: visemes (HUMAN_VIS, humanViseme, humanSounds) with lips pressed, lower lip tucked and upper lip lifted in the face shader (uPress, uLipLow, uLipUp); natural voice drives them from its phonemes per sentence (Voice.track) with loudness from an analyser (Voice.level)
- docs: custom-models-and-animation (PDF)

## 0.9.69 (2026-11-03)

- Perf (graphics/perf.ts): dynamic resolution and a 30 fps cap from Android thermal status and battery saver (AppTools.boostStats powerSave), in the 3D view, office, Operations and court; setting in Graphics
- FrameGen: depth reprojection of the last drawn frame for the in-between frames (rooms when capped, the 3D view at its 30 fps outside the cabin), logarithmic depth handled, background not tone-mapped
- roomBoxDrag: the conversation window in office and court can be dragged, position kept per room
- police buttons: red and blue light-bar animation

## 0.9.68 (2026-11-02)

- Android: laptop browser added to the activity's content frame (the web view's parent is a CoordinatorLayout), placed with the web view's offset
- faces: a second, older humanTalk overrode the voice-led one and fed NaN to the jaw (heads partly missing, mouths still); removed, and pose ignores non-finite mouth values
- office: the visitor answers your decision, waits for "you are dismissed", may reply, then leaves
- court: stand-in per court day (refund when cancelled); the bar's gate opens and shuts with a spring swing, latch and hinge sound, blocks the way when shut
- bank: per sub-account history, totals and filters; flip-text spans keep their line

## 0.9.67 (2026-11-02)

- includes 0.9.66 (its build stopped on the phone browser plugin; fixed)
- you in first person: your figure (selfBody/selfPose in human.ts, head folded away) in the office and Operations, seated and walking; humanReach arm solver
- office: pick up the family photo (reach, lift in both hands, tilt by drag or arrows, put back)
- footsteps by surface (Sound.step/steps): office rug and parquet, courtroom boards/marble/carpet, Operations carpet, cabin aisle and galley
- device voices: the device's male and female voices in pitch/pace variations, one per person (by name), list to try in Settings; Android VoicePlugin.deviceVoices and voice choice
- laptop bank sign-in page

## 0.9.66 (2026-11-02)

- PC: Electron 44.9.0 host (own Chromium), Edge profile storage copied once, single instance, tray while a phone is linked, tools exe for uninstall/check/replay, link code in Settings; laptop browser via webview
- laptop (office): zoom from the laptop screen, desktop and bar, Mail (court, reports, lease requests, family), Calendar, Bank with sub-accounts, Screenshots (3D camera button, P), Ranking, Career, Markets, Aircraft market, browser (Electron webview, Android LapBrowser plugin); roomGo for in-room links
- investigations: preliminary report timing, reminders, sign or contest, causal chain from state, witnesses, accident court case (hear1, prelim, hear2, verdict) waiting for you
- office talks: greeting voiced, your lines in your own voice (40 voices, pack 2), humanTalk mouths, minimise/reopen, conditions answer and rating
- ops: walking, chair, door to Overview; 3D view suspends rooms; live map not patched away
- floatplane wheels; food market tab; parts stock drives repair cost and time; pop-ups placed with the interface zoom

## 0.9.65 (2026-11-02)

- PC Setup (own installer window: drive and folder, desktop shortcut replaced, Start menu, Apps entry, progress; uninstall removes everything incl. the folder), app icon on the programs
- free mode: pointer lock, glow on usable objects, endless turning, hide/show controls; touchpad look in 3D and rooms; D-pad on sliders and lists
- 3D: parked cameras after a flight ends, 360° look, approach lights everywhere, smooth final (no hill clearance near airports), simulator request ids shared, layouts checked (APT-01, APT-02), late layouts drawn; flight card minimise
- cabin: bins flush with the ceiling, seated passengers on the cushion; premium imagery demo

## 0.9.64 (2026-11-02)

- ops3d: monitor moved forward and desk folders moved clear of it; the screens grow out of the monitor's outline with a camera glide in (and back out on closing), flash on the monitor; tab fade; reduce motion respected

## 0.9.63 (2026-11-02)

- ops3d: Operations office (curved monitor drawn from scheduleBlocks, keyboard, mouse, chair, archive stack and rack), screens over the room (ops, schedule, dispatch, planner) kept up to date from refresh; own loader
- exit-splash: loading screen on leaving the office, Operations, the court and the 3D view (minimum 6 s); save first; renderer, scene and cabin window target freed; placeBack for the Android back button and the gamepad
- human: jaw on its hinge, lip rounding and spreading, mouth inside (teeth, tongue) from humanSpeech; animation levels for walking, speaking and body language (Settings)

## 0.9.62 (2026-11-02)

- cabin windows: the outside drawn into a small render target from the same eye (cabin hidden, wings and clouds shown) and shown in each window; shades removed
- cabin crew: hand-over of a cup or meal tray to the passenger answered, then 9 s at the row
- office: schedule overlay (ofScreenOpen, kept up to date from refresh), dialogue close button and placement above the places row, family photo added to the room again, visitor waits 3 s and walks a planned route (grid search round the door leaf, walls and furniture), detailed laptop

## 0.9.61 (2026-11-02)

- pc-bridge airways: waypoint airways from SimConnect facility data (WAYPOINT/ROUTE), A* between SID exits and STAR entries (high or low), network and routes kept in the data folder; procedure legs carry their region; 'awy' link message
- app: AirwayRoutes per city pair and class, kept on the device; flightPathFor/flightProfile fly them; planner fill from airways; setting to switch off
- planner in the office menu (overlay); SimBrief plan import (planFromOfp) in the planner and Dispatch, behind the SimBrief switch

## 0.9.60 (2026-11-02)

- flightplan + planner: plans per city pair (waypoints with level and speed, climb/descent speeds, alternate); flightPathFor routes through the waypoints, flightProfile flies their levels (step climbs/descents) and speeds with winds along the path; route view on the world map (overlay, tap and drag hooks), vertical profile, SIGMETs along the route, METAR/TAF, winds, FAA NOTAM API with the user's key (relayed by the PC app)
- procedures: fly-by arcs at realistic radii (about 7 nm at cruise), drawn every 2.5°
- gamepad: standard and DualSense controllers (pointer, click and drag, back, pages, scroll and zoom, 3D, walking, office, court), WebHID touchpad on the PC, rumble; Settings → Controller

## 0.9.59 (2026-11-02)

- court-staff: cases you bring from serious conduct reports (offence kept on the case), two hearing days with you as witness and questioner (courtStaffAsk), statement and damages, verdict scene; court3d cast and witness-box swap for the defendant, own-question flow, reaction chains
- office3d: conduct reports list with invite and report-to-police; "Report to the police" decision after the interview
- cabin: centre bins for twin-aisle cabins; placards on the side or centre bin edges; view3d: one-line flight bar inside the aircraft

## 0.9.58 (2026-11-02)

- cabin: seat level of detail (detailed parts in slots near the camera, light parts for all, dithered crossfade via aFade); seam/edge refinement scales with quality; arm and pad lighter below Ultra
- cabin: supersampling automatic only on PC (and Ultra); frame guard lowers the pixel ratio while the frame rate is low; low-memory devices default to Medium
- v3d-cabinpax: detailed passenger count and detail from settings (fewer on phones), built only while the camera is still, crossfaded with the simple figures
- mood light shader skips lines that face away or are out of reach
- human: lighter figures (q < 0.6) get fewer, shorter-jointed hair strands; cabin crew detail follows the cabin quality (full at Ultra); PC automatic settings generous, phones lighter
- settings: Graphics → Cabin part by part (detailed seats, sharpness, frame guard, mood lighting, passengers, detailed passengers and their detail)

## 0.9.57 (2026-11-02)

- cabin: mood lights as analytic line lights in the cabin material (side wall wash, ceiling coves in pools, bin doors), day/night strength, white lines dimmed at night; up-facing depth shading
- v3d-seat: detailed seats (padded, seamed cushions with bolsters, two-tone winged headrests, grab handle, moulded armrests with pads) with generated upholstery and normal textures; shared armrests
- cabin quality renamed Low / Medium / Very high (default) / Ultra; supersampling at the top two levels
- v3d-cabinpax: nearest passengers drawn with Human.build from the passenger list's look; seated pose rests the hands in the lap; manifest faces use the same figures
- booster: live charts (PC from the PC app, phone from AppTools.boostStats); PC closes picked programs and keeps them closed while the app is open (pc-bridge booster.ts); Android 13 and older closes background apps every 30 s

## 0.9.56 (2026-11-01)

- v3d-cabinpax: boarding and deboarding (poses for standing, walking, sitting down and rising; aisle and galley queues; aisle-first and window-first orders; door fades; real-world rates); passenger figures get lower legs and a per-person fade (alpha hash)
- cabin: placards under the bins after the real design; seat-back panel; dark headrests with the airline's colour; blue mood strips and wash; ceiling light lines; shades (none over the wing); aft wall with curtain and exit sign; seat view drag no longer inverted
- turnaround: real-world deboarding and boarding times from the number of passengers
- lights: taxi light as strong as the landing lights; taxi and landing lights off when standing still and at the gate
- pc-bridge: windows found by the app's browser profile and closed gently, then for sure; the update ends other copies before starting the new one; stray windows closed at start

## 0.9.55 (2026-11-01)

- view3d: the previous airport's clean-up skips multi-material meshes (the facade materials are shared), so the rebuild with the full layout completes; each building built in its own try

## 0.9.54 (2026-11-01)

- office3d: the seat-now fallback fires only when the visitor makes no progress for 4 s (instead of after 9 s)

## 0.9.53 (2026-11-01)

- office3d: interview state reset on every open (started, rescued, talk, door); visitor seated by a 9 s fallback; per-frame visitor errors caught, logged and the visitor seated; the interview runs without a figure

## 0.9.52 (2026-11-01)

- pc-bridge: on EADDRINUSE ask /info; same or newer version opens its window and exits; older is asked to quit (/api/quit) or ended by PID from netstat; retry the port
- office3d: family photo children scaled by a parent group, kid looks; photo spot aimed at it; dialogue at the side; laptop, notepad and lamp placed again
- career: places card (office, courtroom)

## 0.9.51 (2026-11-01)

- office3d: drawn-texture office, family photo rendered once and kept, visit spots and free walk (chair and door by raycast), interview with attitudes and an answer library, body language, decisions through discipline/dismiss-inc; Settings officeAutoVoice
- court3d: empty courtroom any time (walk, spots); loading screen (scales, progress) for the courtroom and the office
- menu: Office and Court; Overview places card; Crew → Court tab with every case
- conduct-detail: said/did, reported by, witnesses, their side; alerts.ts: phone and Windows notifications, received time on every message

## 0.9.50 (2026-11-01)

- court-hearing: airline cases with hearings (hear1-3, hearA), questions from the records, lawyer suggestions and objections, stand-in, absences, reminders, press, aftermath (audit, watch, premium), memorial; Settings courtOn
- court3d: drawn-texture courtroom, judges, clerk, counsel, witnesses, relatives, public, press, police; sway from the hips, gaze at the speaker; Esc asks for a stand-in
- crash report: crashAssess (level, parts, injured, dead, repair or loss), See the damage, level-based costs, news for fatal or destroyed
- PC: --vh/--vw follow the root zoom; anchored menus kept inside the window; narrower windows
- 3D: water mask only on flat water-level ground, floodlight pools 270 m, building facades with night windows, terrain clearance for app-flown aircraft, procedure prefetch for the network and Nordic airports

## 0.9.49 (2026-11-01)

- backup confirmRestore: backup and current side by side, older-backup warning
- voice: PC manifest via /api/voicepack?manifest=1 (pc-bridge fetches pack.json), VOICE_PACK_LIST fallback
- pc-bridge: closeWindow asks the window to close before forcing it; exit after 5 s on update
- human: 'bow' gesture; birthdayPopup bows once per birthday (birthdayBowed)

## 0.9.48 (2026-11-01)

- v3d-terrain tiles(): three retries with backoff, then the parent tile (up to four levels up) enlarged; ring imagery canvases pre-filled with a ground colour

## 0.9.47 (2026-11-01)

- PC self-update: pc-bridge updater.ts (/api/update: download the PC zip from the release, Expand-Archive, replace after exit with a cmd script, restart); Updater picks the PC zip on DESKTOP and installs through it
- v3d-walk: first-person walking mode (keys, pointer lock, touch stick, aisle and galley walkability, crew and trolley collisions, step bob)
- v3d-cabin: rows limited to the aircraft's capacity, spaced up to 12% wider to fill the cabin; aisles list in crewAt

## 0.9.46 (2026-11-01)

- core/cloudsync: online sync (encrypted parts, versions, engine lease, realtime nudges, offline choice), Settings > Sync, supabase/sync.sql and setup-all.sql; publishable key headers (supaHeaders)
- v3d-cabincrew: aircraft cabin crew (planeCabinCrew, faCrew), captain, jump seats per episode, trolley service in cruise, gesture blending, legs in the figure shader, conversations (cabinExchange), speech marks and tap card
- v3d-cabin: night dimming and reading lights, bins at 1.8 m, windows at 1.1 m, rows fitted to the manifest, passengers in front of the seat backs; manifest premium letters and economy spread
- airport-view: standHdg (main gear on the lead-in line)
- PC: display mode wording, deskAA, deskRes with render scale, fit by width on narrow screens

## 0.9.45 (2026-11-01)

- v3d-cabin: swept bin profile with smooth normals (cabinSweep), PSU with reading lights and vents, light lines, bezels, curtain, charcoal seats with Catmull-Rom outline (cabinSmooth), winged headrests, headrest covers in company colour (cabinCoverTex), closed window-seat room, eye abeam the measured wing tip
- Cabin quality setting v3dCabinQ (0-3): curve segments, shell segments, people detail, anisotropy, full pixel ratio at extreme (cabinSharp); cabins freed on leaving (cabinFree)
- Window zoom v3dWinZoom: slider (.v3d-wzoom), pinch and wheel; eye moves along the line to the wing tip, stopping 0.2 m from the window
- v3d-sound: cabinVoice (rumble, drone with beat, air rush, window-side pan), v3dCabinVol slider (0 mutes), outside engines muffled in cabin views

## 0.9.44 (2026-11-01)

- v3d-clouds: world-fixed 3D puffs (sphere impostors, world-space noise and lighting) and sheets, per-puff ids with fade in/out, rain shafts (mode 3), storm towers, lightning glow uniforms
- v3d-weather: precipitation particles (reports or sim precip), lightning scheduling, bolts, flash overlay; v3d-sound: synthesised thunder (delay d/343) and engine voices, settings v3dEngines/v3dThunder/v3dVol
- v3d-sky: SkyClock (eased offset), blended and eased weather, sunset window, sun shader, lens flare (v3dFlare), rainbow (v3dRainbow), aurora from SWPC OVATION (v3dAurora), sky env map (PMREM), mirror oblique clipping, wave spectrum without stripes, apron masts (v3dApronMasts), nose light follows gearNow
- view3d: flare/AoA pitch, main gear first lift, smoke by elapsed time, reverse thrust (userData.set reverse), turbulence motion and wing flex, clock (simTz), throttled drawing while loading, follow traffic flights, cabin modes (cabin, winL, winR)
- v3d-crash: crash sites (land/sea), map marker and notice link, emergency effects (engine fire, fire crews, tug)
- v3d-cabin: window views with family cabin styles, forward cabin with instanced seats and passengers (v3dCabinPax)
- core/failures: random failures for hired flights, runway stop holds, notices and issues; pc-bridge: ENG ON FIRE, LOCAL TIME (simTz), engine-fire damage
- core/catering: storage, loading (manual/auto/GSX), economics integration, storage card, BLS catering series in tools/market/fetch.py
- airport-view: rounded taxi corners, heading blend, layoutParkingFill; worldmap: idle throttling, cached traffic positions, taps for weather marks, any airport and traffic (trafficCard)
- settings: groups and sub-section buttons (Graphics, Realism, Staff, Sound), conductLevel slider, autoVoice, Game Booster (ui/booster.ts), fullScreen; Android: game_mode_config, appCategory game, display() plugin, sustained performance; PC: boost flags and priority
- human: shoulder/elbow joints in the body shader, humanGesture (5 begging, 10 angry), live figures up to six

## 0.9.43 (2026-11-01)

- Setting tfcRealNames: traffic shown as real airlines (REAL_AIRLINES bases, ICAO codes, realReg, fleets), REAL_SCHEMES colour schemes in 3D; league/news unchanged

## 0.9.42 (2026-10-31)

- Flight card fixed layout (fc-ph, fc-vs, three-line on-board items)
- warnOutcomePopup: full warning outcome report (notice ref wo-)
- newsCrash for AI, own (on register) and court crashes; crashArt (broken aircraft)

## 0.9.41 (2026-10-31)

- Landing lights in the wing leading edge; approach lighting (full/short, flashers, red side bars); PAPI/VASI (light kind 6, angle by viewer); dimmer cabin windows

## 0.9.40 (2026-10-31)

- Cabin and cockpit window lights; landing/taxi/turn-off/logo lights by phase (v3dPlaneLightsSet), ground light pool (SPOT_GLSL), beams in mist
- ErrorLog: repeats within a minute counted (n, last)

## 0.9.39 (2026-10-31)

- 3D: Forward camera (cockpit view of the followed aircraft); battery after the camera buttons
- Bank sign fixed (rotateX(-bank)); flap hinge axis mirrored per wing; spoilers (userData.set spoilers) after touchdown
- AirportView.timedAt: one-point paths; computePlanes errors caught per airport in the map loop

## 0.9.38 (2026-10-31)

- v3d-sky.ts: sun/moon (position, phase, size) and Hipparcos stars (data/stars.ts), sky dome and fog colour, day/night light, sim time (pc-bridge ABSOLUTE TIME → simTime)
- Living water in the ground material (waves by wind, Fresnel sky reflection, sun/moon glitter, surf), optional mirror pass
- Airport, aircraft and town lights (NASA GIBS Black Marble); night side on the 2D map; settings for each
- standsOnAprons for OSM layouts without stands; passenger list sort and search

## 0.9.37 (2026-10-31)

- data/airports-major.ts (scripts/make-major-airports.py, OurAirports): 3,886 well-known airports built in
- bushApt/airlineApt replace the 'P' prefix test; new-route grid limited to the nearest 60
- aptSize: seaplane bases (size 3) not major; ETOPS alternates only land airports
- 3D splash waits for all terrain rings, satellite rings, airport, nearby flight airports (layouts) and clouds; ground loads when no layout

## 0.9.36 (2026-10-31)

- flightProfile: airport positions from the runways when the world list isn't loaded; profiles with unknown airports aren't cached (was gc 200 kept for the session → 4.5× ground speed)
- flightPathPos: sim path longer than routeNm × 1.4 + 40 → own path

## 0.9.35 (2026-10-31)

- Clouds: v3d-clouds.ts (3D instanced billboards from METAR layers, 2D see-through layer), cloudKm/cloudDetail settings, METAR cloud layers kept (metarClouds)
- Passenger mood during flight (pax-mood.ts)
- biz-more.ts: hubs, ETOPS, curfews/slots, SAF/ETS (both); takeover, shares, rival reactions, scenarios (solo); profit sharing, radio, co-op league, live positions (co-op)

## 0.9.34 (2026-10-31)

- Back to the restore point (amp-restore-before-faa-taxiways): FAA dimensions removed, ICAO everywhere

## 0.9.33 (2026-10-31)

- layoutGenerate: FAA AC 150/5300-13B separations and taxiway widths at US airports (faaAirport/faaTaxiDims), ICAO elsewhere

## 0.9.32 (2026-10-31)

- layoutGenerate: ICAO-dimensioned taxiways, exits, apron and stands from runway data for unmapped airports (runways source, or OSM without taxiways); airport view uses it
- Newspaper Pets section
- Sim layouts: PC LayoutStore (dataDir/layouts) and layout-prefetch queue; phone LayoutDb (IndexedDB, no 30 cap) and prefetch list when linked
- flightPathFor: sim procedures with far-off points or a path much longer than the trip are replaced by the generated ones

## 0.9.31 (2026-10-31)

- 3D ground paint as batched meshes (v3dGroundPaint) instead of a canvas texture; canvas sheet kept as fallback
- Destination layout prefetched within 150 nm

## 0.9.30 (2026-10-31)

- 3D view: tyre smoke sprites from the main gear at touchdown (air to ground transition above 50 kt)

## 0.9.29 (2026-10-31)

- Ground reference point is the nose wheel (noseWheelAhead from shape gear data) in the 3D view and the 2D airport view; blended to the fuselage middle below 30 m

## 0.9.28 (2026-10-31)

- 3D airport sheet: type 3 paths end at a stand (parks index), type 9 lead-ins drawn as thin lines, no edge lines, OSM stands use their own lead-ins (same as the 2D map)

## 0.9.27 (2026-10-31)

- patchNode leaves code-drawn canvases alone (width/height and shown state were wiped on every in-place update)
- Avatar renderer: lost-context handling, restore redraw, new renderer fallback, blank pictures never cached
- ATC chips wrap

## 0.9.26 (2026-10-31)

- Search, away summary, UI memory (screen/tabs/scroll), sort/filter bars, undo, notification rules/quiet hours/grouping, swipe gestures, battery saver/text size/reduced motion, shortcuts, tour and hints, CSV/PDF export
- Android home screen widget (StatusWidget, AppTools.widget)

## 0.9.25 (2026-10-31)

- Flight replay, flight score (sim rules + procedural for AI/co-op), fuel plan/check, screenshots (IndexedDB), recency, NOTAMs (activeRunway respects closures/ILS)
- Airline league vs scheduled AI airlines, Airline of the Month/Year with badges and news, monthly report, Pilot of the Month and awards
- Co-op crew room: shared cockpit, trainer sign-off of check rides, photo contest, base transfers; PIREP minimum flight score
- Other airlines: hubs, fleets and daily schedules with delays

## 0.9.24 (2026-10-31)

- Boarding scan notice opens the decision (was routed to the crash report); settled or departed flights explained

## 0.9.23 (2026-10-31)

- Aerial photos (ortho) removed: satellite rings and the fixed 5 km airport patch as in 0.9.19; settings and credits removed
- Market data job reads EIA and BLS directly (FRED fallback), STEO row JKTCUUS_$

## 0.9.22 (2026-10-31)

- Real-world markets (EIA jet fuel spot, BLS aircraft parts PPI via FRED) from a daily workflow; EIA STEO jet fuel outlook and parts trend with notices
- Badge card reveal; My career world map; aerial photos over all rings

## 0.9.21 (2026-10-31)

- Ground lookups follow the drawn mesh triangles (levelled airport, flat sea); aircraft, sheet, runways and patch placed on it
- Faroese export: white no-data made transparent (strip-wise); patch grid 128, higher offset
- Satellite tile retry

## 0.9.20 (2026-10-31)

- Open national aerial photos (FO via ArcGIS export, NL, CH, FR, ES, AT, US, JP; FI and DK with keys), detail patch sized by height and following the camera, blank-tile detection, credits
- Sea: despike near sea level, sea map widened to water surrounded by sea; ground lookups use it

## 0.9.19 (2026-10-31)

- Fix: aircraft model setter line commented out in 3D (TypeError every frame)
- 3D airport ground as a single terrain-draped canvas (aprons, taxiways, edges, centre lines, stands, hold lines); terrain-following runway strips; rebuild when the near terrain arrives
- Android: UPDATE_PACKAGES_WITHOUT_USER_ACTION and MY_PACKAGE_REPLACED receiver (reopen or notification)
- Update window and settings patched in place during downloads

## 0.9.18 (2026-10-31)

- 3D airports: ground paint (aprons, taxiways with shoulders and round joins, centre lines, runways, hold lines) drawn over terrain; aircraft and buildings render after it
- Airport imagery patch (5 km, highest zoom that fits the device), radial edge fade
- Custom satellite tile URL template setting for airport patch

## 0.9.17 (2026-10-31)

- PC free camera: pointer-lock mouse look, WASD/Space/C/Shift, wheel speed, Esc exits to the map with Esc badge; touch controls hidden on PC

## 0.9.16 (2026-10-31)

- Map airport card: View in 3D (airport-only 3D view in free camera mode)

## 0.9.15 (2026-10-31)

- 3D free camera (stick, height buttons, speed slider, help card, keyboard), Overview on close from free camera
- Follow cameras: tilt to ground level, two-finger view slide
- Runway markings by size (ICAO Annex 14) and hold short lines in 3D
- Fix: Android closing the app in 3D at high satellite detail (device-sized textures, sequential loading, image memory released after upload); loading screen waits for imagery; crash mark, error log entry and detail step-down; context-loss handling

## 0.9.14 (2026-10-31)

- Fix: start from scratch reset jobs, bank, ACARS, cases, landing records and co-op to empty objects; jobsState fills defaults, Store.repair() fixes affected saves, wipe now deletes those records

## 0.9.13 (2026-10-31)

- My career screen: profile with route map and licence, pay and wallet, pilot location and jumpseat, flight board bookings, weekly pilot challenges, events, airport briefings at dispatch
- Co-op: tabs (board, chat, events, staff, rules), ranks gating aircraft classes, automatic PIREP checks, staff roles, applications, leave and inactivity rules, chat with announcements and Discord posts, codeshares

## 0.9.12 (2026-10-31)

- Lease out owned aircraft to other airlines (offers, 1–5 year terms, monthly rent, wear on return, early recall fee); new 'leased' status
- Close routes (with confirmation, cancelled pending legs, popularity and newspaper story)

## 0.9.11 (2026-10-31)

- Other airlines' traffic: fixed fleet of 140 aircraft on deterministic shuttles between scheduled airports; 2D map (decluttered labels) and 3D (frustum-culled); on/off switch; own airline only
- Difficulty levels (cruise/easy/normal/hard/extreme): aircraft prices, sale prices, leg income and costs, loan rates, starting money, market volatility; per world
- Jet fuel and spare parts markets with event-driven moves, warnings, history and newspaper stories; fuel and parts stock used on booked legs

## 0.9.10 (2026-10-31)

- Co-op mode as a separate world (own save; device settings shared); co-op setup, mode chip, switch back
- Co-op player connections (joined/connecting/connected/failed/left) with error-log entries for app-side failures
- Co-op job requests to real players with accept/decline; AI and co-op pilots in the air take jobs after landing
- Per-player filters in logbook and finance; real players in crew and rankings (co-op only)
- Newspaper section, many new story types, Settings → News (popup / inbox animated / inbox plain)
- Warning outcomes (learn / ignore / push back), final warnings, repeat-warning passenger and press effects, mechanic error risk
- In-place screen updates (no flashing) with split-flap text changes; scrolling left menu
- Diverted status chips; fleet spotlight after purchase; confirmation before buying, leasing and selling
- Thank-you replies, tappable status badges, flat sea, satellite quality, passenger cards and clothes, loadsheet trim and live weight, fuel dump holds, walking passengers, ban lengths, pet visits
- Fix: map flight card crash for flights without a position

## 0.9.9 (2026-10-31)

- Hold short at a holding point 50 m before the runway edge; line up when cleared
- 3D: velocity-predicted motion for flights updated about once a second (your own flight); profile-based fallback path; loading screen at least 5 s
- Start-up screen on every start (5 s minimum, longer for downloads)
- Active flights: in the air vs on the ground with phases; phase tags in the map list
- Passenger list jump chips (records, pets, pets left behind, celebrity)
- Avatars painted from cache appear without fading (no flicker)
- Fix: start-up crash when a live flight's airport is not loaded yet (map fit, world map, airport view, arrival time)

## 0.9.8 (2026-10-30)

- Courts: choices (lawyer, stance, suspension, plea, settlement, recommendations, appeal), jury/lay/judges by country, investigation reports, airline cases with your record, civil claims, sentence card with time served and release, second chances, whistleblowers, case types after real prosecutions
- News articles (fictional papers) for charges, verdicts, appeals and new routes, with a spin-in animation
- Ground crew required at bases (team per turnaround by size, simultaneous turnarounds, staff per based aircraft); three-day grace for existing airlines
- Engine options per type with fuel, maintenance, reliability and price effects
- Home base required (airport picker) for new airlines and companies
- 3D view: smooth per-frame height, climb, heading and bank; camera fixed to the aircraft
- Flight card passenger line shows seats and load factor

## 0.9.7 (2026-10-30)

- Voice: per-sentence time limits grow with the sentence's place in the queue; late rejections handled; no error report once speech has started
- Flight trace: AI touchdown recognised from the Landing phase and from landings between samples; NO TOUCHDOWN only when the app was watching at touchdown time

## 0.9.6 (2026-10-30)

- Real-world weather always on (METAR, TAF, international and US SIGMETs); per-type weather limits (crosswind, tailwind, minima, IFR, icing) and airport minima by size; AI waits, holds, reroutes, diverts to an alternate and continues, or cancels
- Map weather layer (toggle): flight categories, present weather, hazard areas, legend; sim weather panel when connected
- Schedule: planned vs actual, knock-on delays, cancellations retried next day, Tomorrow view
- Pay at going rates by job, level, region and airline kind; pay scales; union warnings and strikes; one-time pay rebase
- Sick days with stand-ins, contract pilots and agency cover
- Pets (cabin/hold, captain's call on temperature), pet tickets; passenger reviews (Ranking → Passengers); celebrities; medical diversions
- Fixes: passenger bans saved; Icelandic surnames match the person; celebrity notices open the flight

## 0.9.5 (2026-10-30)

- First-start choice: keep the demo or wipe and found your own airline; start over in Settings
- Crew screen (pilots, cabin crew, mechanics, ground staff with jobs, hiring)
- Staff levels 1–500 with career experience and negative levels; warnings cost XP; ground crew earn XP on turnarounds
- Staff mood (seven areas), requests, quitting; commendations; transfers between airports and airlines
- Apron crew home-base/everywhere setting with home-base limits and leave/move/dismiss handling; 60% leave pay
- Passenger services per airline (12 areas) affecting revenue, costs and demand
- Passenger manifest, bans, boarding scans, loadsheets; cargo-first offloading
- Staff rankings by group in Ranking
- 3D figures keep their turn until double-tapped

## 0.9.4 (2026-10-30)

- Runway requirements per type (field lengths at MTOW/MLW, minimum width, rough strips) checked against real runways; weight and elevation scaling; payload-limited flights; routes, jobs and hired pilots follow them
- Passenger capacity per type (typical/all-economy/maximum) on market, used, lease and aircraft details
- Catch-up messages carry the time of their event; notifications sorted by it
- Employee warnings open with date, severity, the report and a voice

## 0.9.3 (2026-10-30)

- 3D terrain in rings of detail (z12 near, then z10/z8/z7… out to the view distance), earth curvature
- Water from the OpenStreetMap water and waterway layers (rendered off screen by the map engine) for exact coastlines, lakes and rivers; sea at sea level
- Satellite imagery option (EOX Sentinel-2 cloudless 2016) in the 3D view and Settings
- Settings → 3D view: view distance slider 20–800 km with performance notes
- 3D loading screen in the style of the start-up screen; the view grows from the overview's small map

## 0.9.2 (2026-10-30)

- Notifications show their age ("Now", "5 min ago", "Yesterday 14:05") and, when opened, the time they arrived; times update while shown

## 0.9.1 (2026-10-30)

- Voices start at once: lines on screen, open reports and unread messages are synthesised in the background; spoken lines are kept on the device (IndexedDB, newest 300 sentences); a tapped line jumps the queue; a short first piece
- One voice per message (no switch to the device voice once the natural voice has started)
- Playback always ends when the last sentence has played

## 0.9.0 (2026-10-30)

- 3D view from the map controls: the followed aircraft over real terrain heights (Terrain Tiles on AWS) painted like the world map, the airport layout and every aircraft nearby; follows the aircraft, drag to look around, pinch/scroll to zoom; Behind, Around and Tower views; tap an aircraft for its details; flaps and gear move by phase (yours from the simulator)
- Aircraft models built from each type's published dimensions (src/data/aircraft-shapes.ts); the aircraft pictures are rendered from them in the airline's livery
- Livery designer: design, colours of body, underside, tail and engines, titles, emblem
- Fly-by arcs at every corner of the route; flights land on the runway their approach was planned for
- Your demo flight flies its real profile on the real clock (no more 15-minute crossings)
- Follow keeps its zoom and stays on until tapped again, also across screens
- "Arrives in" from take-off to touchdown, negative when late, 0:00 on the ground; heading, vertical and ground speed on the flight card; flight details can be dragged
- Live turnaround and on-board numbers for hired pilots' flights (deboarding, cleaning, catering, refuelling, boarding with the booked load, fuel burn in flight)
- One stand per aircraft from taxi-in to push-back, never shared; arriving aircraft stay at their stand
- Repairs start when the aircraft lands and the pilot waits for the hangar; a report is paid once; quoted repair time is the real one
- Voices for every staff message (pilots, operations, finance, authority, lawyer); live mute note with "Turn sounds on"; device voice if the natural voice stalls
- Flight trace log of every flight (marks jumps, overspeed, off-runway or wrong-runway touchdowns, arrivals without touchdown), saved with the error log as one text file
- Flap, gear and phase-speed data per type (docs/reference/flap-gear-and-phase-speeds.txt, src/data/flight-configs.ts)

## 0.8.3 (2026-10-30)

- PC app: sim check ("Check Flight Simulator.cmd" or --check) reads everything the app uses from the running simulator and the loaded aircraft, and saves a report in Documents\Airline Manager Pro\Diagnostics
- PC app: every flight is recorded as the simulator sent it (Documents\Airline Manager Pro\Recordings, newest 30 kept); play one back to the phone with "Play back a flight.cmd" or --replay
- PC app: variables a simulator or aircraft refuses are named in the log
- PC app: add-on aircraft in the MSFS 2024 Community2024 folder are found too
- Tests play recorded flights back through the flight tracker

## 0.8.2 (2026-10-30)

- Voice pack downloads on the start-up screen with its progress on the same bar
- Voices match each person's sex; moods (angry, apologetic, drunk) by pace, pitch, wobble, pauses and slurring
- The drunk passenger speaks after the gate agent; dialogues speak in turn
- Settings: only the voices (all other sounds off), and voices in dialogues on or off

## 0.8.1 (2026-10-30)

- Working voices for the mechanic, gate agent and head of operations: natural neural voices (Kokoro-82M, Apache 2.0) run on the device, natively on Android and in the PC app window; downloaded once as a voice pack; device voice until then

## 0.8.0 (2026-10-30)

- Sell aircraft; used-aircraft market; cabin layouts and freighter conversions; owner-only aircraft trading
- Your own fares per class; demand by season, price, popularity, marketing and competing airlines
- Fuel prices per airport and tankering; landing, parking and gate fees; monthly hangar rent; belly and freighter cargo
- Loans, fleet insurance, marketing campaigns
- Job board (charters and cargo), tours, weekly challenge
- Type ratings with courses and check rides; landing leaderboard
- Dispatch: SimBrief planner link, .PLN flight plans to the simulator, live METAR/TAF, Discord, public airline page
- Built but switched off until the providers give permission for a paid app (app.config.json → services): SimBrief flight plan import, VATSIM, IVAO, Hoppie ACARS
- Co-op flight report (PIREP) review
- PC app: installed aircraft scan, flight plan saving, relay for the online services

## 0.7.7 (2026-10-30)

- Slightly wider side menu so every label fits; 100% availability fits inside its ring

## 0.7.6 (2026-10-29)

- Much faster zoomed in on airports: route lines clipped to the screen, indexed airport and background lookups, map canvas at up to 2x resolution

## 0.7.5 (2026-10-29)

- Delays only for hired (AI) pilots, never for co-op players or your own flights

## 0.7.4 (2026-10-29)

- Rare delays (about 2-3 in 100 flights) at the gate, the holding point, in a holding pattern or as a go-around, with real reasons, more likely in wind and winter; shown on the map, at the airport, in arrival times and notifications

## 0.7.3 (2026-10-29)

- Take-off and landing speeds and weights per aircraft type (docs/reference), by weight and wind; take-off and landing rolls from them
- Taxi speeds by situation (5-30 kt), pushback, waiting at the gate until it is time to taxi; speeds shown on labels
- Map panels and buttons always in front of the airport drawing

## 0.7.2 (2026-10-29)

- Published SIDs, STARs and approaches read from the simulator by the PC app, kept on the phone, chosen by runway in use and direction; generated ones where there are none

## 0.7.1 (2026-10-29)

- Departures, arrivals and ILS/RNP approaches: one path per flight from runway to runway, runway in use by wind, shown and named on the map
- Followed aircraft stay in view at every zoom (one position for map and airport)
- Airport layouts prepared once and drawn in one go: much faster zoomed in

## 0.7.0 (2026-10-29)

- World map zooms down to airport level: dots give way to coastlines, water, borders and roads (OpenFreeMap vector tiles), airport layouts drawn in place with aircraft taxiing, taking off and landing; airport buttons fly the map there and keep following the aircraft; satellite too
- Bases and stands: aircraft per base limited to the airport's stands, choose bases, no take-off or passengers without a stand, notifications
- Stands read from OpenStreetMap stop points with lead-in lines, drawn as stand markings with numbers
- More map servers with retry, clear messages and Try again; simulator layouts kept on the device
- Battery indicator (level, charging, wireless charging); wider flight menu bubble

## 0.6.0 (2026-10-29)

- Lease aircraft: 1, 3 or 6 years, monthly rent, deposit, extend, buy out or return early; Leases in Finance
- The app survives being minimised (web view shut down by Android is recovered), saves on leaving, and reopens where you left off within 12 hours
- Split screen and pop-up windows, with a narrow-window layout
- Airport view shows the real runways at once and swaps in the full layout; faster OpenStreetMap download; PC app answers at once without a simulator layout

## 0.5.9 (2026-10-29)

- Real airport layouts from OpenStreetMap in the airport view (runways, taxiways, taxilanes, aprons, terminals, numbered stands), kept on the device; split runways joined, official lengths
- Repair time setting: instant, or 5 to 90 minutes decided by the job; one payment repairs all of an aircraft's reports
- Details opens for your own flight in Live operations

## 0.5.8 (2026-10-29)

- One payment covers all of an aircraft's open reports; aircraft stuck in the hangar are released

## 0.5.7 (2026-10-29)

- Airport view: runways, taxiways and stands (from the simulator when linked, real runways otherwise), aircraft taxiing, taking off, landing and taxiing in, runway in use by wind, tracking carried over from the world map and back

## 0.5.6 (2026-10-29)

- Registration in Settings: keys tied to the first device, re-registering on the same device as often as needed, reactivation codes (one use each) for a new device; online register ready for Supabase
- About 49,000 world airports plus the simulator's full airport list; airport search by name, city, ICAO and IATA on the maps; only route airports shown; tap an airport for its card
- Flight menu on the maps: Follow, Favourite, Details; favourites listed first
- Co-op screen (first part), with sample pilots until online play is ready
- Levels for hired pilots and crew; badges only for your own flights; personal Ranking with earned badges only
- Hired pilots fly only assigned routes; same-airport legs only as test flights, which only you can create

## 0.5.5 (2026-10-29)

- Animated start-up screen (five seconds): detailed compass-star mark, loading steps and a route-line progress bar with sparks and a take-off at 100%; the app then opens on the Overview

## 0.5.4 (2026-10-29)

- What's new pop-up after every update: the three newest versions from the release notes, the newest open (can be folded away until the next update), the two before it folded; also in Settings → General

## 0.5.3 (2026-10-29)

- "I use GSX Pro": GSX ground services (boarding, deboarding, catering, fuelling, pushback, de-icing) read by the PC app and charged at real-world rates when GSX completes them; standard charges without GSX

## 0.5.2 (2026-10-29)

- The whole app on Windows, opened by the PC app in its own window (Microsoft Edge app mode), connected straight to the sim; window, borderless and full screen; scales to any screen size including ultrawide; graphics card and sound output choice; backups to Documents
- Weekly payroll, hiring fees, a hiring list that changes over time, conduct reports switch
- Confirmation before changing a look or the airline; airline editor
- Correct dates on all spending

## 0.5.1 (2026-10-29)

- Ranking screen: pilot and airline ranks, pilot rating, airline popularity, 1,197 badges in six tiers
- Fly for a real-world airline (51 airlines, names and codes only)
- Real-world fares, on-board sales, bags and costs (fuel, landing, handling, navigation, maintenance by part, catering, crew, overheads); landing messages open the breakdown
- Per-model descent, approach and final distances; top-of-descent and on-final messages
- Schedule per aircraft, following hired pilots and your own sim flights
- Weather and graded turbulence from the sim (PC app)
- Aircraft condition from age, use and mechanics; four bands; emergencies and accidents; court case against the airline when maintenance is to blame
- Timed repairs (5-120 minutes) that continue while the app is closed; hangar drawing; Maintenance without red backgrounds; Aircraft types view
- Warnings with severity and learning; ratings affect conduct; rare criminal cases with police, authority and court over 2-3 days (hired crew only)
- Drunk and unruly passengers
- Natural skin colours; outfits by sex; skirt fix; look editor camera and smooth animation
- Settings saved immediately, last screen restored; backup folder, backup files and restore on a fresh install

## 0.5.0 (2026-10-29)

- Human crew figures: real body proportions, skin with pores and colour variation, strand-grown hair, shell-rendered beards with a growth map from facial landmarks, moustaches, detailed fabrics; proportions switchable (Natural, In-between, Stylised)
- New beard, moustache and glasses options, including pilot sunglasses
- Faster figure building; finished pictures saved on the device
- Hired pilots fly on the real clock, also with the app closed, with catch-up and a "While you were away" summary on opening
- Real-world flight profiles per aircraft type and route (airways, taxi, speed schedule by altitude, semicircular cruise levels, jet stream); live countdown of altitude, miles and time to the gate
- Virtual pilot speed setting (real time to 30×) and landing notifications
- Link over the phone's hotspot or USB tethering
- Balance opens Finance; sound button always visible; settings saved immediately with a backup copy in the app's files

## 0.4.0 (2026-10-28)

- Crew avatars are now 3D figures: captains, co-pilots, hired pilots, flight attendants and mechanics, lit and shaded, with every look option (face, eyes, nose, lips, skin tone, hairstyle, facial hair, glasses, garments, shoes, hats, uniform colour)
- Large figures breathe, sway, blink and look around, and can be turned with a finger; small ones are drawn once and kept
- Pilot's cap for captains (gold braid on the visor) and co-pilots; the co-pilot's male/female screen has a cap choice, and its look is kept exactly as shown
- Phones without 3D support keep the drawn avatars

## 0.3.1 (2026-10-28)

- Error log: errors pop up with the details and Copy and Share buttons, and are saved in Settings → Updates and errors
- If the app can't start, the error is shown with Copy and Share instead of a blank screen; Android crashes are reported on the next start
- Updates from inside the app: check, download and install, with Android's exact reason if it refuses the install
- PC app: log file (`%APPDATA%\Airline Manager Pro\pc-app.log`); on an error the window stays open with the details

## 0.3.0 (2026-10-28)

First version that works with Microsoft Flight Simulator.

- New **PC app** for Windows (`AirlineManagerPro-PC-0.3.0.zip`): reads your aircraft from Flight Simulator 2024 or 2020 through SimConnect, no SDK needed
- Wi-Fi link: the phone finds the PC on the same network, you pair once with a 6-digit code, and it reconnects automatically
- Connection panel shows your real Wi-Fi network, signal and phone address, scans for the PC app, and lets you enter its address by hand
- Your flight comes from the sim: real position and heading on the map, phase, altitude, remaining distance and arrival time
- Fuel on board and weights from the sim; passengers from GSX Pro when it's running, otherwise from the aircraft's payload stations
- "Your aircraft" checks the aircraft loaded in the sim against the one you're flying
- At the end of each leg: flight log entry with landing rate and G, your hours and landings, aircraft hours and cycles, ticket revenue, fuel and fees
- Damage detected by the sim (tail strike, hard landing, flap and gear overspeed, engine failure, overstress, severe turbulence) goes to the mechanic, who reports after landing
- Crashes open the register or disregard prompt
- Demo data stays until you link your PC for the first time

## 0.2.0 (2026-10-28)

- Animated full-body avatars for everyone: your captain, co-pilots, hired pilots, flight attendants and mechanics, male and female, gently swaying and blinking
- Look editor for your own pilot: name, date of birth, nationality (all countries, with flags), skin tone, face shape, eyes, nose, lips, facial hair, glasses, hairstyle and colour, uniform, shoes, neckwear and hat; avatars are always fully dressed
- Cabin crew and mechanics: hire them, change flight attendants' looks, weekly salaries paid from the company balance
- Co-pilot assigned automatically on two-pilot aircraft; you choose male or female, the look is generated
- Conduct reports: now and then staff misbehave; discipline or dismiss, with a setting for how often it happens (Settings → Staff)
- Real-world crew rules: 1 flight attendant per 50 seats on aircraft with 20+ seats, co-pilot on two-pilot aircraft, mechanics per base and fleet size; aircraft without the crew they need can't fly
- Route builder checks every leg against the aircraft's published range with fuel reserves; too-long legs can't be added
- Fuel and weights of your flight, read from Flight Simulator, with or without GSX
- Finance: tap any transaction for details, salaries for every person, payroll summary and filters
- Happy birthday greeting on your pilot's birthday, in the app and as a phone notification
- Connection panel: tap "Linked over Wi-Fi" to see your network and the PC app scan; Wi-Fi only
- Aircraft under maintenance keep the normal blue background

## 0.1.5 (2026-10-28)

- Delete a company from Settings → Profiles and companies, with a prompt that shows what will be deleted and asks you to confirm
- "Delete everything" moved from About to Profiles and companies, with a confirmation prompt
- The only remaining company can't be deleted by accident; the app suggests creating another or deleting everything instead

## 0.1.4 (2026-10-28)

- Every test build is now signed with the same key, so a new APK installs straight over the previous one
- Your airline is saved on the device (companies, fleet, pilots, routes, logbook, finances, settings) and kept through updates and restarts
- New settings added in later versions are merged in automatically, so older saves keep working
- Settings → About: "Start over" to delete the saved airline and begin again

## 0.1.3 (2026-10-28)

- Layer button on the world map, both on the Overview map and the full-screen map: choose Street map or Satellite; tap it again to return to the classic map
- Street map: OpenStreetMap with familiar light colours (blue water, green parks, yellow motorways, white roads)
- Satellite map: Sentinel-2 cloudless imagery (about 10 m detail), replacing the NASA Blue Marble layer
- Map style moved out of Settings onto the map itself
- Separate "show all flights" button with its own icon on the full-screen map

## 0.1.2 (2026-10-28)

- New payment sound that clearly sounds like money going out (register clunk, falling minor tones, low thud), louder than before
- Fines are charged when you press "Accept and pay", with the balance flashing red; contesting costs nothing
- All pay buttons for fines and repairs are red
- Audio is unlocked on the first touch and resumed when you return to the app, so no sound is skipped

## 0.1.1 (2026-10-28)

- Exit button (power icon, top right) with hold-to-exit, so the app never closes by an accidental tap; farewell animation
- Full-screen mode on Android: status and navigation bars hidden, edge swipes only show them briefly, side edges protected from the back gesture where Android allows
- Back gesture steps back through pop-ups and pages and only offers exit from the Overview
- Version number in the bottom-left corner
- Payment sound when paying repairs and fines, with its own setting
- Mute all sounds (Settings → Sound and feel), with a quick unmute button in the top bar
- World map styles: Classic (default, offline), Street dark, Street light (OpenStreetMap via OpenFreeMap) and Satellite (NASA Blue Marble)
- Pilot messages such as "on final" or "departed" open the live map on that aircraft and follow it; pop-up with a Show button when they arrive

## 0.1.0 (2026-10-28)

First preview. All screens, graphics and animations in place, running on demo data.

- Overview with widgets: fleet size, active flights, fleet availability, profit (daily, weekly, monthly, yearly)
- Fleet status for every aircraft: in flight (green), available (blue), maintenance (red)
- Live world map with great-circle routes and moving aircraft; tap a flight for details
- Fleet with an original illustration for every aircraft type, in company colours
- Aircraft market limited to aircraft installed in the simulator, incl. add-ons; buy several of the same type; purchase sound, vibration and delivery animation
- "Your aircraft": you fly one aircraft at a time, checked against the aircraft loaded in the simulator
- Pilots: your synced pilot profile, hired crew, hiring, route assignment and rules
- Routes with any number of stops, route builder
- Schedule: your day's legs and a timeline of every aircraft
- Maintenance with mechanic reports, fix now or later, grounding
- Mechanic pop-up with voice playback
- Crash register / disregard, fines for flying without clearance with ATC transcript and contest option
- Finance with real-world or simulated years
- Several companies per pilot profile, or one profile per company; divisions with shared money and reputation; animated company switching
- Notification inbox and modular settings with toggles
