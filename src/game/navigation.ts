import { blocked, clearLine, type Solid, type Vec2 } from "./world";

/** Small cached navigation grid; rebuilt only when a progression door changes. */
const cache = new WeakMap<Solid[], Map<number, Uint8Array>>();
const CELL = 0.25, W = 96, H = 72;
export function waypoint(from: Vec2, target: Vec2, solids: Solid[], radius = 0.28): Vec2 {
  if (clearLine(from, target, solids)) {
    const steps = Math.ceil(Math.hypot(target[0] - from[0], target[1] - from[1]) / 0.2);
    let walkable = true;
    for (let i = 1; i <= steps; i++) if (blocked(from[0] + (target[0] - from[0]) * i / steps, from[1] + (target[1] - from[1]) * i / steps, solids, radius)) { walkable = false; break; }
    if (walkable) return target;
  }
  let sizes = cache.get(solids);
  if (!sizes) { sizes = new Map(); cache.set(solids, sizes); }
  let grid = sizes.get(radius);
  if (!grid) {
    grid = new Uint8Array(W * H);
    for (let i = 0; i < grid.length; i++)
      grid[i] = Number(!blocked((i % W + 0.5) * CELL, (Math.floor(i / W) + 0.5) * CELL, solids, radius));
    sizes.set(radius, grid);
  }
  const index = (p: Vec2) => Math.max(0, Math.min(H - 1, Math.floor(p[1] / CELL))) * W + Math.max(0, Math.min(W - 1, Math.floor(p[0] / CELL)));
  const start = index(from), goal = index(target);
  const parents = new Int32Array(W * H).fill(-1), queue = new Int32Array(W * H);
  let head = 0, tail = 1;
  queue[0] = start; parents[start] = start;
  while (head < tail && parents[goal] < 0) {
    const at = queue[head++];
    for (const next of [at - W, at + W, at % W ? at - 1 : -1, at % W < W - 1 ? at + 1 : -1]) {
      if (next < 0 || next >= W * H || !grid[next] || parents[next] >= 0) continue;
      parents[next] = at; queue[tail++] = next;
    }
  }
  if (parents[goal] < 0) return from;
  let next = goal;
  while (parents[next] !== start && next !== start) next = parents[next];
  return [(next % W + 0.5) * CELL, (Math.floor(next / W) + 0.5) * CELL];
}
