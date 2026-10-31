# Animated Zombie Pack

Author: Quaternius. License: **CC0-1.0**, explicitly declared by the pack page:
https://quaternius.com/packs/animatedzombie.html

License text: https://creativecommons.org/publicdomain/zero/1.0/legalcode

Publisher download folder:
https://drive.google.com/drive/folders/1AfOPRgr5Gl8gll9KfGDEUSYq_Ag7yPJG

Selected sources: `ZombieSmooth.blend` and `ZombieTexture.png`. Exact publisher file IDs and input/output SHA-256 hashes are recorded in `manifest.json`.

Changes: legacy materials converted to PBR, source texture embedded, unused camera/light objects omitted, stale bone-path prefixes corrected, animation names normalized, all six source actions exported to local GLB. Runtime adds material treatment and procedural damage/death reactions. No Resident Evil assets are included. Reproduce with `blender --background --python scripts/import-archive-zombie.py` after importing the base kit and furniture.
