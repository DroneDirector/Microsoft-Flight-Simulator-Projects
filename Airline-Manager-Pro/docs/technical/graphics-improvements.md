# Graphics engine improvements

Airline Manager Pro · catalogue of improvements to the current engine (three.js) · 2 November 2026

How to read the tables: **Cost** is the performance cost while playing (None, Low, Medium, High; "Gain" means it makes the game faster). **Tier** is the lowest graphics setting it would be switched on at (All, Medium, High, Ultra; "Build" means it is done when the game is built, not while playing; "Dev" means a tool for making the game). Every item is written as our own code or uses MIT, zlib, Apache or CC0 material, so all are allowed in a paid game.

[TOC]

## Can the current engine look like Unity or Unreal?

**Short answer: it can get close to Unity's look and reach a good part of Unreal's look for this kind of game, but not all of it.**

| Area | Unity (URP / HDRP) | Unreal Engine 5 | Our engine after these improvements |
|---|---|---|---|
| Materials (metal, fabric, glass, skin) | Physically based | Physically based, very rich | Physically based, same principles: **comparable** |
| Lighting in rooms and the cabin | Baked lighting and probes; HDRP live options | Lumen: live bounced light everywhere | Baked lighting, light probes, ambient occlusion: **close** for rooms that don't change; live bounced light only approximated (screen-space) |
| Shadows | Cascaded, soft | Virtual shadow maps: sharp at any distance | Cascaded, soft, contact shadows: **close to Unity**, below Unreal at great distances |
| Reflections | Probes, screen-space, ray-traced (HDRP) | Lumen and ray-traced | Probes and screen-space: **good**, no ray-traced reflections |
| Sky, clouds, fog | Physical sky, volumetric clouds and fog (HDRP) | Sky atmosphere, volumetric clouds and fog | Same methods possible: **comparable**, cost kept down with lower resolution and upscaling |
| Geometry detail | Level of detail | Nanite: film-level detail with no level-of-detail work | Level of detail, instancing, normal maps: **good**, but not Nanite's density |
| People and faces | Good with bought assets | MetaHuman: near-photoreal | Stylised to semi-realistic: skin shading, better eyes and hair cards help a lot; **below MetaHuman** |
| Image quality | TAA, upscaling (FSR / DLSS) | TSR, DLSS, FSR | TAA and FSR-style upscaling: **comparable**; no DLSS (needs native code) |
| Ray tracing during play | HDRP, with RTX cards | Yes | **Not possible yet** in browsers; path-traced photo mode instead |
| Performance | Native code: fastest | Native, heavy on hardware | Browser adds some overhead; WebGPU narrows the gap. Our scenes are much smaller than a typical Unreal game, so a steady 60 fps on a mid-range PC is realistic |

**What decides the look more than the engine:** lighting, materials, textures and the final image processing. Unreal games look the way they do mainly because of these, and because of large libraries of scanned assets. The methods are published and well documented; they can be written for our engine. The limits are what browsers allow (no hardware ray tracing, no DLSS) and the time needed to tune each scene until it looks right, not how fast the code can be written.

**What can't be matched:** live ray tracing, Nanite-level geometry, Lumen's fully live bounced light in big changing scenes, and MetaHuman-level faces.

## 1. Engine core and renderer

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Update three.js (0.159 to the current version) | Moves to two years of newer engine work | Faster drawing, fixes, newer effects (node materials, newer post-processing) available | Gain | All |
| WebGPU renderer with WebGL fallback | Uses the modern graphics interface of the browser | Less work for the processor per frame, compute shaders, more objects and lights at the same speed; WebGL kept for older phones | Gain | All |
| Node materials (TSL) | Materials written as building blocks that work in both WebGPU and WebGL | One material system for every effect below; easier to add new looks | None | All |
| Compute shaders | Graphics card does calculations (particles, culling, crowds) | Thousands of particles and objects without slowing the processor | Gain | High |
| One shared renderer for all views | The office, cabin, court and 3D view reuse the same renderer and resources | Faster switching between screens, less memory, fewer loading pauses | Gain | All |
| Render graph | Each frame is planned as steps (shadows, depth, colour, effects) | Effects share data instead of drawing the scene twice; easier to switch effects per tier | Gain | All |
| Depth pre-pass | Draws the depth of the scene first | Expensive lighting is only calculated for pixels that are seen; needed by several effects | Low | High |
| Reversed depth buffer | More precise depth for far distances | No flickering where surfaces overlap (runway markings, distant terrain) | None | All |
| Floating origin | Keeps the camera near the centre of the coordinate system | No shaking of aircraft and cockpit far from the airport | None | All |
| Shader warm-up during the splash screen | Prepares all shaders while loading | No stutter the first time an effect or room is shown | None | All |
| Pipeline and shader cache | Keeps prepared shaders between sessions | Faster starts after the first one | None | All |
| Fixed time step for animation | Movement and effects step at an even rate | Smooth motion even when the frame rate varies | None | All |
| Frame pacing | Even time between frames | Feels smoother at the same frame rate | None | All |
| High-refresh support (120/144 Hz) | Draws as fast as the monitor allows | Very smooth camera turns on gaming monitors | Medium | High |
| Off-screen rendering in a worker | Drawing runs beside the menus, not inside them | Menus stay responsive while 3D is busy | Gain | All (PC) |

