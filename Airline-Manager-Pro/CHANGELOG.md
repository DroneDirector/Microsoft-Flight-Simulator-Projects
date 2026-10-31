# Changelog

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
