# Licensed asset integration

This records the earlier asset-integration milestone. See [the subsequent survival pass](SURVIVAL-REBUILD.md) for the additional Animated Zombie Pack, movement/AI changes, drawer trays, supply models and current validation.

This branch replaces the active generated humanoid visuals with externally authored Quaternius models. It is a **stylized animated asset milestone**, not completion of every item in the larger photorealistic rebuild brief.

## Sources and licenses

- [Zombie Apocalypse Kit](https://quaternius.com/packs/zombieapocalypsekit.html): survivor, three infected variants, four distinct model choices for existing bosses, pistol, couch, chest and utility props. The official pack page declares CC0-1.0. Its included `License.txt` also declares CC0 but has a copied “Ultimate Platformer Pack” heading; the original file is retained verbatim and this discrepancy is recorded in the manifest.
- [Ultimate Home Interior](https://quaternius.com/packs/ultimatehomeinterior.html): door, drawer/cabinet, bookshelf and bed. Official pack page and bundled license declare CC0-1.0.
- [Furniture Pack](https://quaternius.com/packs/furniture.html): table, chair, lamp, plant and coffee table. The official pack page declares CC0-1.0.

Author: **Quaternius**. Selected assets, not all publisher content, were assessed under these pack-specific CC0 declarations. No Capcom models, animation or audio is included. The current general publisher license is not assumed to apply to every historic pack.

`public/assets/quaternius/manifest.json` records source IDs, source pages, content hashes, file sizes and actual clip names. Runtime assets are local GLBs with embedded buffers/textures; there are no runtime asset downloads. `License.txt` and `HomeInterior-License.txt` preserve supplied license records.

## Implementation

- `src/game/LicensedActor.tsx`: independent cloned skeletons and mixers; crossfades between authored idle/walk/run/gun-ready/attack/hit/death clips. The player uses bone adjustments for precise aiming and a licensed pistol attached to the right forearm/hand chain. Four boss roles use different source models rather than four copies of one mesh.
- `src/game/Art.tsx`: licensed static furniture fitted to collision dimensions; compatible geometry/material batching. Existing procedural surfaces and minor decorative details remain.
- `src/game/LicensedDoors.tsx`: licensed door models swing open when an unlocked doorway is approached. Existing key and puzzle gates still control access.
- `src/game/PerformanceProbe.tsx`: F3 toggles an FPS/frame-time/draw-call/triangle/active-enemy/resource overlay. It updates DOM text twice per second rather than causing React frame renders.
- `safePosition` keeps old saves usable if their saved position is occupied by newly placed furniture.
- `tests/assets.test.ts`: validates GLB structure, embedded resources, hashes, skeletons and required authored animation clips, plus recovery from old saved positions under new furniture.

The email action engine is unchanged. Original enemy mappings, all four boss operations, puzzle progression, audit history and sandbox persistence are retained.

## Reproduce assets

The bundled GLBs run without Blender, network credentials or a paid service. To refresh assets from the publisher, use the configured download access:

```sh
node scripts/import-quaternius.mjs
node scripts/import-furniture.mjs
```

The second script requires Blender in PATH to convert selected static FBXs. Run both in that order, since the first creates the base manifest. The importer records hashes; upstream publisher changes require another license and visual review. FBX inspection/conversion is in `scripts/convert-quaternius.py`; only native kit glTF clips are used for the active characters, so their full clip sets are retained.

## Validation and limits

Production build and all 20 tests passed. The uninterrupted browser suite passed aimed shooting, body/head damage, ammo and herb collection, reload, all three puzzle UIs, mailbox audit, refresh/Continue, final-boss victory, actual JSON report download, corrupt-save protection and no browser runtime errors or external asset requests. A later render check after skeleton-resource cleanup also completed without errors (103 draw calls, about 43k triangles in that sample).

The art is coherent stylized low-poly, with exaggerated faces; it does not match the supplied references' realism. The kit lacks a dedicated reload clip, so reloading uses a gun-ready pose with a procedural arm adjustment. Exact two-hand IK, foot planting, advanced navigation, new boss attack mechanics, sliding drawer fronts and the complete proposed inventory/puzzle redesign remain unfinished. Older generated props remain for herbs/ammo and minor decoration. Boss identities and email categories retain the existing game design.

An initial 960×640 software-Chromium scene sample reported 97 draw calls, about 39k triangles and 4.2 FPS. The earlier procedural model scene had 188 calls; sampling conditions and CPU load vary. These are diagnostic software-renderer figures, not proof of 30–60 FPS on a laptop, stable long-run memory, or full hardware acceptance. Use F3 on the target computer.

Run `npm ci`, `npm run dev`, `npm run build`, and `npm test`. With Vite on port 5173, `npm run test:browser` drives aimed shooting, headshots, pickups, puzzles, email auditing, save restoration and victory. `GAME_URL` selects another dev-server origin. Browser fixtures are isolated encounter checks; the suite is not an unassisted entire-house playthrough.
