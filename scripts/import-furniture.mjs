import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
const dir = mkdtempSync(join(tmpdir(), "inbox-furniture-"));
const assets = [
  ["door", "1k4hz860eB_tkwFZK3CzHSQ1F4HCKPmVx", "ultimatehomeinterior"],
  ["drawer", "1sCeA2nhtk7BW5pNOSgUz3ysHhKEVaUxT", "ultimatehomeinterior"],
  ["bookshelf", "1Nk71nbt5Qbs57l5uuB0pNULrSsGwb_xR", "ultimatehomeinterior"],
  ["bed", "1sgmwNraONKrnuJ8ApmjCaKABl05TK9nj", "ultimatehomeinterior"],
  ["table", "1zyKKmCElVXM4ihGDKW5RrarVz61C9KZ9", "furniture"],
  ["chair", "1ukmJHryhpRbpm6uXhh5hpm4xXB9-Nbtv", "furniture"],
  ["lamp", "1xcTHxSN8YaNudmYItDca-M2oh0Gl-Bu_", "furniture"],
  ["plant", "1UaqbxxMMiH4xQBcpOj4yapWHiPCf1lEV", "furniture"],
  ["coffee-table", "1-JR7XpiXjCh-rlHHjWYTEE457jBgmBDZ", "furniture"],
];
const path = "public/assets/quaternius/manifest.json";
const manifest = JSON.parse(readFileSync(path));
for (const [name, id, pack] of assets) {
  const source = execFileSync(
    "curl",
    [
      "-fsSL",
      `https://drive.usercontent.google.com/download?id=${id}&export=download`,
    ],
    { maxBuffer: 20 * 1024 * 1024 },
  );
  const input = join(dir, `${name}.fbx`),
    output = `public/assets/quaternius/${name}.glb`;
  writeFileSync(input, source);
  execFileSync(
    "blender",
    [
      "--background",
      "--python",
      "scripts/convert-quaternius.py",
      "--",
      input,
      output,
    ],
    { stdio: "pipe" },
  );
  const b = readFileSync(output);
  manifest.assets = manifest.assets.filter((a) => a.name !== name);
  manifest.assets.push({
    name,
    id,
    pack,
    source: `https://quaternius.com/packs/${pack}.html`,
    license: "CC0-1.0",
    sourceSha256: createHash("sha256").update(source).digest("hex"),
    sha256: createHash("sha256").update(b).digest("hex"),
    bytes: b.length,
    clips: [],
  });
  console.log(name, b.length);
}
writeFileSync(
  "public/assets/quaternius/HomeInterior-License.txt",
  execFileSync("curl", [
    "-fsSL",
    "https://drive.usercontent.google.com/download?id=1UF65ItPpj1rIxmewMDtVnpJk_WikvnyJ&export=download",
  ]),
);
writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
