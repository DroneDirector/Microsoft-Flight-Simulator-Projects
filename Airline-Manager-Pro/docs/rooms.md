# The rooms: where everything is

A guide for changing the 3D rooms. Say which room and what should change ("in the Operations room, make the
monitor bigger"); this says where that lives. Every room is built by its own builder in its own file, and the
same builder makes it whether you are in the joined building or in the room on its own.

## The joined building (`src/screens/testrooms.ts`)
Your office and the Operations office off a staff corridor, a door onto the concourse, your hub's lounge at the far
end of it. The game's Office, Operations and Lounge buttons open it straight at your chair (Settings → Graphics →
"Walk between your rooms" turns it off). The stress test uses it too.

| What | Where |
|---|---|
| The layout: where each room, the corridor, the concourse and the doors are (metres) | `TR_L` |
| Placing the rooms in the building, their doorways cut in their walls | `trOffice`, `trOps`, `trLounge`, `trCut` |
| The corridor: floor, walls, rail, lights, the rooms to come (Crew room, Training room) and their signs | `trHalls` (first half) |
| The door from the corridor to the concourse and its sign | `trHalls` ("the door at the end of the corridor") |
| The concourse: floor, slatted ceiling, glass wall and the apron beyond, shops, moving walkways, seats, plants, overhead signs | `trHalls` (second half) |
| The lounge's entrance from the concourse: its name over the doors, its sign | `trHalls` ("the lounge's entrance seen from the concourse") |
| Walking between the rooms, doors opening and shutting, the hand-over from room to corridor | `trHost`, `trEnter`, `trRoomFrame`, `trWalk` |
| Leaving the building | `trLeaveBuilding` |

## Your office (`src/screens/office3d.ts`, builder `ofBuild`)
| What | Where in `ofBuild` |
|---|---|
| The room's size, floor, rug, ceiling, walls and panelling | "the room", "walls" |
| The big window over the airport | "the big window over the airport" (the view: `ofView`) |
| The door to the corridor | "the door (left wall…)" |
| The desk, the lamp, things on the desk, your nameplate, the aircraft model | "the desk", "the banker's lamp", "things on the desk", "your nameplate", "a model of one of your aircraft" |
| The laptop (keys, screen, lid) | `ofLaptop3d`; what its screen shows: `ofLaptop` |
| Your phone | "your phone, lying on the desk" |
| The family photo | `ofFamilyPhoto` |
| Your chair, the visitor's chair | "your chair", "the visitor's chair" |
| Bookshelves, route map, posters, propeller, credenza, globe, trophies | "bookshelves…", "a wooden propeller…" |
| The sofa and low table, the plant | "a leather sofa…" (the sofa is `props/sofa-2`, the plant `props/plant-1`) |
| Your pet, its bed, ball and bowls | `petPlace` in `src/screens/pet3d.ts` |
| Ceiling lights | "ceiling lights" |
| A visitor walking in and sitting down, the interview | `ofVisitor`, `ofEnter`, `ofFrame` |

## The Operations office (`src/screens/ops3d.ts`, builder `opsBuild`)
| What | Where in `opsBuild` |
|---|---|
| The room's size, floor, walls, acoustic panels | "the room", "acoustic panels" |
| The route map on the wall, the clock | "the route network…", "the clock over the desk" |
| The desk, the curved monitor, keyboard and mouse | "the desk", "the ultra-wide monitor", "the keyboard" |
| What the monitor shows (departures and timeline) | `opsMonitorDraw` |
| The computer screens you open at the monitor | `opsScreenOpen` |
| Archive folders, coffee cup, your phone | "archive folders…", "your phone" |
| Your chair | "the fancy chair" |
| The archive rack | "the archive rack" |
| The door to the corridor | "the door" |
| The plant | "a plant in the corner" (`props/plant-2`) |
| The lights | "the lights" |

## The lounges (`src/screens/lounge3d.ts`, builder `lgBuild`; lights `lgLights`)
Three levels: Lounge, Business lounge, Flagship lounge ("materials by level" sets their look).
| What | Where in `lgBuild` |
|---|---|
| Floor, walls, ceiling, carpet | "floor, walls, ceiling" |
| The window wall onto the apron | "the window wall onto the apron" |
| The way in: sliding doors (`props/door-2`), reception desk | "the way in" |
| Armchairs round coffee tables (`props/armchair-1…3`), sofas (`props/sofa-1…3`), floor lamps, plants | "seating", "a sofa against each side wall" |
| The refreshment corner: counter, coffee machine (`props/coffee-machine-1`), tea urn, cups, fruit, the fridge | "the refreshment corner" |
| Magazine rack, departures screen | "a magazine rack…" (the list on it: `lgDepartures`) |
| The bar (Business and Flagship) | "Business and Flagship: the bar" |
| Fireplace, piano, art, champagne (Flagship) | "Flagship: a fireplace…" |
| Guests (your real passengers), what they do | `lgGuests`, `lgGuestStep` |
| Ordering coffee, holding and putting down cups | `lgPour`, `lgPickCup`, `lgPutCup` |

## The hangars (`src/screens/hangar3d.ts`, builder `hgBuild`, rooms `hgRooms`)
The building, the aircraft, equipment, the maintenance office and the break room (doors `props/door-1`, signs
`props/room-sign`, coffee machine `props/coffee-machine-1`), the vending machine.

## Furniture shared by the rooms (`src/graphics/props.ts`)
Plants, sofas, armchairs, the coffee machine, the doors and the room signs, each a model file of its own in
`www/models/props/` (see `www/models/README.md`).
