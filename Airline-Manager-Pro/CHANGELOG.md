# Changelog

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
