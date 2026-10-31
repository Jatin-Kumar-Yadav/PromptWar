// Reproducible import from the publisher's public Zombie Apocalypse Kit folder.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const assets = [
  ["survivor", "1hCbVych1BygiMK_9KttpI7MxSAmRR-aD"],
  ["zombie", "1S6EfXv0Fc6SiqyoPx5gNF48MI0OajNLr"],
  ["zombie-arm", "19MMkSg5NkpeSNb6271EoN_pNeBlQpt4Z"],
  ["zombie-heavy", "1PKHYBqygDy3ztkJLOQWx4fY00eFL0epN"],
  ["zombie-rib", "1mcGcs5UeeBpgbSwhu3r2yZWoB0V4dazt"],
  ["security", "19b_vYql-uGYkn4tv67rT_isLnE79sX7r"],
  ["pistol", "1Fwuz1p1hreHAe8y8w99G1fJz5AefWLOR"],
  ["couch", "1rgX-QENR7yW1WsXK0xvxem_odfaefLEk"],
  ["chest", "1yEC_pV6-U8Tt56fwhXgfuN2iRYwQoA_M"],
  ["barrel", "114k_vH2gWjaumPc39bKfGRdRvkB8Ym4Q"],
  ["pipes", "1hxT5Xnm77y6gXOKwriNSXonaxf4W-wdY"],
];
mkdirSync("public/assets/quaternius", { recursive: true });
const records = [];
for (const [name, id] of assets) {
  const raw = execFileSync(
    "curl",
    [
      "-fsSL",
      `https://drive.usercontent.google.com/download?id=${id}&export=download`,
    ],
    { maxBuffer: 30 * 1024 * 1024 },
  );
  const json = JSON.parse(raw.toString());
  if (json.buffers.length !== 1 || !json.buffers[0].uri.startsWith("data:"))
    throw new Error("Unexpected external buffer");
  let bin = Buffer.from(json.buffers[0].uri.split(",")[1], "base64");
  delete json.buffers[0].uri;
  const data = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4, 32);
  data.copy(padded);
  const binary = Buffer.alloc(Math.ceil(bin.length / 4) * 4);
  bin.copy(binary);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([header, padded, binHeader, binary]);
  writeFileSync(`public/assets/quaternius/${name}.glb`, glb);
  const record = {
    name,
    id,
    bytes: glb.length,
    sha256: createHash("sha256").update(glb).digest("hex"),
    clips: json.animations?.map((a) => a.name) || [],
  };
  records.push(record);
  console.log(name, glb.length, record.clips.join(","));
}
const license = execFileSync("curl", [
  "-fsSL",
  "https://drive.usercontent.google.com/download?id=1580uoubj39h6sNRFo394PvNU4ozIwehi&export=download",
]);
writeFileSync("public/assets/quaternius/License.txt", license);
writeFileSync(
  "public/assets/quaternius/manifest.json",
  JSON.stringify(
    {
      author: "Quaternius",
      pack: "Zombie Apocalypse Kit",
      source: "https://quaternius.com/packs/zombieapocalypsekit.html",
      folder:
        "https://drive.google.com/drive/folders/1mWP6sCHun7OUMHQeDNZLrXTteXlzWg_t",
      license: "CC0-1.0",
      licenseNote:
        "The official pack page declares CC0; the supplied License.txt also declares CC0 but its heading says Ultimate Platformer Pack. Original license file retained verbatim.",
      assets: records,
    },
    null,
    2,
  ) + "\n",
);
