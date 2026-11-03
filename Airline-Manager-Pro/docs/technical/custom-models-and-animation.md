# Custom 3D models and better animation

Airline Manager Pro · planning notes · 3 November 2026

## Contents

[TOC]

## 1. Using bought 3D models

**Yes, the game can show 3D models you have a licence for.** The engine (three.js) loads them directly.

- **Format:** glTF / GLB is best. FBX or OBJ can usually be converted.
- **Moving parts:** our own aircraft models move the gear, flaps, slats, spoilers, control surfaces, doors and engine fans as the aircraft flies. A bought model only does that if those parts are separate, named pieces. They are matched to our parts by name, so the aircraft still configures and flies by the speeds in the reference documents.
- **Liveries:** your airline's colours are painted onto the model's own texture layout. Most good models come with a paint template.
- **Phones and tablets:** detailed models are compressed and get lighter versions for distance and for phones; weaker devices fall back to our own model.
- **Download size:** each model makes the APK and the installer bigger, so models can come as an optional download per aircraft type, like the voice pack.

## 2. How detailed an aircraft can be

**An Airbus below 200,000 vertices is fine, on the PC and on phones and tablets**, when a few things are handled well.

**The vertex count is not the problem.** Even mid-range phone graphics chips draw a few million triangles a second at 30 frames. A Samsung Galaxy Tab A9+ (Snapdragon 695) handles one 200,000-vertex aircraft close up at 30–60 frames a second. On the PC it is no issue at all.

**What decides performance instead:**

1. **How many are on screen.** One detailed aircraft (the one you follow, or yours at the gate) is fine. Twenty at a busy airport is not, on a tablet. The detailed model is used for the aircraft close to you, and our own lighter model for the rest, fading between the two as they come nearer or move away.
2. **Textures.** They usually cost more than the shape: a model with 4K textures for colour, bumps and shine can need 60–100 MB of graphics memory per set, and tablets don't have much to spare. On phones and tablets they are reduced to 2K and compressed (KTX2) so they stay small in memory. The PC keeps the full size.
3. **How many separate materials.** Every material is one more draw call. Good models have 5–20. Some have 100+ (every bolt and light its own material). Under about 30 is comfortable on a tablet; above that they are merged when loading.
4. **Download size.** Compressed (Draco / meshopt), a 200,000-vertex model is often only 3–8 MB, plus the textures.

**Budget when choosing a model:**

| | Phones and tablets | PC |
|---|---|---|
| Vertices | up to about 200,000 (for the close one) | 500,000+ is fine |
| Textures | 2K (4K is reduced automatically) | 4K |
| Materials | under about 30 | doesn't matter much |
| Detailed models on screen | 1–3 | many |

**Easiest to work with:** glTF / GLB (or FBX to convert); gear, flaps, slats, spoilers, control surfaces, doors and engine fans as separate, named parts; a paint template for the liveries.

## 3. Custom and higher-detail people

**Yes, people can get the same treatment**, but for people the animation matters more than the model, and it has to fit how people are built in the game.

**How people are built today.** Everyone (crew, passengers, you, the people in court) comes from one figure system, made from the look chosen in the editor: skin, hair, face, clothes and voice. The movement is done by our own shader code without a real skeleton: arms, legs, the head and the jaw turn as whole pieces. That is why walking, sitting and reaching look a little stiff, and why the hands can't truly grip the family photo.

**Option A: a real skeleton with motion capture (the biggest improvement).**

- A proper skeleton: spine, shoulders, elbows, wrists, fingers, hips, knees and feet. The figures are already built from MakeHuman data, so their joints already carry the standard names.
- Animation from motion-capture libraries whose licences allow commercial games: the CMU motion capture database (free for any use) and Mixamo (allowed in commercial games, not for handing out the raw files). That gives natural walking, sitting down and standing up, talking gestures, nervous fidgeting, and hands that close around the photo frame.
- Faces with proper mouth shapes for each sound, so the lips follow the voice much more closely, plus eyebrows and blinking with expression.
- Everyone keeps their look, voice and the editor. This stays within the rule that people are one figure system everywhere.

