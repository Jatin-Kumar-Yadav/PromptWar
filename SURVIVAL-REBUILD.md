# Survival gameplay pass

This is a playable improvement to the existing game, not completion of the supplied AAA visual target. It preserves the existing 220-message sandbox, immutable originals, disjoint enemy batches, four boss operations, three puzzles, export and version-1 saves.

## Changes

- `GameScene.tsx`, `LicensedActor.tsx`: close 51-degree aiming view, hold RMB, Q shoulder swap, semi-automatic firing, camera recoil, accelerated movement and smoothed rendering. Separate head/body hitboxes now follow animated bones. Static enemy membership avoids React frame renders; HUD updates at 10 Hz.
- `systems.ts`, `navigation.ts`, `world.ts`: circular footprint with corner clearance, swept collision, exact segment sight checks, cached walkability grids and pursuit waypoints at 5 Hz. Gunshots alert nearby enemies. Up to three normals pursue, at most four normals and one boss render nearby. Bosses retain their existing categories: Brute heavy swing, Hoarder calls an existing infected, Collector telegraphed charge with collision recovery, Tyrant warning ring and area strike. Calling uses existing enemies, never duplicate email rewards.
- `ArchiveDetails.tsx`, `materials.ts`: original reception counter, columns, tile inlay, institutional signage, warm/cool lighting. Fixed zero-opacity imported FBX furniture. Shared material treatments and batched static geometry. One shadow light; low quality disables shadows.
- `InteractiveDrawers.tsx`, `Supplies.tsx`: sliding trays fitted to cabinets after puzzle unlock; original MORROW ammunition packaging with cartridges; licensed potted plant herb model. Existing email pickup effects and quantities are preserved.
- `CombatEffects.tsx`, `audio.ts`: bounded impact particles, headshot sound, filtered gunshot/noise layers, footsteps, spatial groans, boss roar, door and drawer sounds.
- `PerformanceProbe.tsx`: adaptive pixel ratio (0.55 to selected preset cap), measured over three-second windows. F3 shows diagnostics.
- New locally bundled Quaternius Animated Zombie Pack model (about 647 KiB), texture and six authored clips. See `public/assets/quaternius/AnimatedZombie-LICENSE.md` and manifest hashes. No runtime asset downloads. Two normal variants use this model, the third and bosses retain the prior kit models. The new pack lacks death/hit clips; these use procedural reactions.

## Validation

`npm install`, TypeScript/production build and automated test files passed. Added checks cover navigation through reception, corner clearance, charge tunnelling, sprint suppression while aiming, boss recovery, wall-blocked damage, checkpoint reset and asset integrity. The browser suite passed actual pointer-lock movement, skeleton-aligned body/head shooting, reload, pickups, three puzzle UIs, mailbox audit, refresh/Continue, final boss raycasts, victory export, corrupt-save protection and no browser exceptions or external requests. These controlled fixtures are not an unassisted 15–20 minute campaign playthrough.

At 960×640, a short Chromium SwiftShader sample after the asset switch reported 77 draw calls, about 36.7k triangles and 6.1 FPS; the earlier scene sample was 103 calls and 3.7 FPS. Adaptive resolution, scene content and software-renderer load differ, so these figures do not prove a fixed percentage speedup or 30–60 FPS on real hardware. Use F3 on the target laptop. No long-duration memory soak was performed. Vite still warns about large vendor chunks.

The final capture after removing floating door labels measured 73 calls, 36,642 triangles and 6.2 software-rendered FPS with no page errors. Review [reception](docs/screenshots/reception.png) and [aiming](docs/screenshots/aiming.png) screenshots before judging the visual result. All 27 test cases across four files pass.

## Remaining work

The visuals remain low-poly/stylized and fall well short of the reference images. Photorealistic character art, detailed facial rigs, dedicated reload/damage clips, exact two-hand IK/foot planting, full cinematic boss introductions and a richer inventory/document presentation remain unfinished. Normal variants partly share one mesh. Some decorative shapes remain procedural. Drawer trays are fitted additions to the authored static cabinet, not separate pieces supplied by its author. The Hoarder recruits an existing living enemy; if none is available it does not create a replacement. Existing boss names/categories and room progression intentionally remain compatible with saves.

## Run and review

`npm ci` then `npm run dev`; open the Vite URL. New game → Enter house. Hold RMB to aim, click LMB per shot, R reload, E interact, F herb, Q shoulder, Tab inventory, M map, Esc pause.

Review branch `feat/survival-combat-rebuild`. Merge through GitHub after reviewing the diff and testing on your laptop. To run it before merging: `git fetch origin`, `git switch --track origin/feat/survival-combat-rebuild`, `npm ci`, `npm run dev`. No cloud environment publication is required.
