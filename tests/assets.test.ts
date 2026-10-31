import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { safePosition, obstacles, blocked } from "../src/game/world";
test("saved positions under newly added reception furniture recover to walkable space", () => {
  const solids = obstacles([]);
  const restored = safePosition([5, 1.4], solids);
  assert(!blocked(restored[0], restored[1], solids));
  const valid: [number, number] = [4, 5];
  assert.equal(safePosition(valid, solids), valid);
});
const root = new URL("../public/assets/quaternius/", import.meta.url);
test("archive zombie has authored locomotion, attacks, skeleton and embedded texture", () => {
  const b = readFileSync(new URL("archive-zombie.glb", root));
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  assert(j.skins.length && j.images.length);
  for (const name of ["Idle", "Walk", "Run", "Idle_Attack"]) assert(j.animations.some((a: {name: string}) => a.name === name));
});
const manifest = JSON.parse(
  readFileSync(new URL("manifest.json", root), "utf8"),
);
test("bundled publisher assets match recorded hashes and valid self-contained GLB structure", () => {
  assert.equal(manifest.license, "CC0-1.0");
  assert(readFileSync(new URL("License.txt", root), "utf8").includes("CC0"));
  for (const a of manifest.assets) {
    const b = readFileSync(new URL(`${a.name}.glb`, root));
    assert.equal(createHash("sha256").update(b).digest("hex"), a.sha256);
    assert.equal(b.readUInt32LE(0), 0x46546c67);
    assert.equal(b.readUInt32LE(8), b.length);
    const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
    assert(j.meshes.length);
    assert(j.buffers.every((v: { uri?: string }) => !v.uri));
    assert(
      (j.images || []).every(
        (v: { uri?: string; bufferView?: number }) =>
          !v.uri && v.bufferView !== undefined,
      ),
    );
  }
});
test("survivor and infected contain skeletons and required actual animation clips", () => {
  for (const name of [
    "survivor",
    "zombie",
    "zombie-arm",
    "zombie-heavy",
    "zombie-rib",
  ]) {
    const b = readFileSync(new URL(`${name}.glb`, root));
    const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
    assert(j.skins?.length, `${name} has a skeleton`);
    const clips = j.animations.map((a: { name: string }) => a.name);
    for (const clip of ["Idle", "Walk", "Run", "Death", "HitReact"])
      assert(clips.includes(clip), `${name}: ${clip}`);
    if (name === "survivor")
      assert(clips.includes("Idle_Gun") && clips.includes("Walk_Gun"));
  }
});