**Option B: higher-detail bought or custom people.**

- The same conditions as the aircraft: a licence that allows a paid game, glTF / GLB / FBX, a rig and ideally facial shapes (blend shapes).
- A bought character is one fixed person. To keep the look editor working, bought models are used as better base bodies and heads, with hair, clothes and skin still applied from the look; or for specific characters, like the judge or your head of operations.

**Performance.** Detailed people are fine near you: one to five close up on a tablet, many more on the PC. The cabin holds 150+ passengers, so only the nearest get the full skeleton and face; the rest stay as they are now (as the cabin already does with "Detailed passengers").

**Suggested order:** first the skeleton, motion capture and better mouths for everyone (the biggest visible difference, and no licence problems); then higher-detail heads, hair and clothes, from licensed base models or improved ones of our own.

## 4. A better animation system for walking and talking

**Yes, this can be done within the figure system the game has now**, without bought models or a new skeleton.

### Walking: a real gait cycle instead of swinging limbs

Today the legs and arms swing on a simple wave, the knees bend a little and the body bobs. Real walking has distinct phases, and each is animated:

- **The step:** heel strike, foot flat, push-off from the toes, then the leg swinging through.
- **The knee** bends twice per step: a little on landing, a lot as the leg swings. **The ankle** is added so the foot flexes instead of moving as a rigid block.
- **The hips** turn and tilt with each step, and the body shifts its weight from side to side.
- **The shoulders** turn against the hips; **the arms** swing with the elbow bending more on the forward swing.
- **The head** stays steady while the body moves under it.
- **Feet stay on the ground** while they carry the weight: no sliding. Step length and pace follow how fast the person moves.
- **Starting, stopping and turning:** a first step to get going, slowing over the last two steps, leaning into turns.
- **Each person their own walk:** step length, arm swing, posture and pace vary per person. A tired crew member walks differently from a confident one, a passenger with a bag differently again.
- **Sitting and standing** as a real movement: turn, reach back for the armrest, lower, settle, instead of sliding down into the chair.

New joints added to the current system: ankles, a two-part spine (lower and upper back), shoulders that lift and roll, and wrists.

### Talking: mouth shapes from the sounds being spoken

Today the jaw opens on vowels and the lips round or spread, worked out from the letters. Better:

- **Sounds, not letters.** The natural voice already breaks every line into sounds before speaking it; those sounds and their timing drive the mouth, so it makes the right shape at the right moment.
- **About 12 mouth shapes:** lips pressed together (m, b, p); lower lip under the top teeth (f, v); tongue showing (th); rounded lips (oo, w); wide lips (ee); open (ah); and more. The upper and lower lips move separately, the corners pull in or out, the cheeks and chin follow.
- **Blending:** each shape blends into the next, as real mouths do; it never snaps.
- **Loudness:** with the natural voices, the jaw opens wider on loud and stressed words and less on quiet ones, measured from the actual sound.
- **The rest of the face:** small nods on stressed words, eyebrows rising on questions or emphasis, blinks at pauses, the eyes glancing away now and then, stronger or weaker with the mood (honest, defensive, angry, upset).
- **Device voices:** the phone's own voice does not give the game its sound to measure, so there the mouth uses timing worked out from the line.

### How it is built

1. **Mouths first:** the most visible change in conversations. Every talking mouth goes through one function today, so it improves everywhere at once: office, court and cabin.
2. **Then the new joints and the new walking and sitting.**
3. **Then a check everywhere people appear**, with screenshots and short clips. The Animation settings (Low to Ultra) still scale all of it.

**Performance:** very little cost; the work happens where the current movement is already worked out, so phones and tablets stay smooth.

## 5. A bought cabin model instead of the generated cabin

**Yes, a bought cabin model can replace the generated one and still look good**, used the right way. The issue is not detail but that our cabin is built to fit each aircraft.

