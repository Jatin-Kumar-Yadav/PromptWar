# INBOX EVIL: The Infected Inbox

The current character and furniture pipeline uses locally bundled, CC0 Quaternius assets with authored skeletal clips. See [asset sources, license records, validation and remaining limitations](ASSET-INTEGRATION.md). Press **F3** in the game for the developer performance overlay.

The latest [survival gameplay pass](SURVIVAL-REBUILD.md) adds closer shoulder aiming, animated-bone hitboxes, obstacle-aware pursuit, boss specials, reception dressing, drawers, and adaptive resolution. It remains a stylized browser game; it does not match the supplied AAA reference imagery.

A desktop browser survival-horror game about restoring an infected **mock** inbox. Explore a procedural, six-room house, fight infected messages, solve organization puzzles, and inspect every simulated email change.

**No Gmail integration, authentication, backend, or real email access.** All 220 messages are fictional. Gameplay and mailbox data stay in this browser's localStorage. No model is trained through play.

## Run locally

Use Node.js 22.12+ or 24 LTS and npm. From the repository root:

```sh
npm install
npm run dev
```

Open the address printed by Vite in your own browser. Use a desktop browser with WebGL, keyboard, and mouse. Click **New game → Enter house** to capture the mouse. Escape releases it and pauses the game.

```sh
npm run build
npm run preview
npm test
```

`build` runs strict TypeScript checking and produces `dist/`. `preview` serves that build. Subsequent dependency installs can use `npm ci` with the committed lockfile. No environment variables or external services are needed.

## Controls

| Input         | Action                          |
| ------------- | ------------------------------- |
| W / A / S / D | Move relative to camera         |
| Mouse         | Camera / aim                    |
| Right mouse   | Hold to aim                    |
| Left mouse    | Fire one round per press       |
| Q             | Switch camera shoulder         |
| R             | Reload                          |
| E             | Collect nearby cache / interact |
| F             | Consume herb                    |
| Shift         | Sprint                          |
| Tab           | Inventory                       |
| M             | House map                       |
| Escape        | Pause / release mouse           |

Three body shots or one headshot eliminate a normal infected. Bosses have 24–30 HP; headshots deal 3 damage. Raised arms and HUD warnings telegraph attacks. Retreat from a swing, sidestep a charge, or leave the Tyrant's marked area. You have three health points, 1.5 seconds of damage immunity, and regenerate one point per eight undamaged **game** seconds. Pausing stops the game clock.

## Mission route (spoilers)

1. **Entrance Hall:** collect faculty ammunition and a herb with E. The emergency terminal near the northwest desk replenishes ammo if total rounds fall below 36, preventing an ammunition dead end. Its associated email reward occurs once.
2. **Living Room:** defeat the Spam Brute and read the note by the sofa. Open the drawer with **314**. Both are needed to unlock the Study.
3. **Study:** defeat the Newsletter Hoarder. Interact with the classification board and assign all six cards correctly. Drag cards onto categories, or click a card and then its category. This unlocks the Bedroom.
4. **Backtrack through the Living Room and Hall** to the south passage into the Bedroom. Inspect the three indexed digits in the southeast drawers; the safe code is **726**. The safe unlocks Storage.
5. **Storage:** defeat the Duplicate Collector. It preserves the canonical message and trashes only the 19 redundant copies. Defeating the first three bosses opens the final chamber.
6. **Final Boss Room:** defeat the Trash Tyrant to complete the mission and review/download the cleanup report.

Boss kills and puzzle solutions establish checkpoints. Restarting restores health and emergency ammunition while retaining confirmed email actions, solved puzzles, pickups, and defeated enemies. Living enemies return to their home locations with their remaining health. A new game replaces the current save only after confirmation when an existing run is present.

## Virtual mailbox and reports

