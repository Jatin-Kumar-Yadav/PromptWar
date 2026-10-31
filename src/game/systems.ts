import type { Enemy, Run } from "../store/game";
import { clearLine, move, type Solid } from "./world";
import { waypoint } from "./navigation";
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
    (input.aiming ? 1.45 : input.sprint ? 4 : 2.5) *
    (1 + Math.min(0.08, Math.floor(r.xp / 150) * 0.008));
  const length = Math.hypot(input.strafe, input.forward) || 1;
  const dx = input.strafe / length,
    dz = input.forward / length;
  const blend = 1 - Math.exp(-delta * (length > 1 ? 22 : 18));
  const vx = (r.velocity?.[0] ?? 0) + ((Math.cos(input.yaw) * dx - Math.sin(input.yaw) * dz) * speed - (r.velocity?.[0] ?? 0)) * blend;
  const vz = (r.velocity?.[1] ?? 0) + ((-Math.sin(input.yaw) * dx - Math.cos(input.yaw) * dz) * speed - (r.velocity?.[1] ?? 0)) * blend;
  [x, z] = move(
    [x, z],
    vx * delta,
    vz * delta,
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
        Math.hypot(e.x - x, e.z - z) < 10,
    )
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
    .slice(0, 3)
    .map((e) => e.id);
  const enemies = r.enemies.map((e) => {
    if (!activeEnemy(e, r)) return e;
    if (e.boss < 0 && !near.includes(e.id))
      return { ...e, state: "idle" as const };
    const dist = Math.hypot(e.x - x, e.z - z);
    if (dist > 10) return e;
    const visible = dist < 7 && clearLine([e.x, e.z], [x, z], solids);
    const heard = r.time - r.shotAt < 0.3 && dist < 9;
    const n = {
      ...e,
      cooldown: Math.max(0, e.cooldown - delta),
      stun: Math.max(0, e.stun - delta),
      alertUntil: visible || heard ? r.time + 5 : e.alertUntil,
      specialCooldown: Math.max(0, (e.specialCooldown ?? 4) - delta),
    };
    if (n.stun > 0) {
      n.state = "stunned";
      return n;
    }
    if (!visible && !heard && (n.alertUntil ?? 0) < r.time) {
      n.state = "idle"; n.windup = 0; return n;
    }
    // Distinct boss specials retain their existing, disjoint email batches.
    if (e.special && (e.specialUntil ?? 0) > r.time) {
      n.state = "attack";
      const remaining = e.specialUntil! - r.time;
      if (e.special === "charge" && remaining < 0.6 && e.target) {
        const direction = Math.hypot(e.target[0] - e.x, e.target[1] - e.z) || 1;
        const step = 5 * delta;
        [n.x, n.z] = move([e.x, e.z], (e.target[0] - e.x) / direction * step, (e.target[1] - e.z) / direction * step, solids, 0.5);
        if (Math.hypot(n.x - e.x, n.z - e.z) < step * 0.3) { n.stun = 1.4; n.specialUntil = r.time; }
      }
      if (remaining <= delta || (e.special === "charge" && remaining < 0.6 && dist < 1.5)) {
        attacked = true;
        if (e.special !== "call" && dist < (e.special === "slam" ? 3 : 1.5) && immune === 0 && clearLine([n.x, n.z], [x, z], solids)) {
          health--; immune = 1.5; regen = 0; damaged = true;
        }
        n.specialUntil = r.time; n.cooldown = 3; n.stun = 1.1;
      }
      return n;
    }
    n.special = undefined;
    if (e.boss > 0 && visible && n.specialCooldown === 0 && dist < 5 && dist > 1.7) {
      n.special = e.boss === 3 ? "slam" : e.boss === 2 ? "charge" : "call";
      n.specialUntil = r.time + (n.special === "charge" ? 1.8 : 1.5);
      n.specialCooldown = 9;
      n.target = [x, z]; n.state = "attack";
      return n;
    }
    const reach = e.boss >= 0 ? 1.65 : 0.9;
    if (e.windup > 0) {
      n.state = "attack";
      n.windup = Math.max(0, e.windup - delta);
      if (n.windup === 0) {
        attacked = true;
        if (dist < reach + 0.35 && immune === 0 && visible) {
          health--;
          immune = 1.5;
          regen = 0;
          damaged = true;
        }
        n.cooldown = e.boss >= 0 ? 2.6 : 1.7;
      }
      return n;
    }
    if (visible && dist < reach && n.cooldown === 0) {
      n.windup = e.boss >= 0 ? 1.05 : 0.65;
      n.state = "attack";
      return n;
    }
    if (dist > reach) {
      const v = (e.boss >= 0 ? 0.65 : 0.8 + Number(e.id.split("-")[1]) % 3 * 0.12) * delta;
      // Replan at 5 Hz, only for the handful of active enemies.
      const replan = Math.floor(r.time * 5) !== Math.floor((r.time + delta) * 5);
      const target = replan || !e.target ? waypoint([e.x, e.z], [x, z], solids, e.boss >= 0 ? 0.5 : 0.28) : e.target;
      n.target = target;
      const distance = Math.hypot(target[0] - e.x, target[1] - e.z) || 1;
      [n.x, n.z] = move(
        [e.x, e.z],
        ((target[0] - e.x) / distance) * v,
        ((target[1] - e.z) / distance) * v,
        solids,
        e.boss >= 0 ? 0.5 : 0.28,
      );
      n.state = "chase";
    }
    return n;
  });
  // The Hoarder calls a dormant existing infected: no new email IDs or duplicate rewards.
  const caller = enemies.find(e => e.special === "call" && (e.specialUntil ?? 0) > r.time);
  if (caller) {
    const recruit = enemies.find(e => e.boss < 0 && e.hp > 0 && Math.hypot(e.x - caller.x, e.z - caller.z) < 8 && clearLine([e.x, e.z], [caller.x, caller.z], solids));
    if (recruit) {
      const index = enemies.indexOf(recruit);
      enemies[index] = { ...recruit, alertUntil: r.time + 8 };
    }
  }
  return {
    patch: {
      position: [x, z] as [number, number],
      velocity: [vx, vz] as [number, number],
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
