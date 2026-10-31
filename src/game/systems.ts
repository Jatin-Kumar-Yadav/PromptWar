import type { Enemy, Run } from "../store/game";
import { clearLine, move, type Solid } from "./world";
export function activeEnemy(e: Enemy, r: Run) {
  return (
    e.hp > 0 &&
    (e.boss < 0 || e.boss === [0, 1, 2, 3].find((i) => !r.bosses.includes(i)))
  );
}
export interface TickInput {
  forward: number;
  strafe: number;
  sprint: boolean;
  aiming?: boolean;
  yaw: number;
}
/** Fixed-step gameplay clock. All timers advance only while the caller is playing. */
export function advanceRun(
  r: Run,
  delta: number,
  input: TickInput,
  solids: Solid[],
) {
  let [x, z] = r.position;
  const speed =
    (input.sprint ? 4 : 2.5) * (input.aiming ? 0.62 : 1) *
    (1 + Math.min(0.08, Math.floor(r.xp / 150) * 0.008));
  const length = Math.hypot(input.strafe, input.forward) || 1;
  const dx = input.strafe / length,
    dz = input.forward / length;
  [x, z] = move(
    [x, z],
    (Math.cos(input.yaw) * dx - Math.sin(input.yaw) * dz) * speed * delta,
    (-Math.sin(input.yaw) * dx - Math.cos(input.yaw) * dz) * speed * delta,
    solids,
  );
  let health = r.health,
    immune = Math.max(0, r.immune - delta),
    regen = r.regen + delta;
  let mag = r.mag,
    reserve = r.reserve,
    reload = Math.max(0, r.reload - delta);
  let damaged = false,
    attacked = false;
  if (r.reload > 0 && reload === 0) {
    const n = Math.min(12 - mag, reserve);
    mag += n;
    reserve -= n;
  }
  if (regen >= 8 && health < 3) {
    health++;
    regen = 0;
  }
  const near = r.enemies
    .filter(
      (e) =>
        e.boss < 0 &&
        activeEnemy(e, r) &&
        Math.hypot(e.x - x, e.z - z) < 7 &&
        clearLine([e.x, e.z], [x, z], solids),
    )
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
    .slice(0, 3)
    .map((e) => e.id);
  const enemies = r.enemies.map((e) => {
    if (!activeEnemy(e, r)) return e;
    if (e.boss < 0 && !near.includes(e.id))
      return { ...e, state: "idle" as const };
    const dist = Math.hypot(e.x - x, e.z - z);
    if (dist > 7 || !clearLine([e.x, e.z], [x, z], solids))
      return { ...e, state: "patrol" as const };
    const n = {
      ...e,
      cooldown: Math.max(0, e.cooldown - delta),
      stun: Math.max(0, e.stun - delta),
    };
    if (n.stun > 0) {
      n.state = "stunned";
      return n;
    }
    const reach = e.boss >= 0 ? 1.65 : 0.9;
    if (e.windup > 0) {
      n.state = "attack";
      n.windup = Math.max(0, e.windup - delta);
      if (n.windup === 0) {
        attacked = true;
        if (dist < reach + 0.45 && immune === 0) {
          health--;
          immune = 1.5;
          regen = 0;
          damaged = true;
        }
        n.cooldown = e.boss >= 0 ? 2.6 : 1.7;
      }
      return n;
    }
    if (dist < reach && n.cooldown === 0) {
      n.windup = e.boss >= 0 ? 1.05 : 0.4;
      n.state = "attack";
      return n;
    }
    if (dist > reach) {
      const v = (e.boss >= 0 ? 0.65 : 0.95) * delta;
      [n.x, n.z] = move(
        [e.x, e.z],
        ((x - e.x) / dist) * v,
        ((z - e.z) / dist) * v,
        solids,
        e.boss >= 0 ? 0.5 : 0.28,
      );
      n.state = "chase";
    }
    return n;
  });
  return {
    patch: {
      position: [x, z] as [number, number],
      yaw: input.yaw,
      health,
      immune,
      regen,
      mag,
      reserve,
      reload,
      time: r.time + delta,
      enemies,
    },
    damaged,
    attacked,
  };
}