- Zombies process disjoint two-message batches of unwanted mock mail.
- Faculty ammo marks the associated message important and adds `Faculty`; it does not auto-star it.
- Herbs star messages; consuming a herb leaves its star intact.
- The classification board applies actual labels and measures your submitted answers against known mock categories. Retries count in measured accuracy.
- Bosses trash spam, archive newsletters, remove redundant copies, and simulate deletion of pre-existing virtual Trash, respectively.
- Browse/search Inbox, Starred, Important, category labels, Review, Archived, Trash, and simulated Deleted messages. Inspect message previews, before/after counts, boss/zombie reports, and full audit snapshots.
- **Undo latest** restores an entire email operation in reverse chronological order. It retains the audit trail and prevents overlapping batches from erasing later changes. Undo affects mailbox state, not combat, XP, gates, or encounter rewards. A completed encounter will not reapply an undone action.
- Reports contain actual current mailbox counts, unique processed IDs from active operations, encounter statistics, accuracy, game time, all emails, and the operation log. Undo adjusts mailbox metrics; Agent XP records historical gameplay achievements.
- Saves occur after significant actions, every three active seconds, on pause, and on page exit. Refresh returns to the menu; Continue resumes the saved state. Damaged saves display a warning and are kept untouched until an explicitly confirmed new game. Reports can be exported when storage is unavailable.

## Validation

`npm test` runs the Node test suite through a lightweight TypeScript loader. It covers deterministic data, classification, destructive-action guards, all action types, batch undo/idempotency, body/head damage, pickups, collision and visibility, regeneration/reload, simultaneous-hit immunity, enemy caps, all four boss batches and gate progression, checkpoints, and save validation.

Optional browser integration checks use development-only Playwright Core and an installed Chromium-family browser:

```sh
# Terminal 1
npm run dev
# Terminal 2 (Linux default: /usr/bin/chromium)
npm run test:browser
# Set CHROMIUM_PATH to your browser executable if different.
```

On PowerShell, for example: `$env:CHROMIUM_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'` before running the browser tests. No browser download is bundled. The browser test must target the Vite development server on port 5173 because it imports test fixtures from the source modules; the production build has no debug API. Screenshots go to ignored `.playwright/`.

The test drives mouse capture, keyboard movement, actual raycast body/head shots, pickup/reload/herb controls, puzzle forms, mailbox inspection, refresh/Continue, and corrupt-save protection. Isolated encounter fixtures make this a reproducible integration check, not an automated unassisted full-house playthrough. The logic suite separately verifies full campaign progression.

## Implementation

- React, TypeScript, Vite, Tailwind CSS, and Lucide for the application and HUD.
- Three.js / React Three Fiber / Drei for lightweight procedural 3D, smooth shoulder camera with basic wall avoidance, separate body/head hitboxes, and wall/furniture-occluded hitscan shooting.
- Zustand as the shared game/mailbox source of truth; a centralized, immutable email action engine records previous/next snapshots and idempotency IDs.
- Fixed-step gameplay updates, capped pixel density, no physics engine or downloaded models, and synthesized Web Audio effects with volume/mute controls.
- A small subset of DejaVu Sans is served locally for world labels; its license is in `public/fonts/LICENSE.txt`. No remote fonts or assets are fetched.

Key files: `src/game/GameScene.tsx` (rendering/input), `src/game/world.ts` (house/collision), `src/game/systems.ts` (game-clock simulation), `src/email/engine.ts` (mock data/classification/actions), `src/store/game.ts` (progress/persistence), and `src/components/` (mailbox/puzzles/reports).

## MVP limitations

- Original procedural low-poly art, simple movement, and synthesized non-spatial sound; no cinematic animation, imported models, elaborate postprocessing, or advanced pathfinding.
- Enemies use local collision-aware steering and line of sight. They can get blocked by furniture; reposition to lure them. Three nearby normal enemies and one sequential boss may act at a time. There are twelve normal encounters, with no infinite spawner.
- The house uses straight openings that become passable when unlocked, rather than animated hinged doors. Camera collision is basic and may feel tight beside furniture.
- Desktop only. Touch controls, gamepad support, real email import, CSV export, and online/cloud saves are not implemented.
- One browser/device save slot; clearing site data removes it. No measured claim of 30/60 FPS or a 15–25 minute session on all laptops. Software-rendered cloud-browser checks do not establish hardware performance or difficulty balance.

## Review and merge into GitHub

The implementation is on the local `feat/inbox-evil` branch. No changes are pushed or merged automatically. Review the implementation against the original `main` checkout:

```sh
git status
git diff main...HEAD --stat
git diff main...HEAD
npm test
npm run build
```

Push the feature branch and open a pull request targeting `main` in GitHub:

```sh
git push -u origin feat/inbox-evil
```

Review the source, run the game, verify the mailbox audit and report, and merge the pull request through GitHub after approval. This project does not require access to a local Windows computer to build or test in the cloud.
