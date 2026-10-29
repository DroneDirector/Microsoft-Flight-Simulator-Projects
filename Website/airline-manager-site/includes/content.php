<?php
/** All the website's starting text and pictures. Everything here can be changed later in Elementor. */
if (!defined('ABSPATH')) exit;

function ams_img($file) { return ['url' => AMS_URL . 'assets/img/' . $file, 'id' => '']; }

function ams_content() {
    return [
        'hero' => [
            'eyebrow' => 'For Microsoft Flight Simulator 2024 · Android & Windows',
            'title'   => 'Run the airline.<br><em>Fly every leg.</em>',
            'text'    => 'Airline Manager Pro turns your flights in Microsoft Flight Simulator 2024 into a living airline: real fares and costs, hired pilots flying in real time, crews with careers, aircraft that age, and a world map that never stops moving.',
            'chips'   => "Live from the sim\nReal-world times\nReal-world money\nAndroid + Windows",
            'film'    => 'Take the tour',
            // The carousel: left, middle (shown first) and right, then one screen for every other part of the app.
            'shot_a'  => ['image' => ams_img('shot-ops.jpg'), 'caption' => 'Overview · your airline at a glance'],
            'shot_b'  => ['image' => ams_img('shot-map.jpg'), 'caption' => 'Flight map · every aircraft in the air'],
            'shot_c'  => ['image' => ams_img('shot-fleet.jpg'), 'caption' => 'Fleet · condition and status'],
            'more'    => [
                ['image' => ams_img('shot-fleettypes.jpg'), 'caption' => 'Fleet · aircraft types'],
                ['image' => ams_img('shot-market.jpg'), 'caption' => 'Buy aircraft · default and add-on aircraft'],
                ['image' => ams_img('shot-routes.jpg'), 'caption' => 'Routes · demand and fares'],
                ['image' => ams_img('shot-schedule.jpg'), 'caption' => 'Schedule · every aircraft\'s day'],
                ['image' => ams_img('shot-maint.jpg'), 'caption' => 'Maintenance · reports and condition'],
                ['image' => ams_img('shot-finance.jpg'), 'caption' => 'Finance · revenue and costs'],
                ['image' => ams_img('shot-money.jpg'), 'caption' => 'Finance · one flight\'s income and expenses'],
                ['image' => ams_img('shot-logbook.jpg'), 'caption' => 'Flight logs · every landing'],
                ['image' => ams_img('shot-pilots.jpg'), 'caption' => 'Pilots · your pilot and your captains'],
                ['image' => ams_img('shot-cabin.jpg'), 'caption' => 'Pilots · cabin crew'],
                ['image' => ams_img('shot-hire.jpg'), 'caption' => 'Pilots · hire staff'],
                ['image' => ams_img('shot-look.jpg'), 'caption' => 'Create your pilot'],
                ['image' => ams_img('shot-ranking.jpg'), 'caption' => 'Ranking · badges and popularity'],
                ['image' => ams_img('shot-inbox.jpg'), 'caption' => 'Notifications'],
                ['image' => ams_img('shot-settings.jpg'), 'caption' => 'Settings'],
            ],
        ],
        'stats' => [
            ['num' => '1,197', 'label' => 'badges to earn'],
            ['num' => '51', 'label' => 'real airlines to fly for'],
            ['num' => '24/7', 'label' => 'your airline keeps flying'],
            ['num' => '2', 'label' => 'platforms: Android and Windows'],
        ],
        'link' => [
            'eyebrow' => 'How it connects',
            'title'   => 'From the cockpit to your airline, <em>live</em>',
            'text'    => 'The free PC app reads Flight Simulator directly, with no add-ons or SDK to install. Use the whole app on Windows, or keep it on your phone or tablet beside you: the link runs over your Wi-Fi or your phone\'s hotspot, pairs with a six-digit code and reconnects by itself.',
            'nodes'   => [
                ['title' => 'Microsoft Flight Simulator 2024', 'text' => 'Position, speed, fuel, weights, weather, turbulence, landing rate, GSX services.'],
                ['title' => 'PC app', 'text' => 'Reads the sim on your PC and opens the full app in its own window.'],
                ['title' => 'Phone or tablet', 'text' => 'The same airline over Wi-Fi or hotspot: map, fleet, crews and money at a glance.'],
            ],
        ],
        'show' => [
            'ops' => [
                'anchor'  => 'operations',
                'eyebrow' => 'Live operations',
                'title'   => 'Your whole airline on <em>one living map</em>',
                'text'    => 'Every aircraft in the air, its route, phase, altitude and time to the gate. Your own flight comes straight from the sim.',
                'points'  => [
                    ['title' => 'Real-world flight times', 'text' => 'Airway distance, taxi times at big hubs, climb, cruise and descent speeds for each aircraft type, cruise levels and the jet stream.'],
                    ['title' => 'Live flight cards', 'text' => 'Phase, altitude, miles to go along the route and a countdown to the gate, with top-of-descent and final-approach messages.'],
                    ['title' => 'Weather from the sim', 'text' => 'Wind, temperature and turbulence come from Flight Simulator, and severe turbulence can damage the aircraft.'],
                ],
                'shot'    => ams_img('shot-ops.jpg'),
                'flip'    => '',
            ],
            'pilots' => [
                'anchor'  => 'pilots',
                'eyebrow' => 'Hired pilots',
                'title'   => 'Your airline flies <em>while you sleep</em>',
                'text'    => 'Hire captains and give them routes. They fly on the real clock, even with the app closed, and the schedule shows every aircraft\'s day.',
                'points'  => [
                    ['title' => 'Real time, or faster', 'text' => 'Real time by default, or 2×, 4×, 10× or 30× when you want the airline to move faster.'],
                    ['title' => 'Duty rules', 'text' => 'Duty time, landing limits, IFR only and return to base, with rest after the duty limit.'],
                    ['title' => '“While you were away”', 'text' => 'Landings, turnarounds, revenue and fuel are all booked while you\'re gone, with a notification when a pilot reaches the gate.'],
                ],
                'shot'    => ams_img('shot-schedule.jpg'),
                'flip'    => 'yes',
            ],
            'money' => [
                'anchor'  => 'economy',
                'eyebrow' => 'Real-world economy',
                'title'   => 'Every leg <em>pays its way</em>, or doesn\'t',
                'text'    => 'Fares and costs follow real-world airline numbers. Tap a landing message to see exactly where the money came from and where it went.',
                'points'  => [
                    ['title' => 'Real fares', 'text' => 'Distance, domestic or international, aircraft type and cabin mix, plus on-board sales, bags and cargo.'],
                    ['title' => 'Real costs', 'text' => 'Fuel, landing, handling, navigation, maintenance by part, sales fees, catering, crew hotels and overheads.'],
                    ['title' => 'GSX Pro ground services', 'text' => 'Use GSX Pro? Boarding, catering, fuelling, pushback and de-icing are charged as GSX completes them.'],
                ],
                'shot'    => ams_img('shot-money.jpg'),
                'flip'    => '',
            ],
            'fleet' => [
                'anchor'  => 'fleet',
                'eyebrow' => 'Fleet & maintenance',
                'title'   => 'Aircraft that <em>age, wear and break</em>',
                'text'    => 'Buy from the makers in the sim, including the popular add-ons. Condition depends on age, use and how good your mechanics are.',
                'points'  => [
                    ['title' => 'Green, yellow, orange, red', 'text' => 'Worn aircraft are more likely to have emergencies. Repairs take real time, from minutes to two hours.'],
                    ['title' => 'Damage the sim can detect', 'text' => 'Tail strikes, hard landings, overspeeds, engine failures and overstress, reported by your mechanics after landing.'],
                    ['title' => 'Responsibility', 'text' => 'When an accident comes from poor maintenance, the airline answers for it in court.'],
                ],
                'shot'    => ams_img('shot-fleet.jpg'),
                'flip'    => 'yes',
            ],
            'crew' => [
                'anchor'  => 'crew',
                'eyebrow' => 'People',
                'title'   => 'A crew with <em>faces and careers</em>',
                'text'    => 'Create your pilot from head to toe, then hire co-pilots, flight attendants and mechanics. Everyone has a look, a rating and a weekly salary.',
                'points'  => [
                    ['title' => '3D crew', 'text' => 'Full-body figures with real proportions, hair, beards, glasses and uniforms, with breathing and blinking.'],
                    ['title' => 'Conduct and courts', 'text' => 'Warnings from light to severe, staff who learn from them, and rare cases that go to the police and the courts over two to three real days.'],
                    ['title' => 'Passengers too', 'text' => 'A drunk passenger at the gate? Deny or allow boarding, and live with what happens next.'],
                ],
                'shot'    => ams_img('shot-pilots.jpg'),
                'flip'    => '',
            ],
            'ranking' => [
                'anchor'  => 'ranking',
                'eyebrow' => 'Ranking',
                'title'   => '1,197 badges. <em>One reputation.</em>',
                'text'    => 'Climb the pilot ranks with every smooth landing, and grow the airline\'s popularity with flights on time. Rough landings and scandals pull it down.',
                'points'  => [
                    ['title' => 'Pilot and airline ranks', 'text' => 'Separate ladders for you and your airline, with your rating as a pilot.'],
                    ['title' => 'Six badge tiers', 'text' => 'From bronze upwards, for flights, hours, airports, routes, money, crew and more.'],
                    ['title' => 'Fly for a real airline', 'text' => 'Choose one of 51 real-world airlines by name and code, or build your own.'],
                ],
                'shot'    => ams_img('shot-ranking.jpg'),
                'flip'    => 'yes',
            ],
        ],
        'windows' => [
            'eyebrow' => 'The app on Windows',
            'title'   => 'The full app on your PC, <em>on any screen</em>',
            'text'    => 'The PC app opens Airline Manager Pro in its own window, connected straight to the sim. No phone needed, and the same graphics and screens.',
            'points'  => "Window, borderless or full screen (F11)\nFills wide, ultrawide and super-ultrawide screens without stretching\nChoose the graphics card and the sound output\nBackups in Documents that survive reinstalling\nA phone can stay linked at the same time",
            'shot'    => ams_img('shot-ops.jpg'),
        ],
        'cards' => [
            'eyebrow' => 'And there\'s more',
            'title'   => 'Details that make it <em>feel real</em>',
            'items'   => [
                ['icon' => 'route', 'title' => 'Multi-stop routes', 'text' => 'Routes to any country, with three, four, five or more stops a day.'],
                ['icon' => 'radio', 'title' => 'ATC your way', 'text' => 'Built-in ATC or BeyondATC, and fines for taking off or landing without clearance.'],
                ['icon' => 'scale', 'title' => 'Weights and fuel', 'text' => 'Fuel, passengers, bags, cargo and total weight against MTOW, from the sim and GSX Pro.'],
                ['icon' => 'wallet', 'title' => 'Payroll and hiring', 'text' => 'Weekly salaries, hiring fees and a job market where new candidates come and go.'],
                ['icon' => 'map', 'title' => 'Map layers', 'text' => 'Classic offline map, street map or satellite, from one button.'],
                ['icon' => 'shield', 'title' => 'Never lose your airline', 'text' => 'Saved the moment anything changes, with backups that survive reinstalling and new phones.'],
                ['icon' => 'bell', 'title' => 'Notifications', 'text' => 'Landings, mechanics, conduct, court dates and birthdays, also with the app closed.'],
                ['icon' => 'layers', 'title' => 'Several companies', 'text' => 'Airlines, regional, cargo and bush outfits side by side, each with divisions.'],
                ['icon' => 'update', 'title' => 'Updates in the app', 'text' => 'New versions install over the old one and keep everything you have built.'],
            ],
        ],
        'download' => [
            'eyebrow' => 'Download',
            'title'   => 'Ready for <em>departure</em>',
            'text'    => 'Get the newest version for Android and Windows. The two apps always come out together, so they work fluently with each other. Updates install over the old version and keep your airline.',
            'android' => "Phones and tablets, landscape\nAndroid 6.0 or newer\nLinks to the PC app over Wi-Fi or hotspot",
            'windows' => "Windows 10 or 11, 64-bit\nMicrosoft Flight Simulator 2024\nUnzip and start, nothing to install",
            'note'    => 'Early access: new features arrive often. Every version is listed on the releases page.',
        ],
        'faq' => [
            'eyebrow' => 'Questions',
            'title'   => 'Before you <em>take off</em>',
            'items'   => [
                ['q' => 'Do I need a phone to use it?', 'a' => 'No. The PC app opens the full Airline Manager Pro on Windows, connected straight to the sim. The Android app is there if you want the airline on a phone or tablet beside you.'],
                ['q' => 'What do I need to install on my PC?', 'a' => 'Only the PC app: unzip it and start it. It reads Flight Simulator through SimConnect, which comes with the sim, so there is no SDK or add-on to install.'],
                ['q' => 'Does my phone need the same Wi-Fi as my PC?', 'a' => 'Either the same Wi-Fi, or let the PC join your phone\'s hotspot. You pair once with a six-digit code and the link reconnects by itself.'],
                ['q' => 'Which aircraft can I fly?', 'a' => 'The default aircraft of Microsoft Flight Simulator 2024 and the popular add-ons. The app sees which aircraft is loaded and matches it to the one in your fleet.'],
                ['q' => 'Do I need GSX Pro?', 'a' => 'No. With GSX Pro the ground services are charged as GSX completes them and passenger numbers come from GSX; without it, standard charges and the sim\'s own payload are used.'],
                ['q' => 'Will I lose my airline when I update?', 'a' => 'No. New versions install over the old one and keep everything. The airline is saved the moment anything changes, and backups outside the app survive reinstalling.'],
                ['q' => 'Does the airline keep running when the app is closed?', 'a' => 'Yes. Hired pilots fly on the real clock, payroll is paid each week, repairs finish and court cases move on, and it all catches up when you open the app.'],
            ],
        ],
        'share'    => ['title' => 'Know a virtual pilot? Share Airline Manager Pro'],
        'footer'   => [
            'tagline' => 'A virtual airline for Microsoft Flight Simulator 2024, on Android and Windows.',
            'legal'   => 'Microsoft Flight Simulator is a trademark of the Microsoft group of companies. Airline Manager Pro is an independent app, not affiliated with or endorsed by Microsoft. GSX Pro is a product of FSDreamTeam and BeyondATC of its developers. Real airline names are used only as names, without logos, and belong to their owners.',
        ],
        'features' => [
            'title' => 'Everything in Airline Manager Pro',
            'text'  => 'The full list of what\'s in the app today, on Android and Windows. New features are added here as they arrive.',
        ],
    ];
}