[↑ Contents](#contents)

## 2. Performance and memory

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Instancing | Draws many copies (seats, passengers, lights, binders, trees) in one call | Often the biggest speed gain; allows far more detail | Gain | All |
| Batched meshes | Combines different small objects into one draw | Fewer draws for offices and airports full of props | Gain | All |
| Merging static geometry | Joins objects that never move | Fewer draws, less processor work | Gain | All |
| Frustum culling tuning | Skips objects outside the view, with correct bounds | Less work every frame; no objects popping at the edges | Gain | All |
| Occlusion culling | Skips objects hidden behind others | Large gains in the cabin and buildings | Gain | Medium |
| Portal culling for rooms | Only draws rooms visible through doors and windows | Offices, court and cabin draw only what can be seen | Gain | All |
| Compressed textures (KTX2 / Basis) | Textures stay compressed on the graphics card | 4–6 times less graphics memory, faster loading, more textures possible | Gain | All |
| Texture atlases and arrays | Many small textures in one | Fewer material switches, fewer draws | Gain | All |
| Mipmaps everywhere | Smaller texture versions for far surfaces | No shimmer, faster drawing | Gain | All |
| Texture streaming | Loads the sharpest texture levels only when close | High detail up close without filling memory | Gain | High |
| Geometry compression (meshopt / quantisation) | Smaller vertex data | Less memory and faster loading | Gain | All |
| Index and vertex cache optimisation | Reorders triangles for the graphics card | Faster drawing of the same shapes | Gain | All |
| Dynamic resolution | Lowers the drawing size slightly when the frame rate drops | Steady frame rate in heavy moments | Gain | All |
| Upscaling (FSR 1-style) | Draws smaller and sharpens to full size | Large speed gain at nearly the same sharpness | Gain | All |
| Temporal upscaling | Combines several frames to rebuild full detail | Sharper than simple upscaling at the same speed | Low | High |
| Variable-rate effects | Expensive effects at half or quarter resolution | Fog, ambient occlusion and clouds at a fraction of the cost | Gain | All |
| Shadow caching | Shadows of still objects drawn once | Big savings in rooms and at airports | Gain | All |
| Static reflection caching | Reflection maps updated only when needed | Reflections without a cost every frame | Gain | All |
| Update rate per distance | Far animations and effects update less often | Crowds and airport traffic cost less | Gain | All |
| Animation level of detail | Simpler animation for far figures | Many more people on screen | Gain | All |
| Object pools | Reuses objects instead of creating new ones | No stutter from memory clean-up | Gain | All |
| Releasing graphics memory between screens | Frees textures and models when leaving a room (data kept) | Lower memory, no slowdown after hours of play | Gain | All |
| Frame budget manager | Spreads heavy work (loading, baking) over several frames | No hitches when new things appear | Gain | All |
| Background loading in workers | Builds geometry and decodes textures off the main thread | Smooth play while airports and rooms load | Gain | All |
| GPU timing per effect | Measures how long each effect takes | Every effect stays within budget; tiers are set from real numbers | None | Dev |

[↑ Contents](#contents)

## 3. Lighting

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Physically based light units | Lights in lumens and lux; the sun in real strength | Light looks consistent and believable everywhere | None | All |
| Real sun position | Sun from date, time and the airport's position | Correct light for every flight and time of day | None | All |
| Clustered (Forward+) lighting | Splits the view into cells and lights only what each light touches | Hundreds of real lights (airport, cabin, offices) at little cost | Low | Medium |
| Area lights | Lights from panels and strips, not points | Soft, realistic light from ceiling panels, monitors and windows | Low | Medium |
| Light shapes (IES profiles) | Real lamp light patterns | Believable pools of light from spotlights and floodlights | Low | High |
| Light probes | Captured light at points in a room | Moving people and objects get the room's colours and brightness | Low | All |
| Reflection probes with box projection | Room-shaped reflections | Correct reflections in glossy floors, desks and windows inside rooms | Low | All |
| Image-based lighting from HDR skies | Light from a real sky picture | Natural outdoor light and reflections | Low | All |
| Time-of-day light blending | Smooth light changes from dawn to night | Living scenes over a long flight | Low | All |
| Light flicker and warm-up | Fluorescent and LED behaviour | Small realism touches in offices and hangars | None | High |
| Emissive surfaces that light the room | Glowing screens and signs add light | Monitors and signs feel part of the scene | Low | High |
| Cabin light modes | Boarding, cruise, night and landing lighting | Matches real airline cabin lighting | None | All |
| Exposure adaptation (eye adaptation) | Brightness adjusts like the eye when moving between dark and bright | Natural feel when entering the cabin from the apron or looking outside | Low | Medium |
| Light leaks control | Stops light passing through walls | No glowing seams in rooms | None | All |

[↑ Contents](#contents)

## 4. Shadows

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Cascaded shadow maps | Several shadow maps from near to far | Sharp shadows up close, still covering a whole airport | Medium | Medium |
| Soft shadows (PCSS) | Shadows softer the further from the object | Realistic shadows of aircraft and furniture | Medium | High |
| Contact shadows | Short screen-space shadows | Feet, cups and seat legs touch the ground properly | Low | Medium |
| Shadow stabilisation | Shadows don't crawl when the camera moves | No shimmering shadow edges | None | All |
| Point and spot light shadows | Shadows from lamps, not only the sun | Lamps on desks and hangar lights cast real shadows | Medium | High |
| Baked shadows for still objects | Shadows stored in the lighting | Detailed room shadows for free | None | All |
| Cloud shadows | Clouds darken the ground below | Moving patches of light over the islands | Low | High |
| Transparent shadows | Coloured and partial shadows through glass and fabric | Correct light through cabin windows and curtains | Low | High |
| Shadow level of detail | Far objects use simpler shadow shapes | Same look, lower cost | Gain | All |

[↑ Contents](#contents)

## 5. Global illumination and ambient occlusion

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Ambient occlusion (GTAO) | Darkens corners and contact areas | Objects sit in the scene; one of the biggest realism gains | Low–Medium | Medium |
| Baked lightmaps | Bounced light calculated once and stored | Photo-like soft light in offices, court and cabin at no play cost | None | Build |
| Path-traced baking | Lightmaps calculated with full light paths when the game is built | The most realistic still lighting possible | None | Build |
| Baked ambient occlusion in models | Contact darkening stored with each model | Detail on phones too, where live effects are too costly | None | All |
| Irradiance volumes | A grid of light samples through a space | Moving people pick up bounced light from walls and floors | Low | Medium |
| Screen-space global illumination | Approximates live bounced colour on screen | Colour bleeding (red seats tint the aisle), more depth | Medium–High | Ultra |
| Probe-based live global illumination (DDGI-style) | Updates light probes over time | Light that changes with time of day in the cabin and hangars | High | Ultra |
| Bent normals | Better direction of ambient light | Softer, more correct shading in folds and corners | Low | High |
| Specular occlusion | Removes reflections inside crevices | No unrealistic shine in dark gaps | Low | High |
| Sky visibility | Areas that see less sky get less sky light | Natural darkening under wings and in hangars | Low | Medium |

[↑ Contents](#contents)

## 6. Materials and shading

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| All materials physically based | Replace the remaining simple materials | Consistent, realistic look in every scene | Low | All |
| Clear coat | A glossy layer over paint | Aircraft paint and polished desks look real | Low | Medium |
| Sheen | Soft edge shine of cloth | Seat fabric, carpets and uniforms look like fabric | Low | Medium |
| Anisotropic reflections | Stretched highlights | Brushed metal, engine cowlings, hair | Low | High |
| Iridescence | Rainbow sheen | Fuel on wet tarmac, coated glass | Low | High |
| Transmission and thickness | Light through glass and thin materials | Real windows, cups, curtains and lamp shades | Medium | High |
| Refraction | Bends the view through glass | Cockpit windows and drinking glasses look solid | Medium | High |
| Subsurface scattering for skin | Light under the skin | Faces that look alive rather than plastic | Low | Medium |
| Subsurface for wax, leaves, ears | Same idea for other materials | Softer, natural look | Low | High |
| Parallax occlusion mapping | Fake depth in flat surfaces | Carpet, tarmac and brick with real depth | Medium | High |
| Detail maps | Fine texture repeated close up | Sharp detail when looking closely at seats and desks | Low | Medium |
| Wear and dirt layers | Scuffs, dust, grime by age | Aircraft and rooms that look used; can follow the aircraft's age in the game | Low | Medium |
| Wetness | Darker, glossier surfaces in rain | Rain changes the look of runways and aircraft | Low | Medium |
| Snow and frost cover | Builds up on top surfaces | Winter at Vágar looks like winter; ties into de-icing | Low | Medium |
| Triplanar mapping | Textures without stretching | Clean terrain and rock textures | Low | All |
| Material level of detail | Simpler materials at distance | Lower cost with no visible change | Gain | All |
| Decals | Stickers and marks projected on surfaces | Runway markings, tyre marks, signs, dirt | Low | All |
| Specular anti-aliasing | Prevents sparkling highlights | Calm, clean shine on metal at a distance | None | All |

[↑ Contents](#contents)

## 7. Textures

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Free scanned material textures (CC0) | Fabric, carpet, leather, wood, metal, concrete, tarmac | Real surfaces instead of flat colours | Low | All |
| Normal maps | Surface detail without extra shapes | Stitching, panel lines, rivets, grain | Low | All |
| Roughness and metalness maps | Variation in shine | Surfaces stop looking uniform | Low | All |
| Higher-resolution textures on Ultra | 2K–4K textures up close | Sharpness when walking close to things | Medium (memory) | Ultra |
| Anisotropic filtering | Sharp textures at shallow angles | Runways, floors and carpets stay sharp into the distance | Low | All |
| Procedural textures | Textures created by code | Endless variation with no download size; fits how the game is made | Low | All |
| Texture variation | Breaks up repeating patterns | No visible tiling on big surfaces | Low | All |
| Aircraft livery system | Our own liveries with decals and gloss | Each airline's aircraft distinct (own designs only, no real logos) | Low | All |
| Screen content textures | Real live content on monitors and laptops | Office screens show the game's real data | Low | All |
| Signs and text rendering (signed-distance fonts) | Crisp text at any size | Sharp signs, gate numbers and labels | Low | All |

[↑ Contents](#contents)

## 8. Anti-aliasing and image quality

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Temporal anti-aliasing (TAA) | Combines frames to smooth edges | Clean edges, no flicker on thin lines (seat rows, runway lights, wires) | Low | Medium |
| SMAA | Edge smoothing in one frame | Clean edges where TAA is too costly (phones) | Low | All |
| MSAA tuning | Hardware edge smoothing | Sharp geometry edges | Medium | Medium |
| Sharpening (contrast-adaptive) | Restores crispness | Clear image after anti-aliasing and upscaling | Low | All |
| Supersampling on Ultra | Draws above screen resolution | The cleanest image for powerful PCs and screenshots | High | Ultra |
| Correct colour pipeline | Linear lighting, correct conversion to screen | Natural colours, no washed-out or overly dark scenes | None | All |
| Modern tone mapping (AgX / Khronos neutral) | Turns bright light into screen colours | Natural highlights and colours, no over-saturated sunsets | None | All |
| HDR display output | Uses HDR monitors | Brighter lights and deeper contrast on HDR screens | Low | High |
| Dithering | Prevents colour banding | Smooth skies and gradients | None | All |
| Wide colour (Display P3) | Richer colours on capable screens | More vivid, accurate colours | None | High |

[↑ Contents](#contents)

## 9. Post-processing and camera effects

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Physically based bloom | Bright lights glow naturally | Runway and cabin lights look bright, not flat | Low | All |
| Colour grading (LUTs) | A film-style colour look per scene | Distinct mood for offices, court, night flights | None | All |
| Depth of field | Background blur | Cinematic dialogues; focus on what matters | Medium | Medium |
| Bokeh | Shaped blur of lights | Beautiful night shots of airport lights | Medium | High |
| Motion blur | Blur from fast motion | Smoother feel of fast camera moves and take-off rolls | Low–Medium | High |
| Lens flare | Light artefacts from the sun | Cinematic sun shots | Low | High |
| Chromatic aberration | Slight colour fringing | Camera-like realism (subtle) | None | High |
| Vignette | Darker corners | Focus and mood | None | All |
| Film grain | Fine noise | Natural, less "computer" look; hides banding | None | Medium |
| Screen-space reflections | Reflections of what is on screen | Wet runways, glossy floors and windows reflect the world | Medium | High |
| Heat haze | Air shimmer | Hot exhausts and summer tarmac | Low | High |
| Rain on the lens / windscreen | Droplets and streaks | Weather you feel in cockpit and outside views | Low | Medium |
| Frost and condensation on windows | Cold windows | Atmosphere in winter and at altitude | Low | High |
| Camera exposure and white balance | Like a real camera | Consistent photos of indoor and outdoor scenes | None | All |
| Outline and selection effects | Clean outlines | Clear highlight of usable objects (alongside the glow) | Low | All |

[↑ Contents](#contents)

## 10. Sky, atmosphere and weather

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Physically based sky and atmosphere | Light scattering through the air | Real blue skies, sunrises, sunsets and twilight | Low | All |
| Aerial perspective | Distant things fade into the air | True sense of distance and scale from altitude | Low | All |
| Height fog | Thicker fog in valleys and low areas | Faroese fog in fjords and valleys | Low | All |
| Volumetric fog | Fog that light passes through | Light beams in fog, lit fog around airport lights | Medium–High | High |
| Sun shafts (god rays) | Visible beams of sunlight | Beams through cabin windows and clouds | Medium | High |
| Stars, moon and Milky Way | Accurate night sky | Beautiful night flights | Low | All |
| Moon light | The moon lights the ground | Night scenes that aren't just black | Low | Medium |
| Northern lights | Animated aurora | Special winter nights in the north | Low | High |
| Rain | Falling rain with splashes | Weather matches the simulator's weather | Medium | Medium |
| Snow | Falling and blowing snow | Winter operations look like winter | Medium | Medium |
| Lightning | Flashes lighting clouds and ground | Dramatic storms | Low | Medium |
| Wind-driven effects | Windsocks, grass, flags, spray | The wind the aircraft feels is visible | Low | All |
| Weather from the simulator | Uses the live weather | What you see matches what you fly | None | All |

[↑ Contents](#contents)

## 11. Clouds

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Volumetric clouds (ray-marched) | 3D clouds with real light | Clouds you fly through, lit by the sun | High | Ultra |
| Low-resolution clouds with upscaling | Clouds drawn at quarter size, rebuilt | Volumetric clouds at a fraction of the cost | Medium | High |
| Cloud layers from METAR | Cloud bases and amounts from the weather report | Realistic cloud layers at every airport | Low | All |
| Billboard cloud fields | Many flat cloud images | Good-looking clouds on phones and Low | Low | All |
| Cloud shadows and light shafts | Clouds shade the ground and let beams through | Living landscapes | Low | High |
| Cloud flying effects | Moisture, darkening and turbulence inside clouds | Feeling of flying through cloud | Low | Medium |
| Sunset-lit clouds | Clouds coloured by the sun's angle | Spectacular sunsets and sunrises | Low | All |

[↑ Contents](#contents)

## 12. Water and ocean

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| FFT ocean waves | Realistic wave patterns | A real North Atlantic around the Faroes | Medium | High |
| Gerstner waves | Simpler wave model | Good-looking sea on Medium and phones | Low | All |
| Wave height from the wind | Sea state follows the weather | Calm or rough seas match conditions | None | All |
| Foam and whitecaps | Foam on crests and along coasts | Coasts and stormy seas look right | Low | Medium |
| Shore waves and breaking surf | Waves breaking on cliffs and beaches | Dramatic Faroese coastline | Medium | High |
| Reflections on water | Sky and terrain reflected | Calm fjords mirror the mountains | Medium | Medium |
| Sun glitter | Sparkle of sunlight on the sea | Classic flying view over the sea | Low | All |
| Water colour by depth | Shallow water lighter | Natural coasts and lakes | Low | All |
| Lakes and rivers | Flat water with ripples | Correct inland water | Low | All |

[↑ Contents](#contents)

## 13. Terrain and ground

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Continuous terrain level of detail (CDLOD) | Terrain detail follows the camera smoothly | Sharp hills up close, wide views, no popping | Low | All |
| Terrain materials by slope and height | Grass, rock, scree, snow by terrain shape | Natural mountains instead of only satellite colour | Low | All |
| Satellite imagery blended with materials | Detail texture added over imagery | Sharp ground up close even with lower-resolution imagery | Low | All |
| Grass and ground cover (instanced) | Real 3D grass near the camera | Lifelike ground around the airport and on approach | Medium | High |
| Rocks and boulders | Scattered rocks on slopes | Faroese hillsides look like themselves | Low | Medium |
| Sheep and animals | Instanced animals in fields | Life in the landscape (fitting for the Faroes) | Low | High |
| Cliffs and overhangs | Extra geometry where height maps can't show cliffs | Steep sea cliffs look real | Medium | High |
| Roads and buildings from map data | Towns and roads from OpenStreetMap (ODbL, with credit) | Recognisable places around airports | Medium | Medium |
| Terrain self-shadowing | Mountains shade valleys | Deep, real landscapes at low sun | Medium | High |
| Snow cover by season and weather | Snow on high ground | Seasons visible from the air | Low | All |

[↑ Contents](#contents)

## 14. Airports and runways

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Detailed runway surfaces | Tarmac and concrete textures, joints, patches | Runways look real up close | Low | All |
| Rubber deposits and tyre marks | Darker touchdown zones | Real touch from the air and on landing | Low | All |
| Correct markings (decals) | Painted markings sharp at any distance | Correct, crisp runway and taxiway markings | Low | All |
| Edge, centreline and touchdown lights | All runway lighting systems | Night approaches like the real thing | Low | All |
| Taxiway lights and signs | Lit signs and lights | Night taxi with real guidance | Low | All |
| Stand guidance and markings | Lead-in lines and stop bars | Parking looks right | Low | All |
| Terminal and hangar buildings | Generated from map outlines with windows and doors | Each airport has its own buildings | Medium | All |
| Jet bridges | Moving jet bridges | Real gate operations | Low | Medium |
| Ground vehicles | Fuel trucks, tugs, buses, catering | Busy, living airports | Low | Medium |
| Ground crew | Marshallers, loaders (same figure system as everyone) | People at work around your aircraft | Low | Medium |
| Wet runway reflections | Lights mirrored in wet tarmac | Beautiful rainy night approaches | Medium | High |
| Snow clearing and de-icing | Ploughed runways, de-icing spray | Winter operations shown | Low | Medium |
| Fences, poles and antennas | Small airport details | Completes the scene | Low | High |

[↑ Contents](#contents)

## 15. Aircraft exterior

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Panel lines and rivets (normal maps) | Fine surface detail | Aircraft look built, not moulded | Low | All |
| Moving control surfaces | Ailerons, elevators, rudder, spoilers, flaps follow the simulator | Real aircraft behaviour seen from outside | Low | All |
| Gear animation and suspension | Gear moves and compresses | Real landings and taxi | Low | All |
| Engine fans spinning with blur | Fan speed from the simulator | Engines look alive | Low | All |
| Engine exhaust heat and smoke | Haze and start-up smoke | Realism at start and take-off | Low | High |
| Navigation, strobe, beacon, logo and landing lights | All exterior lights with correct timing | Real night appearance | Low | All |
| Wing flex | Wings bend with load | Big jets look right in turbulence and on landing | Low | High |
| Wingtip vortices and condensation | Vapour in humid air | Spectacular take-offs and landings | Low | High |
| Contrails | Trails at altitude when conditions allow | Real high-altitude look | Low | Medium |
| Reflective paint and chrome | Clear coat and reflections | Polished aircraft look | Low | Medium |
| Weathering by age | Dirt and fading by the aircraft's age in the game | Old aircraft look old; fleet age visible | Low | Medium |
| Cabin window lights at night | Lit windows from outside | Aircraft look inhabited at night | None | All |
| Rain and ice on the airframe | Wet and iced surfaces | Weather on the aircraft itself | Low | High |

[↑ Contents](#contents)

## 16. Cockpit

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Live instrument screens | Displays drawn from simulator data | A cockpit that works, not a picture | Low | All |
| Screen glow and reflections in windows | Displays reflect at night | Real night cockpit | Low | Medium |
| Backlit panels and flood lights | Panel lighting levels | Night cockpit atmosphere | Low | All |
| Switch and knob detail | Proper shapes and labels (own designs) | Close-up realism | Low | Medium |
| Windscreen rain, wipers and ice | Weather on the glass | Approaches in bad weather feel real | Low | Medium |
| Sun glare and shades | Bright sun and visors | Real light in the cockpit | Low | High |
| Head movement on landing and turbulence | Camera follows forces | Physical feeling | None | All |

[↑ Contents](#contents)

## 17. Cabin

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Baked cabin lighting | Soft ceiling and wall light | Photo-like cabin | None | Build |
| Seat fabric, leather and stitching | Real materials per class | Business and economy look different and real | Low | All |
| Carpet patterns (own designs) | Textured aisle carpet | Finished cabin | Low | All |
| Window light that follows the sun | Sun patches move as the aircraft turns | Living cabin | Low | Medium |
| Window shades opened and closed | Passengers use the shades | Realism; lighting changes | Low | Medium |
| Seat-back screens | Live moving map and content | Modern cabin | Low | Medium |
| Galley detail | Trolleys, ovens, coffee makers | Crew service looks real | Low | Medium |
| Overhead bin open and close | Animated bins | Boarding and disembarking scenes | Low | Medium |
| Cabin mood lighting | Colour scenes by flight phase | Like modern cabins | None | All |
| Cabin shake in turbulence | Objects and people move | You feel the flight | None | All |

[↑ Contents](#contents)

## 18. People

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Skin shading | Subsurface light, pores (normal maps) | Lifelike faces in dialogue | Low | Medium |
| Eyes with depth | Refraction, wet highlight, eye contact | People feel present | Low | Medium |
| Hair cards | Strands drawn as textured layers | Real-looking hair instead of solid shapes | Medium | High |
| Cloth wrinkles and folds | Normal maps and simple cloth movement | Uniforms and clothes look worn | Low | Medium |
| Facial expressions | Smiles, frowns, blinks (with the mouth movement we have) | Emotion in dialogue | Low | Medium |
| Eye and head tracking | People look at you or at what they talk about | Natural conversations | None | All |
| Animation blending | Smooth moves between walking, standing, sitting | No sudden pose changes | None | All |
| Foot placement (inverse kinematics) | Feet stay on floors and steps | No sliding or floating feet | Low | Medium |
| Hand placement | Hands hold cups, trays, handles properly | Service and office actions look real | Low | Medium |
| Crowd variety | Many looks from one figure system | Every passenger different | None | All |
| Crowd level of detail | Simpler far figures | Full cabins and terminals at good speed | Gain | All |

[↑ Contents](#contents)

## 19. Offices and courtroom

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Baked interior lighting | Soft bounced light | Photo-like rooms | None | Build |
| Window views | Live outdoor view with the real time of day | Rooms feel part of the world | Low | All |
| Glass, monitor and desk reflections | Reflection probes | Glossy surfaces look right | Low | All |
| Wood, leather, fabric and paper materials | Scanned textures | Rich, real materials | Low | All |
| Small props | Pens, mugs, plants, cables, papers | Rooms feel used and lived in | Low | Medium |
| Dust in the light | Particles in sunbeams | Atmosphere | Low | High |
| Live screens | The office monitors show the game's real data | Everything in the room works | Low | All |
| Ambient occlusion and contact shadows | Darkening where things meet | Furniture stands on the floor, not on it | Low | Medium |

[↑ Contents](#contents)

## 20. Night and lights

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Real light intensities at night | Correct brightness of every light | Night scenes like photos | None | All |
| Light halos and glare | Glow around bright lights in the air | Lights look bright, especially in fog and rain | Low | All |
| Town lights from the air | Lights from map data | Night flights over lit towns | Low | All |
| Lit windows in buildings | Random lit windows | Living towns and terminals at night | None | All |
| Light pools on the ground | Floodlights light the apron | Real night aprons | Low | Medium |
| Approach light sequence | Rabbit strobes and sequences | Real night approach (we have the lights; sequencing improves them) | None | All |
| Night adaptation | Darker but readable scenes | Night is dark but you can still see | None | All |

[↑ Contents](#contents)

## 21. Particles and effects

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| GPU particles | Particles calculated on the graphics card | Thousands of particles for spray, smoke, snow at low cost | Gain | Medium |
| Soft particles | Particles fade where they touch surfaces | No hard edges in smoke and fog | Low | All |
| Lit particles | Particles receive light and shadow | Smoke and steam that belong in the scene | Low | High |
| Touchdown tyre smoke | Smoke at touchdown from the landing rate | Landings look and feel real | Low | All |
| Spray from wet runways | Water thrown up by wheels and engines | Wet operations | Low | Medium |
| Engine start and exhaust | Smoke and heat at start | Realism | Low | Medium |
| De-icing spray | Fluid spray | Winter operations | Low | Medium |
| Coffee steam and cabin service details | Small effects | Life in the cabin | None | High |
| Birds | Flocks around the coast and airport | Living world (puffins and gulls on the Faroes) | Low | Medium |

[↑ Contents](#contents)

## 22. Animation and motion

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Smooth interpolation of simulator data | Positions blended between updates | Aircraft move smoothly at any frame rate | None | All |
| Physically based camera motion | Camera with weight and inertia | Cinematic, natural camera moves | None | All |
| Doors, stairs and hatches | Animated aircraft parts | Real boarding and service | Low | All |
| Ground vehicle movement | Vehicles drive on taxi lanes | Busy airport | Low | Medium |
| Flags, windsocks and trees in the wind | Movement from wind data | Living scenes | Low | All |
| Fade-in of new objects | Level of detail and new objects fade (as we do now) | No popping | None | All |

[↑ Contents](#contents)

## 23. Cameras and views

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Cinematic camera paths | Pre-made camera moves for take-off and landing | Movie-like replays | None | All |
| Tower and spotter views with zoom lens | Long-lens look, compressed depth | Realistic spotter shots | None | All |
| Camera shake by events | Shake on touchdown, turbulence, engines | Physical feel | None | All |
| Replays | Record and play back a flight | Watch your landing again from any camera | Low | All |
| Picture-in-picture | A second camera in a small window | Watch outside while in the office or cockpit | Medium | High |
| Smooth transitions between views | Camera blends, not cuts | Polished feel | None | All |

[↑ Contents](#contents)

## 24. Photo mode and cinematics

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Photo mode | Pause, free camera, adjust focus, exposure and filters | Players make and share beautiful pictures | None | All |
| Path-traced photos | A still rendered with full ray tracing (open-source path tracer) | Near-film-quality pictures | Seconds per picture | All (PC) |
| High-resolution screenshots | Pictures larger than the screen | Wallpapers and marketing images | None | All |
| Cinematic letterbox and grading | Film looks | Trailers and replays | None | All |
| Video recording of replays | Record in the browser | Sharing flights | Low | High |

[↑ Contents](#contents)

## 25. Settings, scaling and hardware

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Automatic quality choice | Picks Low to Ultra from the graphics card | Good look out of the box on every PC | None | All |
| Per-effect settings | Each effect switchable | Players fine-tune look against speed | None | All |
| Frame-rate target | Target 30, 60, 120 fps; quality adjusts | Steady performance | None | All |
| Battery and heat saving (phones) | Lower settings when hot or on battery | Longer play on phones | Gain | All |
| Performance overlay | Frame time, draws, memory on screen | Players and testing see what costs what | None | All |
| Benchmark scene | A fixed flight to compare settings | Players choose settings with real numbers | None | All |
| Separate settings per view | Different quality for office, cabin and 3D view | Best look where it matters | None | All |

[↑ Contents](#contents)

## 26. Phones and tablets (Android)

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Mobile-friendly texture formats (ASTC / ETC2 via KTX2) | Compressed textures phones understand | Less memory, faster, cooler phones | Gain | All |
| Baked lighting first | Live effects replaced by baked ones | Rich look at low cost | Gain | All |
| Half-resolution effects | Effects drawn smaller | Effects on phones at all | Gain | All |
| Lower draw counts | Instancing and merging | Smooth on mid-range phones | Gain | All |
| Thermal-aware quality | Lowers quality when the phone gets hot | No throttling slowdowns | Gain | All |

[↑ Contents](#contents)

## 27. Tools for making the game

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Automatic screenshot tests | Pictures of every scene after each change | Graphics never break unnoticed | None | Dev |
| Performance tests in the build | Fails the build if a scene gets too slow | Performance stays good release after release | None | Dev |
| Lightmap baking in the build | Lighting calculated when the game is built | Baked lighting always up to date | None | Dev |
| Texture compression in the build | Textures converted automatically | Small downloads, fast loading | None | Dev |
| Material preview scene | All materials side by side | Faster tuning of the look | None | Dev |
| In-game graphics debug view | Shows lighting, normals, overdraw, AO alone | Faster finding of problems | None | Dev |

[↑ Contents](#contents)

## 28. Our own browser engine (Electron) and native add-ons

Today the PC version runs in the Microsoft Edge already installed on Windows, so the game depends on the player's Edge version and settings. With **Electron** (MIT licence) the game ships its own fixed copy of Chromium, and the PC bridge (simulator link, files, installer) runs in the same program. Small **native add-ons** (our own C++ code the game can call) open features browsers don't offer. PC only: Android keeps using the phone's WebView and gets the normal versions of the effects.

| Improvement | What it does | Benefit | Cost | Tier |
|---|---|---|---|---|
| Own fixed Chromium (Electron) | The game brings its own browser engine | The same engine on every PC; an Edge update can't break or slow the graphics; every effect tested on exactly what players run | About +100 MB download | All (PC) |
| Newest WebGPU, chosen by us | Update Chromium when we decide | New graphics features without waiting for the player's Edge | None | All (PC) |
| WebGPU subgroups | Faster shader maths across groups of pixels | Ambient occlusion, clouds, particles and culling run faster | Gain | All (PC) |
| WebGPU timestamp queries | Exact time per effect on the graphics card | Every effect tuned to a real budget; better automatic quality choice | None | Dev / All |
| Float32 filtering and higher-precision formats | More precise textures and filtering | Cleaner HDR lighting, sky, volumetric fog and clouds, less banding | Low | High |
| Raised WebGPU limits | Bigger textures, buffers and more bindings | Larger airports, more lights and textures at once | None | High |
| No background throttling | Full speed when the window isn't in focus | No slowdown when another window is on top; replays and recording keep running | None | All (PC) |
| Unlocked frame rate | Above the monitor's rate when wanted | Lowest input delay on high-refresh monitors; benchmark numbers | Varies | High |
| Larger memory limits | More memory for 3D than a normal browser tab | Ultra textures and big scenes without reloads | None | High |
| One program instead of bridge + Edge | Bridge and game in one process | Simpler install, faster start, fewer moving parts; data passed directly instead of over a local network port | Gain | All (PC) |
| AMD FSR 2 / 3 upscaling and frame generation (MIT) | Native upscaler and frame generation | Ultra effects at a much higher frame rate on any graphics card | Gain | All (PC) |
| NVIDIA DLSS (native add-on) | AI-based upscaling on RTX cards | Sharpest upscaled image on RTX cards (needs NVIDIA's licence terms checked) | Gain | High |
| Hybrid ray tracing (DirectX 12 add-on) | Ray-traced reflections, shadows or bounced light handed to our renderer | Real ray-traced effects on RTX and Radeon RX 6000+ cards; the hardest item (images must be shared between the add-on and Chromium) | High | Ultra |
| GPU path-traced photo mode (native) | Photo mode traced on the graphics card itself | Film-quality pictures in seconds instead of minutes | Seconds per picture | All (PC) |
| HDR output and exclusive full screen | Direct HDR and full-screen control | Brighter lights, deeper contrast, lower input delay | None | High |
| Full PS5 controller features (native HID) | Rumble, adaptive triggers, light bar | Feel the runway, the brakes and turbulence (not graphics, but comes with the same add-on system) | None | All (PC) |
| Shader cache on disk | Prepared shaders kept between runs | Faster starts, no first-time stutter | None | All (PC) |
| GPU crash recovery and logs | Restores the 3D view after a driver reset, writes an error code | Fewer lost sessions; problems reported in the error log | None | All (PC) |

**Not worth it:** maintaining our own modified Chromium (open source, BSD licence). It takes tens of gigabytes and hours to build and needs constant security updates; Electron with native add-ons gives almost all of the benefit.

**Costs and limits:** about 100 MB larger PC download; Electron has to be updated now and then for security; Android doesn't get these extras.

**Order:** move the PC version to Electron (medium job; the PC bridge is already Node, which Electron includes), which brings the WebGPU features and removes the browser limits; then FSR; then the native ray-tracing pieces last.

[↑ Contents](#contents)

## Suggested order

1. **Foundations (speed first):** move the PC version to its own Chromium (Electron), update three.js, WebGPU with fallback, instancing, compressed textures, culling, performance overlay. This frees the performance the later steps use.
2. **The biggest visible jump:** ambient occlusion, TAA, baked lighting in the offices, court and cabin, real textures, modern tone mapping, bloom and colour grading.
3. **The world outside:** physical sky and atmosphere, cascaded and soft shadows, terrain materials, runway detail, night lighting.
4. **People:** skin shading, eyes, hair cards, expressions, foot and hand placement.
5. **Weather and water:** rain, snow, fog, ocean, clouds.
6. **Ultra and extras:** volumetric clouds and light, screen-space global illumination, photo mode with path tracing, FSR upscaling and hybrid ray tracing through native add-ons (PC).

Each step comes with before-and-after screenshots and frame-time measurements, and phones get the lighter versions.

This is planning information. Licences of any outside material are checked before use.
