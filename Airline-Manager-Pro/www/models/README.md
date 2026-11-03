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
| `aircraft/airbus-a350-900.glb` | Airbus A350-900 |
| `aircraft/airbus-a310-300.glb` | Airbus A310-300 |
| `aircraft/boeing-737-800.glb` | Boeing 737-800 |
| `aircraft/boeing-737-600.glb` | Boeing 737-600 |
| `aircraft/boeing-777-300er.glb` | Boeing 777-300ER |
| `aircraft/boeing-787-10.glb` | Boeing 787-10 |
| `aircraft/boeing-747-8.glb` | Boeing 747-8 |
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
