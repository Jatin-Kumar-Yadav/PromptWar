import test from "node:test";
import assert from "node:assert/strict";
import { useGame } from "../src/store/game";
import { advanceRun } from "../src/game/systems";
import { blocked, clearLine, move, obstacles } from "../src/game/world";
import { waypoint } from "../src/game/navigation";
const idle = {forward: 0, strafe: 0, sprint: false, yaw: 0};
const fresh = () => { useGame.getState().newGame(); return useGame.getState().run; };
test("checkpoint restart cancels velocity and queued boss specials", () => {
  const r = fresh();
  useGame.getState().update({velocity: [2, 1], enemies: r.enemies.map(e => ({...e, special: "slam", specialUntil: 99, alertUntil: 99}))});
  useGame.getState().respawn();
  const next = useGame.getState().run;
  assert.deepEqual(next.velocity, [0, 0]);
  assert(next.enemies.every(e => !e.special && e.alertUntil === 0));
});
test("capsule footprint clears furniture corners and swept movement cannot cross thin walls", () => {
  const solids = [{x: 3, z: 3, w: 1, d: 1, h: 2}];
  assert(!blocked(3.75, 3.75, solids, 0.3));
  assert(blocked(3.65, 3.65, solids, 0.3));
  assert(move([1, 3], 5, 0, solids)[0] < 2.3);
  assert(!clearLine([1, 3], [6, 3], solids));
});
test("navigation routes around a desk and through the reception rear passage", () => {
  const solids = obstacles(["study", "bedroom", "storage", "final"]);
  let position: [number, number] = [4, 5];
  const goal: [number, number] = [4, 10];
  for (let i = 0; i < 1200; i++) {
    const target = waypoint(position, goal, solids);
    const dist = Math.hypot(target[0] - position[0], target[1] - position[1]);
    if (dist < 0.05) break;
    position = move(position, (target[0] - position[0]) / dist * 0.06, (target[1] - position[1]) / dist * 0.06, solids, 0.28);
  }
  assert(Math.hypot(position[0] - goal[0], position[1] - goal[1]) < 0.15, String(position));
});
test("aiming suppresses sprint and stopping decelerates promptly", () => {
  const r = {...fresh(), enemies: []};
  const aim = advanceRun(r, 0.1, {...idle, forward: 1, aiming: true}, []).patch;
  const sprintAim = advanceRun(r, 0.1, {...idle, forward: 1, sprint: true, aiming: true}, []).patch;
  assert.deepEqual(aim.position, sprintAim.position);
  let stopped = {...r, ...aim};
  for (let i = 0; i < 15; i++) stopped = {...stopped, ...advanceRun(stopped, 1 / 60, idle, []).patch};
  assert(Math.hypot(...stopped.velocity!) < 0.03);
});
test("boss charge is telegraphed, strikes at most once, and recovers", () => {
  const r = fresh(), boss = {...r.enemies[14], x: 4, z: 7, specialCooldown: 0};
  let run = {...r, position: [4, 4] as [number, number], bosses: [0, 1], enemies: [boss]};
  run = {...run, ...advanceRun(run, 0.05, idle, []).patch};
  assert.equal(run.enemies[0].special, "charge");
  assert.equal(run.health, 3);
  for (let i = 0; i < 45; i++) run = {...run, ...advanceRun(run, 0.05, idle, []).patch};
  assert(run.health >= 2);
  assert(run.enemies[0].cooldown > 0);
});
test("slam cannot damage through a wall and alert updates preserve prior snapshots", () => {
  const r = fresh();
  const boss = {...r.enemies[15], x: 4, z: 6, special: "slam" as const, specialUntil: 0.01};
  const run = {...r, position: [4, 4] as [number, number], bosses: [0, 1, 2], enemies: [boss]};
  const saved = JSON.stringify(run);
  const tick = advanceRun(run, 0.02, idle, [{x: 4, z: 5, w: 3, d: 0.15, h: 3}]);
  assert.equal(tick.patch.health, 3);
  assert.equal(JSON.stringify(run), saved);
});
