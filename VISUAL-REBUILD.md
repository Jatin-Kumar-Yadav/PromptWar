# Original visual rebuild

The supplied images guide composition, warm/cool lighting, interior detail and shoulder framing. This implementation is original stylized art; it does not reproduce their characters, locations, or photorealistic production quality.

## Implemented

- Bundled GLB survivor, articulated infected, four boss silhouettes, pistol, herb, cartridge box and cabinet. Source generator: `node scripts/create-art.mjs`. License: `public/models/LICENSE.txt`. All assets are original; no externally hosted runtime assets or uncertain third-party licenses.
- Procedural walking/running limb motion, bent elbows, raised aiming arms, reload pose, recoil, muzzle flash, stagger and brief death collapse. These are articulated node animations, not motion-captured or skeletal animation clips.
- Repeating wood/plaster/fabric/paper textures, ceilings, paneling, framed art, lamps, living-room mantle/table/rug, server cabinets, physical notes and inspectable code documents.
- Static geometry batching, distance-limited actor rendering, shared GLB geometry/materials, removal of twelve pickup lights, and low/medium/high pixel-density presets. Context-menu handlers now clean up correctly and aiming resets when paused.
- All existing mailbox mappings, guarded email operations, puzzles and checkpoints are retained. Death timing is additive save metadata; older saves remain valid.

## Measurements

Short 960×640 Chromium **software SwiftShader** samples: previous committed scene about 1.6 FPS / 152 draw calls; rebuild samples ranged from 2.4 to 3.5 FPS / 188 draw calls / about 29k triangles. The new models add geometry while batching and lower default pixel density reduce other costs. These noisy five-second samples are diagnostic only: they do not establish 30/60 FPS, GPU laptop performance, or a stable memory plateau. `node scripts/visual-check.mjs` records a fresh scene sample and screenshot; `GAME_URL` selects another running server.

Validation: production build and all 17 logic tests passed. Browser checks passed movement, body shots, headshots, ammo/reload/herbs, all three puzzle UIs, mailbox audit, refresh/Continue, final-boss victory, JSON report download, corrupted-save preservation, and no runtime errors or external requests. Browser tests use isolated fixtures; they are not an unassisted full-house playthrough.

## Remaining limitations

The art remains stylized and procedural. Full skeletal/IK animation, photorealistic human assets, animated hinged doors/sliding drawers, sophisticated obstacle navigation and spatial audio are not implemented. Some environmental decoration is nonblocking to preserve existing puzzle routes. The renderer still needs real-hardware profiling before performance targets can be claimed.

## Run and review

`npm ci`, `npm run dev`; hold right mouse to aim and left mouse to fire. Graphics presets are under Settings. `npm run build` checks TypeScript and bundles production assets. `npm test` runs the game/email logic suite. With Vite running, `npm run test:browser` exercises combat, puzzles and persistence. Set `GAME_URL` to a different dev-server origin if necessary.
