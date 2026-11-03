# Replaceable models

Put a `.glb` file (glTF binary) with one of these names in this folder, in the sub-folder shown, and build the app.
The app then uses it instead of its own model everywhere that model appears: the 3D view, the pictures, the
water salute, the museum. Remove the file and the app's own model comes back. This list is written by the build.

**How the files should be made**

- glTF 2.0 binary (`.glb`), textures inside the file. Metres. **+Y up, the front (the nose) towards +Z** (glTF's own convention).
- The app fits each model to the real size of the thing it replaces (length), sets it on the ground and centres it across, so small differences in scale or origin do not matter.
- Aircraft: the app's own model still moves its gear, flaps and lights; a file's model is shown as it is (its own paint).
- Licences of bought models must allow commercial sale (see CLAUDE.md).

## Aircraft (`aircraft/`)

| File | Aircraft |
|---|---|
| `aircraft/airbus-a320.glb` | Airbus A320 |
| `aircraft/airbus-a320neo.glb` | Airbus A320neo |
| `aircraft/airbus-a319neo.glb` | Airbus A319neo |
| `aircraft/airbus-a321.glb` | Airbus A321 |
| `aircraft/airbus-a321neo.glb` | Airbus A321neo |
| `aircraft/airbus-a321lr-neo.glb` | Airbus A321LR neo |
| `aircraft/airbus-a321xlr-neo.glb` | Airbus A321XLR neo |
| `aircraft/airbus-a330-800neo.glb` | Airbus A330-800neo |
| `aircraft/airbus-a330-900neo.glb` | Airbus A330-900neo |
| `aircraft/airbus-a350-900.glb` | Airbus A350-900 |
| `aircraft/airbus-a310-300.glb` | Airbus A310-300 |
| `aircraft/boeing-737-800.glb` | Boeing 737-800 |
| `aircraft/boeing-737-600.glb` | Boeing 737-600 |
| `aircraft/boeing-777-300er.glb` | Boeing 777-300ER |
| `aircraft/boeing-787-10.glb` | Boeing 787-10 |
| `aircraft/boeing-747-8.glb` | Boeing 747-8 |
| `aircraft/boeing-737-max-7.glb` | Boeing 737 MAX 7 |
| `aircraft/boeing-737-max-8.glb` | Boeing 737 MAX 8 |
| `aircraft/boeing-737-max-9.glb` | Boeing 737 MAX 9 |
| `aircraft/boeing-737-max-10.glb` | Boeing 737 MAX 10 |
| `aircraft/boeing-787-8.glb` | Boeing 787-8 |
| `aircraft/boeing-787-9.glb` | Boeing 787-9 |
| `aircraft/boeing-777-9.glb` | Boeing 777-9 |
| `aircraft/bombardier-crj900.glb` | Bombardier CRJ900 |
| `aircraft/bombardier-crj700.glb` | Bombardier CRJ700 |
| `aircraft/atr-72-600.glb` | ATR ATR 72-600 |
| `aircraft/de-havilland-canada-dhc-6-twin-otter.glb` | de Havilland Canada DHC-6 Twin Otter |
| `aircraft/de-havilland-canada-dhc-2-beaver.glb` | de Havilland Canada DHC-2 Beaver |
| `aircraft/cessna-208b-grand-caravan.glb` | Cessna 208B Grand Caravan |
| `aircraft/daher-kodiak-100.glb` | Daher Kodiak 100 |
| `aircraft/pilatus-pc-12.glb` | Pilatus PC-12 |
| `aircraft/cessna-172-skyhawk.glb` | Cessna 172 Skyhawk |

## Ground vehicles (`vehicles/`)

| File | Vehicle |
|---|---|
| `vehicles/fire-truck.glb` | Airport fire truck (the water salute) |
| `vehicles/fuel-truck.glb` | Fuel truck |
| `vehicles/catering-truck.glb` | Catering truck (scissor lift) |
| `vehicles/belt-loader.glb` | Baggage belt loader |
| `vehicles/baggage-tractor.glb` | Baggage tractor |
| `vehicles/baggage-cart.glb` | Baggage cart |
| `vehicles/pushback-tug.glb` | Push-back tug |
| `vehicles/passenger-stairs.glb` | Passenger stairs truck |
| `vehicles/passenger-bus.glb` | Apron passenger bus |
| `vehicles/de-icing-truck.glb` | De-icing truck |
| `vehicles/ground-power-unit.glb` | Ground power unit |
| `vehicles/lavatory-truck.glb` | Lavatory service truck |
| `vehicles/water-truck.glb` | Potable water truck |

## Jet bridges (`jetways/`)

| File | What |
|---|---|
| `jetways/jet-bridge.glb` | Jet bridge (passenger boarding bridge) |

## Hangars (`hangars/`)

The hangar building for each size: walls, roof, columns, windows and the doors (the floor, the rooms along the back wall,
the aircraft, the people and the equipment stay the app's own). Metres, the doors towards +Z, the floor at 0, centred.
It is fitted to the size shown. Meshes named `window`, `glass` or `skylight` show the sky at the base (day, sunrise,
sunset, night). For the PC only, a file with `-pc` at the end (e.g. `hangars/hangar-large-pc.glb`) is used first, so
a heavier, higher-quality building can go to the PC while phones keep the lighter one.

| File | Size |
|---|---|
| `hangars/hangar-small.glb` | Small hangar: 36 × 42 m, 13 m high, doors 10.5 m (turboprops, business and small jets) |
| `hangars/hangar-small-pc.glb` | The same, PC only |
| `hangars/hangar-medium.glb` | Medium hangar: 52 × 66 m, 18 m high, doors 15 m (A320, 737, regional jets) |
| `hangars/hangar-medium-pc.glb` | The same, PC only |
| `hangars/hangar-large.glb` | Large hangar: 82 × 94 m, 25 m high, doors 21.5 m (767, 787, A330, A350, 777) |
| `hangars/hangar-large-pc.glb` | The same, PC only |
| `hangars/hangar-very-large.glb` | Very large hangar: 96 × 100 m, 30 m high, doors 26.5 m (747, 777-9, A380) |
| `hangars/hangar-very-large-pc.glb` | The same, PC only |

## Hangar equipment and furniture (`hangar-props/`)

One file for each kind: every one of that kind in the hangars uses it. Metres, front towards +Z (the side you face it
from: a chair's front is where you sit, a desk's where you work), standing on the floor. It is fitted to the size of the
app's own. Tables, counters and trolleys keep working as places to put things down. The tug by the doors is the apron's
own (`vehicles/pushback-tug.glb`).

| File | What |
|---|---|
| `hangar-props/tool-trolley.glb` | Red rolling tool chest (tools on top) |
| `hangar-props/work-stand.glb` | Yellow work platform with steps (at the engine) |
| `hangar-props/traffic-cone.glb` | Traffic cone on its base |
| `hangar-props/workbench.glb` | Workbench with pegboard and vice (along the back wall) |
| `hangar-props/fire-extinguisher.glb` | Fire extinguisher on its stand |
| `hangar-props/waste-bin.glb` | Waste bin (hangar, office, break room) |
| `hangar-props/office-desk.glb` | Work table in the maintenance office (the monitor, keyboard and mouse stand on it) |
| `hangar-props/office-chair.glb` | Office chair |
| `hangar-props/keyboard.glb` | Computer keyboard |
| `hangar-props/computer-mouse.glb` | Computer mouse |
| `hangar-props/bookshelf.glb` | Shelf of manuals |
| `hangar-props/kitchen-counter.glb` | Break room counter with cupboards |
| `hangar-props/sink.glb` | Sink and tap |
| `hangar-props/coffee-machine.glb` | Coffee machine |
| `hangar-props/coffee-mug.glb` | Coffee mug |
| `hangar-props/drinking-glass.glb` | Drinking glass |
| `hangar-props/break-room-table.glb` | Break room table |
| `hangar-props/break-room-chair.glb` | Break room chair |

## Lounge furniture and equipment (`lounge-props/`)

One file for each kind, used for every one of that kind in your lounges. Where the levels differ (Lounge, Business
lounge, Flagship lounge) each level has its own file: the carpets, armchairs, sofas and coffee tables. Metres, front
towards +Z (where you sit or stand to use it), standing on the floor; fitted to the size of the app's own.

| File | What |
|---|---|
| `lounge-props/carpet-lounge.glb` | Carpet, Lounge |
| `lounge-props/carpet-business.glb` | Carpet, Business lounge |
| `lounge-props/carpet-flagship.glb` | Carpet, Flagship lounge (the finest) |
| `lounge-props/armchair-fabric.glb` | Armchair, fabric (Lounge) |
| `lounge-props/armchair-leather.glb` | Armchair, leather (Business lounge) |
| `lounge-props/armchair-velvet.glb` | Armchair, velvet on gold legs (Flagship lounge) |
| `lounge-props/sofa-fabric.glb` | Sofa, fabric |
| `lounge-props/sofa-leather.glb` | Sofa, leather |
| `lounge-props/sofa-velvet.glb` | Sofa, velvet |
| `lounge-props/coffee-table-oak.glb` | Coffee table, oak |
| `lounge-props/coffee-table-walnut.glb` | Coffee table, walnut |
| `lounge-props/coffee-table-marble.glb` | Coffee table, marble and gold |
| `lounge-props/floor-lamp.glb` | Floor lamp |
| `lounge-props/potted-plant.glb` | Potted plant |
| `lounge-props/magazine-rack.glb` | Magazine rack |
| `lounge-props/reception-desk.glb` | Reception desk |
| `lounge-props/buffet-counter.glb` | Refreshment counter |
| `lounge-props/espresso-machine.glb` | Espresso machine |
| `lounge-props/tea-urn.glb` | Tea urn (samovar) |
| `lounge-props/teapot.glb` | Teapot |
| `lounge-props/coffee-cup-and-saucer.glb` | Coffee cup and saucer |
| `lounge-props/teacup-and-saucer.glb` | Teacup and saucer |
| `lounge-props/napkin-stack.glb` | Napkins |
| `lounge-props/fruit-bowl.glb` | Fruit bowl |
| `lounge-props/drinks-fridge.glb` | Glass-fronted fridge (the drinks and snacks in it are the items/ files) |
| `lounge-props/bar-counter.glb` | Bar counter (Business and Flagship) |
| `lounge-props/bar-stool.glb` | Bar stool |
| `lounge-props/bottle-shelf.glb` | Shelf of bottles behind the bar |
| `lounge-props/pendant-light.glb` | Pendant light (Business) |
| `lounge-props/chandelier.glb` | Chandelier (Flagship) |
| `lounge-props/fireplace.glb` | Fireplace (Flagship) |
| `lounge-props/grand-piano.glb` | Grand piano (Flagship) |
| `lounge-props/wall-art.glb` | Framed art (Flagship) |
| `lounge-props/champagne-bucket.glb` | Champagne bucket (Flagship) |
| `lounge-props/departures-screen.glb` | Departures screen frame (the list is drawn by the app) |

## The vending machine's parts (`items/vending-machine.glb`)

Name these parts (nodes or meshes) in your file and the machine works with them; any part left out stays the app's own.
Rows are A (top), B, C; columns 1 (left), 2, 3: nine products, as in the app.

| Name | What it is | How the app uses it |
|---|---|---|
| `slot-A1` … `slot-C3` | An empty node where each product stands, at the front of its shelf | The products (the app's, or their own files below) are set there, more of the same behind it |
| `coil-A1` … `coil-C3` | The spiral behind each product | Turns once round its own Z axis when that product is chosen |
| `flap` | The tray's flap, its origin on the hinge (top edge) | Swings in round its X axis when you take the product |
| `tray` | An empty node on the floor of the tray | Where the chosen product drops to |
| `display` | A flat mesh facing the front | The machine's messages are drawn on it (Make a choice, Take your item …) |
| anything else | The cabinet, glass, keypad, lights, name | Shown as it is |

Put each `slot-` node on the shelf, under the middle of the front product; the others stand behind it, 14 cm apart.
Which product is in which slot: A1 cola, A2 lemon soda, A3 orange soda, B1 chocolate bar, B2 peanut bar, B3 sparkling water,
C1 oat bar, C2 iced tea, C3 caramel bar. Names may also use capitals or an underscore (`Slot_A1`).

## Hangar items (`items/`)

The break room's vending machine and what it sells. Fitted to the size of the app's own model; cans and bars stand
upright (top towards +Y), the machine's front towards +Z.

| File | What |
|---|---|
| `items/vending-machine.glb` | Vending machine (the hangar break room) |
| `items/can-cola.glb` | Can of cola |
| `items/can-lemon.glb` | Can of lemon soda |
| `items/can-orange.glb` | Can of orange soda |
| `items/can-water.glb` | Can of sparkling water |
| `items/can-icedtea.glb` | Can of iced tea |
| `items/bar-chocolate.glb` | Chocolate bar |
| `items/bar-peanut.glb` | Peanut bar |
| `items/bar-oat.glb` | Oat bar |
| `items/bar-caramel.glb` | Caramel bar |

## People (`people/`)

A base model for each gender and group of looks. The app picks the group from each person's look (skin tone and eyes);
when that file is missing it uses `person-male.glb` or `person-female.glb`, and when that is missing too its own figure.
Rig them with a skeleton; a bone named `Jaw` (or containing "jaw") opens the mouth while the person talks, and
animations named `Idle` and `Walk` are played when they stand and walk. Height is fitted to the person's own.

| File | People |
|---|---|
| `people/person-male-european.glb` | Men: European |
| `people/person-male-african.glb` | Men: African |
| `people/person-male-east-asian.glb` | Men: East Asian |
| `people/person-male-south-asian.glb` | Men: South Asian |
| `people/person-male-middle-eastern.glb` | Men: Middle Eastern and North African |
| `people/person-male-latin-american.glb` | Men: Latin American |
| `people/person-female-european.glb` | Women: European |
| `people/person-female-african.glb` | Women: African |
| `people/person-female-east-asian.glb` | Women: East Asian |
| `people/person-female-south-asian.glb` | Women: South Asian |
| `people/person-female-middle-eastern.glb` | Women: Middle Eastern and North African |
| `people/person-female-latin-american.glb` | Women: Latin American |
| `people/person-male.glb` | Men (any group without its own file) |
| `people/person-female.glb` | Women (any group without its own file) |