**How the cabin works now.** It is built for each flight from the aircraft type and your seat layout: its length and width, seats across, one or two aisles, business and economy, galleys at both ends. Passengers from the passenger list sit in their own seats, the crew walk the aisles and use their jump seats, and you can walk around and talk to people. One fixed cabin model has one fixed length and layout, so it can't simply replace that.

**The best way: the model as parts, not as one fixed cabin.**

- **The shell** (side walls, ceiling, overhead bins, window frames, floor and carpet) is stretched or repeated in sections to the aircraft's length. A good model usually repeats every frame (about 50 cm), so this works well.
- **One seat of each kind** (economy, business) is placed into our layout as many times as needed. A detailed seat drawn 180 times costs about as much as drawing it once (instancing: all copies in one draw).
- **Galleys, lavatories and curtains** from the model go at the ends.
- **Everything else stays:** walking, the crew, passengers in their own seats, your airline's seat colours, mood lighting and the real view out of the windows.

**Vertex budget:**

| Part | Phones and tablets | PC |
|---|---|---|
| One economy seat | 3,000–10,000 | 10,000–40,000 |
| One business seat | 10,000–30,000 | 30,000–100,000 |
| One shell section (about one frame) | 2,000–8,000 | 10,000–30,000 |
| The whole cabin together | about 200,000–400,000 | 1–2 million is fine |
| Textures | 2K | 4K |

Repeated seats and sections are cheap, so it is the single seat and the single section that count, not the total.

**What makes a cabin model easy to use:**

- glTF / GLB or FBX.
- Each kind of part separate and named: seat, shell section, bins, window shade, galley, lavatory door, curtain.
- Fabric, plastic, metal and lights as separate materials, so seat colours and mood lighting can change.
- Window shades and bins as separate pieces, so they can open and close.
- Real-world scale (metres), with the floor flat.
- A licence that allows use in a game you sell.

It doesn't have to be all of this: a model in one piece can usually still be split up, with more work.

## 6. Simplifying models and smoothness on demand

**Yes.**

- **Simplifying (decimation):** with the standard tool for this (meshoptimizer), the triangle count is reduced while the shape, the texture layout and the hard edges are kept.
- **Several levels of detail:** each model gets, for example, 100%, 50%, 25% and 10%. The game chooses the level from the quality setting (Low to Ultra) and from the distance: the seats near you in full detail, the far end of the cabin at a lower level, fading between levels.
- **Smoother where it matters:** seat edges and armrests can be made rounder on Ultra and on the PC.
- **Automatic performance** (Settings > Graphics > Smooth on this device) keeps the frame rate up on top of that, and frame generation keeps turning smooth when the device is warm.

## 7. Licences, the manufacturers' rights and the project rule

1. **The licence must allow use inside a game you sell.** Many store licences (TurboSquid, CGTrader, Sketchfab "Standard") allow "use in a game" as long as the model is embedded and can't easily be extracted. Some forbid apps and games or allow only pictures and video. Look for wording like "Use in interactive products / games: yes". The project rules already require licences that allow commercial sale. Keep each licence on file.
2. **The aircraft manufacturer's rights.** Airbus and Boeing protect their names and the look of their aircraft. Some studios get a licence from them to show real aircraft by name in a paid game. A model bought from an artist covers the artist's work, not that. Our own models avoid this: they are built from published dimensions and carry no logos. For a small game the risk may be low, but it matters more when selling widely or using the real names.
3. **The project rule.** The project rules say: *"Our own models only: no downloaded third-party models"*. To use bought models, the rule changes, for example to: *"Third-party models only with a licence for use in a commercial game, kept on file, with no airline or manufacturer logos."*

## 8. What to send and the order of work

**To add a bought model:** the file (or a link) and its licence text. Each one is checked for a paid game first, then:

1. Loading licensed models, with our own model as the fallback on weaker devices and for distant aircraft.
2. Matching the moving parts by name, the livery template and the levels of detail.
3. Screenshots next to the current model before switching.

**Animation, independent of bought models:** mouths first, then the new joints with the new walking and sitting, then checks everywhere people appear, with clips after each step.
