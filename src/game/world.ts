export type Vec2 = [number, number];
export interface Solid {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind?: string;
}
export const rooms = [
  { name: "Reception Hall", x: 4, z: 4.5 },
  { name: "Living Room", x: 12, z: 4.5 },
  { name: "Study Room", x: 20, z: 4.5 },
  { name: "Academic Records", x: 4, z: 13.5 },
  { name: "Storage Room", x: 12, z: 13.5 },
  { name: "Server Chamber", x: 20, z: 13.5 },
];
export const walls: Solid[] = [
  { x: 12, z: 0, w: 24, d: 0.25, h: 3.5 },
  { x: 12, z: 18, w: 24, d: 0.25, h: 3.5 },
  { x: 0, z: 9, w: 0.25, d: 18, h: 3.5 },
  { x: 24, z: 9, w: 0.25, d: 18, h: 3.5 },
  ...[8, 16].flatMap((x) =>
    [0, 9].flatMap((base) => [
      { x, z: base + 1.65, w: 0.25, d: 3.3, h: 3.5 },
      { x, z: base + 7.35, w: 0.25, d: 3.3, h: 3.5 },
    ]),
  ),
  { x: 1.4, z: 9, w: 2.8, d: 0.25, h: 3.5 },
  { x: 15, z: 9, w: 18, d: 0.25, h: 3.5 },
];
export const furniture: Solid[] = [
  { x: 4, z: 7.6, w: 4.3, d: 0.85, h: 1.4, kind: "reception" },
  { x: 5, z: 1.4, w: 2.6, d: 0.8, h: 1, kind: "desk" },
  { x: 5, z: 0.55, w: 0.65, d: 0.6, h: 1, kind: "chair" },
  { x: 6.9, z: 7.5, w: 0.45, d: 0.45, h: 0.9, kind: "plant" },
  { x: 18, z: 0.65, w: 0.65, d: 0.6, h: 1, kind: "chair" },
  { x: 2, z: 2, w: 1.6, d: 0.7, h: 1, kind: "desk" },
  { x: 10, z: 2, w: 2.4, d: 1, h: 0.7, kind: "sofa" },
  { x: 14, z: 7, w: 1.8, d: 0.8, h: 1, kind: "desk" },
  { x: 22.7, z: 2, w: 0.65, d: 3, h: 2.5, kind: "shelf" },
  { x: 18, z: 2, w: 1.6, d: 0.8, h: 1, kind: "desk" },
  { x: 2, z: 15, w: 2, d: 3, h: 0.6, kind: "bed" },
  { x: 6.6, z: 16, w: 1, d: 0.7, h: 1, kind: "desk" },
  { x: 10, z: 16, w: 1, d: 2, h: 2, kind: "shelf" },
  { x: 14, z: 11, w: 1.2, d: 1.2, h: 1, kind: "box" },
  { x: 22, z: 16, w: 1.8, d: 1, h: 1.2, kind: "terminal" },
];
export const doors = [
  {
    id: "hall-living",
    x: 8,
    z: 4.5,
    axis: "z",
    requires: "",
    label: "Living Room",
  },
  {
    id: "living-study",
    x: 16,
    z: 4.5,
    axis: "z",
    requires: "study",
    label: "Study: defeat Brute + drawer",
  },
  {
    id: "hall-bedroom",
    x: 4,
    z: 9,
    axis: "x",
    requires: "bedroom",
    label: "Bedroom: classify the board",
  },
  {
    id: "bedroom-storage",
    x: 8,
    z: 13.5,
    axis: "z",
    requires: "storage",
    label: "Storage: open bedroom safe",
  },
  {
    id: "storage-final",
    x: 16,
    z: 13.5,
    axis: "z",
    requires: "final",
    label: "Final chamber: first 3 bosses",
  },
] as const;
const solidCache = new Map<string, Solid[]>();
export function obstacles(keys: string[]): Solid[] {
  const key = doors.map(d => !d.requires || keys.includes(d.requires) ? "1" : "0").join("");
  const cached = solidCache.get(key);
  if (cached) return cached;
  const result = [
    ...walls,
    ...furniture,
    ...doors
      .filter((d) => d.requires && !keys.includes(d.requires))
      .map((d) => ({
        x: d.x,
        z: d.z,
        w: d.axis === "z" ? 0.3 : 2.4,
        d: d.axis === "z" ? 2.4 : 0.3,
        h: 3.5,
      })),
  ];
  solidCache.set(key, result);
  return result;
}
export function blocked(x: number, z: number, solids: Solid[], radius = 0.3) {
  return solids.some((s) => {
    const dx = Math.max(0, Math.abs(x - s.x) - s.w / 2);
    const dz = Math.max(0, Math.abs(z - s.z) - s.d / 2);
    return radius === 0 ? dx === 0 && dz === 0 : dx * dx + dz * dz < radius * radius;
  });
}
/** Keep older saves usable when a furniture upgrade occupies their saved position. */
export function safePosition(position: Vec2, solids: Solid[]): Vec2 {
  if (!blocked(position[0], position[1], solids)) return position;
  for (let radius = 0.4; radius <= 4; radius += 0.2) {
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        x = position[0] + Math.cos(a) * radius,
        z = position[1] + Math.sin(a) * radius;
      if (!blocked(x, z, solids) && x > 0.3 && x < 23.7 && z > 0.3 && z < 17.7)
        return [x, z];
    }
  }
  return position;
}
export function move(
  pos: Vec2,
  dx: number,
  dz: number,
  solids: Solid[],
  radius = 0.3,
): Vec2 {
  let [x, z] = pos;
  // Sweep in short increments so fast boss charges cannot tunnel through thin walls.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  for (let i = 0; i < steps; i++) {
    if (!blocked(x + dx / steps, z, solids, radius)) x += dx / steps;
    if (!blocked(x, z + dz / steps, solids, radius)) z += dz / steps;
  }
  return [x, z];
}
export function clearLine(a: Vec2, b: Vec2, solids: Solid[]) {
  // Exact segment/AABB slabs: independent of distance and no missed thin doors.
  for (const s of solids) {
    let near = 0.001, far = 0.999;
    for (const [origin, delta, min, max] of [
      [a[0], b[0] - a[0], s.x - s.w / 2, s.x + s.w / 2],
      [a[1], b[1] - a[1], s.z - s.d / 2, s.z + s.d / 2],
    ]) {
      if (Math.abs(delta) < 1e-8) {
        if (origin < min || origin > max) { near = 1; far = 0; break; }
      } else {
        const t1 = (min - origin) / delta, t2 = (max - origin) / delta;
        near = Math.max(near, Math.min(t1, t2));
        far = Math.min(far, Math.max(t1, t2));
      }
    }
    if (near <= far) return false;
  }
  return true;
}
export function roomAt(p: Vec2) {
  return rooms[
    (p[1] >= 9 ? 3 : 0) + Math.min(2, Math.floor(Math.max(0, p[0]) / 8))
  ].name;
}
export const bossConfigs = [
  {
    name: "The Spam Brute",
    x: 12,
    z: 6,
    color: "#b57058",
    hp: 24,
    category: "Spam",
    action: "MOVE_TO_TRASH",
  },
  {
    name: "The Newsletter Hoarder",
    x: 20,
    z: 6,
    color: "#768eaf",
    hp: 24,
    category: "Newsletters",
    action: "ARCHIVE",
  },
  {
    name: "The Duplicate Collector",
    x: 12,
    z: 14,
    color: "#af9c60",
    hp: 27,
    category: "Duplicates",
    action: "MOVE_TO_TRASH",
  },
  {
    name: "The Trash Tyrant",
    x: 20,
    z: 13,
    color: "#af6381",
    hp: 30,
    category: "Trash",
    action: "SIMULATE_PERMANENT_DELETE",
  },
] as const;
export const pickupDefs = rooms.flatMap((r, i) => [
  {
    id: `ammo-${i}`,
    kind: "ammo" as const,
    x: r.x - 1,
    z: r.z - 1.3,
    emailId: `mail-${60 + i}`,
  },
  {
    id: `herb-${i}`,
    kind: "herb" as const,
    x: r.x + 1.4,
    z: r.z - 1.3,
    emailId: `mail-${80 + i}`,
  },
]);
export const interactions = [
  { id: "supply", x: 2, z: 2, label: "Emergency supply terminal" },
  { id: "note", x: 10, z: 2, label: "Read drawer note" },
  { id: "drawer", x: 14, z: 7, label: "Locked drawer" },
  { id: "board", x: 18, z: 2, label: "Email classification board" },
  { id: "digits", x: 6.6, z: 16, label: "Read three indexed safe digits" },
  { id: "safe", x: 5, z: 11, label: "Bedroom safe" },
  { id: "exit", x: 22, z: 16, label: "Restoration terminal" },
];
