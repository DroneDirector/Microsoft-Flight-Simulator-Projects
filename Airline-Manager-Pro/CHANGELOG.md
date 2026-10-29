# Changelog

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
