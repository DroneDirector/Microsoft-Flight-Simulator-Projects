# Airline Manager Pro: features

Legend: **Built** = in the app now (on demo data where it needs the simulator). **Planned** = agreed and coming in a later stage.

## Platform

| Feature | Status |
|---|---|
| Android app, landscape only (phones and tablets) | Built |
| One app name in `app.config.json`, renamed everywhere from there | Built |
| Interface written so it runs unchanged in a Windows app and the MSFS 2024 toolbar panel (next to ATC) | Built (foundation) |
| Windows version: the whole app in its own window from the PC app, connected straight to the sim; window, borderless, full screen; any screen size including ultrawide; graphics card and sound output choice | Built |
| In-sim toolbar panel | Planned |

## Linking with the simulator

| Feature | Status |
|---|---|
| PC app (Windows) that reads the simulator through SimConnect, no SDK needed | Built |
| Link over the same Wi-Fi, discovery, 6-digit pairing, auto-reconnect | Built |
| Link over mobile data: the PC joins the phone's hotspot (or USB tethering) | Built |
| Link over the internet (phone on mobile data, PC on its own connection anywhere) | Planned |
| Pairing a PC with a code | Built |
| PC app log file; errors keep the window open with the details | Built |
| Detect which aircraft is loaded in the sim and match it to the aircraft you're flying | Built |
| Detect installed aircraft (default and add-ons such as PMDG, Fenix, iniBuilds, Aerosoft) | Planned; market shows demo list |
| Passenger numbers from GSX Pro (and the sim's payload stations without GSX) | Built |

## Companies and pilots

| Feature | Status |
|---|---|
| Your own pilot profile, synced with your simulator flights | Built (demo) |
| Several companies under one pilot profile, or a separate pilot profile per company (your choice) | Built |
| Divisions inside a company with their own fleets, sharing money and reputation | Built |
| Airlines, regional/cargo and bush outfits (VFR, IFR, small props) running in parallel | Built |
| Quick animated company and division switcher | Built |
| Hire pilots, assign routes and rules (duty time, landing limit, IFR only, return to base) | Built |
| Watch hired pilots' flights live on the world map | Built |
| Hired pilots fly in the background, even with the app closed: landings, turnarounds, next legs on their route, rest after the duty limit, revenue, fuel and fees booked; "While you were away" summary on opening | Built |
| Real-world flight times per aircraft and route: airway distance, taxi times (longer at big hubs), climb, cruise and descent speeds at each altitude, cruise level by distance and direction, jet stream | Built |
| Live countdown on flight cards: phase, altitude, miles to go along the route, time to the gate | Built |
| Virtual pilot speed: real time (default), 2×, 4×, 10× or 30× | Built (setting) |
| Phone notification when a hired pilot reaches the gate, also with the app closed | Built (setting) |
| You can't fly hired pilots' aircraft | Built |
| You fly one aircraft at a time, chosen from your fleet | Built |

## Overview widgets

Each widget opens its own page.

| Widget | Status |
|---|---|
| Fleet size (aircraft owned) | Built |
| Active flights | Built |
| Fleet availability in percent | Built |
| Profit: daily, weekly, monthly, yearly (all years flown) | Built |
| Fleet status per aircraft: in flight (green), available (blue), maintenance (red) | Built |

## Fleet and market

| Feature | Status |
|---|---|
| Detailed fleet cards with an original illustration per aircraft type in company colours | Built |
| Buy aircraft from brands installed in the sim (Airbus, Boeing, Bombardier CRJ, ATR, de Havilland Canada, Cessna, Daher, Pilatus …) | Built |
| Add-on aircraft (PMDG, Fenix, iniBuilds, Aerosoft, SimWorks Studios …) | Built (demo list) |
| Buy several aircraft, including several identical ones | Built |
| Purchase sound, vibration and delivery animation | Built |

## Routes and schedule

| Feature | Status |
|---|---|
| Routes to any country, departure and destination | Built |
| Multi-stop routes (3, 4, 5 or more stops a day) | Built |
| Your day's legs and a timeline of every aircraft | Built |

## Flight logs

| Feature | Status |
|---|---|
| Flight hours, landings, landing rate and G per flight | Built (demo) |
| Crashes: choose to register or disregard | Built |

## Maintenance and damage

Only damage the simulator can actually detect.

| Feature | Status |
|---|---|
| Tail strike, hard landing, flap/gear overspeed, engine failures, overstress | Built |
| Severe turbulence damage (extreme only, realistic results: inspection, overstress, cabin damage) | Built |
| Mechanic reports in the inbox and an animated mechanic pop-up | Built |
| Fix now or fix later; serious damage grounds the aircraft | Built |
| Mechanic voice, fully offline: recorded lines plus an optional neural voice pack | Planned; device voice used as stand-in |

## ATC

| Feature | Status |
|---|---|
| Built-in ATC (default) or BeyondATC, chosen in Settings | Built (setting) |
| Clearance tracking from the built-in ATC data | Planned |
| BeyondATC clearance tracking by listening to its audio, transcribed offline on the PC | Planned |
| Fines for taking off, landing or taxiing without clearance, with transcript and contest option | Built (demo) |
| ATC transcripts saved to the logbook | Planned |

## Finance

| Feature | Status |
|---|---|
| Balance, revenue, costs and profit per day, week, month and year | Built (demo) |
| Tap the balance in the top bar to open Finance | Built |
| Real-world fares (distance, domestic or international, aircraft type, cabin mix), on-board sales, bags, cargo | Built |
| Real-world costs per leg: fuel, landing, handling, navigation, maintenance by part, sales fees, catering, crew hotels, overheads | Built |
| Landing messages open the flight's income and expenses | Built |
| GSX Pro ground services charged at real-world rates as GSX completes them (setting); standard charges without GSX | Built |
| Real-world years or simulated years at a chosen speed | Built (setting) |
| Transactions list | Built |

## Interface

| Feature | Status |
|---|---|
| Main navigation: Overview, Fleet, Routes, Schedule, Maintenance, Finance, Flight logs, Pilots, Settings | Built |
| Notification bell with unread count and grouped inbox | Built |
| Modular settings with toggles, easy to extend | Built |
| Animated screens, pop-ups and transitions; reduce-motion option | Built |
| Hold-to-exit power button with farewell animation | Built |
| Ranking screen: pilot and airline ranks, pilot rating, airline popularity, 1,197 badges in six tiers | Built |
| Fly for a real-world airline (names and codes only, no logos) | Built |
| Backup folder outside the app, backup files, restore on a fresh install | Built (Android) |
| Full-screen mode, edge-swipe protection, back gesture never quits by accident | Built (Android) |
| Version number in the bottom-left corner | Built |
| What's new after every update: the newest version's changes open, the two before it folded; again from Settings → General | Built |
| Airline saved on the device and kept through updates; new versions install over the old one | Built |
| Settings saved the moment they change; a second copy of the airline kept in the app's own files and restored if the web storage is cleared | Built |
| Delete a company or everything, from Profiles and companies, with a confirmation prompt | Built |
| Purchase and payment sounds; mute all sounds; the sound button always stays in the top bar | Built |
| Error log: pop-up with the error, Copy and Share; saved list in Settings; start-up failures and Android crashes reported | Built |
| Updates from inside the app, with Android's exact reason when an install is refused | Built |
| World map layers from the layer button on the map: Classic (default, offline), Street (OpenStreetMap, light colours), Satellite (Sentinel-2 cloudless); tap again for Classic | Built |
| Pilot messages open the map on that aircraft and follow it | Built |
| Google Maps style (needs your own Google Cloud billing account and API key) | Possible, not planned |
| Bing Maps | Not possible: free Bing Maps accounts were shut down in June 2025 |

## Crew

| Feature | Status |
|---|---|
| 3D full-body avatars (breathing, sway, blinking, look-around, turn with a finger) for all pilots, co-pilots, flight attendants and mechanics, male and female; drawn avatars where 3D isn't available | Built |
| Human figures with real body proportions, skin with pores and colour variation, hair grown strand by strand, beards and moustaches, detailed fabrics | Built |
| Crew figure proportions: Natural, In-between or Stylised | Built (setting) |
| Beards (stubble, short, full, goatee, Van Dyke) and moustaches (pencil, chevron, walrus, handlebar, horseshoe); pilot sunglasses | Built |
| Finished crew pictures saved on the device, so they appear at once next time | Built |
| Pilot's cap for captain (gold braid) and co-pilot | Built |
| Create your pilot: name, date of birth, nationality with flag, skin tone, face, eyes, nose, lips, facial hair, glasses, hair, uniform | Built |
| Avatars always fully dressed; clothing only swaps complete garments | Built |
| Hire flight attendants and mechanics, change flight attendants' looks | Built |
| Co-pilot on two-pilot aircraft: choose male or female, look generated | Built |
| Weekly salaries for all staff, paid from the company balance, shown in Finance | Built (demo payroll) |
| Conduct reports: discipline or dismiss; adjustable frequency | Built |
| Warnings recorded as light, moderate or severe; most staff improve after a warning; ratings lower the chance of misconduct | Built |
| Rare criminal cases for hired crew and passengers: police, aviation authority, court over 2-3 real days, verdict and sentence | Built |
| Drunk passengers at the gate on your flights: deny or allow boarding, with consequences | Built |
| Real-world crew rules (attendants per seats, co-pilot, mechanics per base and fleet) block flights | Built |
| Birthday greeting in the app and as a phone notification | Built |

## Flight data

| Feature | Status |
|---|---|
| Route legs limited by the aircraft's published range with fuel reserves | Built |
| Fuel on board and weights (empty, passengers, bags, cargo, mail, fuel, total vs. MTOW) from Flight Simulator | Built |
| GSX detection; fallback to the sim's own payload data | Built |
| Load data from PMDG / Fenix / iniBuilds own interfaces where needed | Planned |
| Connection panel: Wi-Fi network, phone hotspot, PC app scan, manual address | Built |
| Finance transaction details and salary list | Built |

## Your flights from the simulator

| Feature | Status |
|---|---|
| Live position, heading, phase, altitude, remaining distance and arrival time on the map and flight card | Built |
| Leg logged at blocks on: landing rate, G, block time, passengers, hours, landings, aircraft hours and cycles | Built |
| Ticket revenue, fuel and fees booked per leg | Built |
| Mechanic reports damage found on the leg after landing | Built |
| Installed aircraft list from the sim (MSFS 2024 aircraft and livery list) | Planned |
| Built-in ATC clearance tracking | Planned (the sim doesn't expose clearances directly) |
