# Modding guide

Mods replace the game's own models, pictures and sounds. They never change the game's files: the game keeps
them apart and uses them while they are switched on. Mods hold no code: only models (`.glb`), pictures
(`.png`, `.jpg`, `.webp`) and sounds (`.ogg`, `.mp3`, `.wav`). Anything else is refused when you install.

## The Mod Manager

Open it from the start screen: **Mods**. It has four tabs:

- **Installed**: your mods, in load order.
  - Switch each one on or off, drag to reorder, or turn all mods off at once.
  - Mark favourites and rate them.
  - Sort by load order, newest, recently updated, name, author, size, category, most downloaded or rating.
  - Filter by category, on/off, conflicts, updates, made for this version, official or community, and favourites.
  - Search by name, author or slot ID.
- **Browse**: mods to get. For now this is demo content, marked **Demo**: it shows how mods work but has no files.
- **Slots**: every replaceable thing, with its slot ID, file type, limits, scale and front direction, and which mod
  (if any) replaces it now.
- **Co-op**: when you fly in co-op, it compares your mods with your partners'. It shows "You both have…", "Your
  partner has a mod you don't" and "Only you have". Mods only change how things look on your own device, so you can
  fly together with different mods.

Each mod's details page shows:
- its description, screenshots and author
- its version and the game version it was made for
- its size, date and changelog
- what it needs (dependencies)
- the slot IDs it replaces, each with **Preview**: the game's own model beside the replacement, turning

Other tools:
- **Profiles** save which mods are on, and their order, under a name.
- **Undo** steps back through your last 20 changes.
- **Health check** finds:
  - missing files
  - slots no longer in the game
  - mods made for another game version
  - missing or switched-off dependencies
  - conflicts

### Conflicts

When two switched-on mods replace the same slot, the one lower in the load order is used. To change that, open
either mod's details and choose **Use this one** for that slot.

## Installing

- **PC:** put `.zip` packages in `Documents\Airline Manager Pro\Mods`. New and changed ones are installed each time
  the Mod Manager opens (**Mods folder** opens that folder). Or use **Install a .zip**.
- **Phone:** **Open a .zip** and pick the package.

A newer version of a mod you have (same `id`) replaces the old one and keeps its place and its on/off setting.

## Making a mod

A mod is a `.zip` with `mod.json` at the top (or inside a single folder), and the files it names:

```json
{
  "id": "nordic-ramp-trucks",
  "name": "Nordic ramp trucks",
  "author": "Your name",
  "version": "1.0.0",
  "game": "0.9.154",
  "category": "vehicles",
  "description": "What it is.",
  "files": {
    "vehicles/fuel-truck": "fuel-truck.glb",
    "vehicles/catering-truck": "catering-truck.glb"
  },
  "depends": [],
  "changelog": ["1.0.0: first version"],
  "screenshots": ["shot-1.jpg"]
}
```

| Field | What it is |
|---|---|
| `id` | Never changes between versions. 3 to 64 small letters, digits, dots or dashes. |
| `version` | Like 1.0.0. A higher version replaces the lower one. |
| `game` | The game version you made it with. Older versions of the same series are accepted (with a note). |
| `category` | aircraft, helicopters, vehicles, people, buildings, props, items, security or effects. |
| `files` | Slot ID → file in the package. The slot IDs are listed in the Mod Manager's **Slots** tab and in `www/models/README.md`. |
| `depends` | Other mods' `id`s this one needs. |
| `screenshots` | Up to 6 pictures (each under 2 MB) shown on the details page. |

### What each kind of slot must be

| Kind | File | Limit | Scale and front |
|---|---|---|---|
| Aircraft | .glb | 40 MB, 300,000 triangles | Metres, real size; nose towards +Z |
| Helicopters | .glb | 30 MB, 200,000 triangles | Metres, real size; nose towards +Z |
| Vehicles | .glb | 15 MB, 100,000 triangles | Metres; front towards +Z, wheels on the ground |
| People | .glb | 20 MB, 80,000 triangles | Fitted to each person's height; facing +Z; `Idle` and `Walk` clips and a `jaw` bone are used |
| Buildings | .glb | 60 MB, 400,000 triangles | Metres; doors towards +Z |
| Props and furniture | .glb | 5 MB, 30,000 triangles | Metres, standing on the floor; front towards +Z |
| Items | .glb | 2 MB, 10,000 triangles | Metres; label towards +Z |
| Security | .glb | 3 MB, 15,000 triangles | Metres; towards +Z |
| Effects | .png | 4 MB | Up to 2048 × 2048, transparent background |

Pack everything into the `.glb`: textures must be inside it, not separate files it points to.
Each model is fitted to the size of the game's own, so a slightly different size still fits.
