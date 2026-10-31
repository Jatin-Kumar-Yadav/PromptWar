// Inspect public asset folders without authentication. Downloads stay an explicit step.
import { execFileSync } from "node:child_process";
const id = process.argv[2];
if (!/^[A-Za-z0-9_-]+$/.test(id || ""))
  throw new Error("Pass a public Drive folder ID");
const html = execFileSync(
  "curl",
  ["-fsSL", `https://drive.google.com/drive/folders/${id}`],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
);
const raw = html.match(/_DRIVE_ivd'\] = '([^']+)'/)?.[1];
if (!raw) throw new Error("Public folder listing unavailable");
const decoded = raw
  .replace(/\\x([0-9a-f]{2})/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/\\\//g, "/");
const data = JSON.parse(decoded);
for (const row of data[0] || [])
  console.log(JSON.stringify({ id: row[0], name: row[2], type: row[3] }));
