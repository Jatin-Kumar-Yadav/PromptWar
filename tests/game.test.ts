import test from "node:test";
import assert from "node:assert/strict";
import { useGame, enemyActive, validateSave } from "../src/store/game";
import { activeEnemy, advanceRun } from "../src/game/systems";
import {
  blocked,
  clearLine,
  move,
  obstacles,
  pickupDefs,
  walls,
} from "../src/game/world";
const idle = { forward: 0, strafe: 0, sprint: false, yaw: 0 };
const fresh = () => {
  useGame.getState().newGame();
  return useGame.getState().run;
};
test("body shots take three hits and headshots one; each kill logs exactly one batch", () => {
  fresh();
  const s = useGame.getState();
  s.hit("zombie-0", false);
  s.hit("zombie-0", false);
  assert.equal(useGame.getState().run.enemies[0].hp, 1);
  s.hit("zombie-0", false);
  s.hit("zombie-0", true);
  assert.equal(useGame.getState().run.kills, 1);
  assert.equal(useGame.getState().mail.operations.length, 1);
  assert.equal(useGame.getState().mail.emails[20].folder, "Trash");
  s.hit("zombie-1", true);
  assert.equal(useGame.getState().run.enemies[1].hp, 0);
});
test("all normal and boss batches are disjoint; canonical duplicate is never targeted", () => {
  const r = fresh();
  const ids = r.enemies.flatMap((e) => e.emails);
  assert.equal(ids.length, new Set(ids).size);
  assert(!ids.includes("mail-180"));
});
test("pickups change real local mail state once; faculty is not auto-starred", () => {
  fresh();
  const s = useGame.getState();
  s.collect("ammo-0");
  s.collect("ammo-0");
  s.collect("herb-0");
  const { run, mail } = useGame.getState();
  assert.equal(run.reserve, 36);
  assert.equal(run.herbs, 1);
  assert.equal(mail.emails[60].important, true);
  assert.equal(mail.emails[60].starred, false);
  assert(mail.emails[60].labels.includes("Faculty"));
  assert.equal(mail.emails[80].starred, true);
});
test("collision, locked doors and sight tests prevent crossing walls", () => {
  const solids = obstacles([]);
  assert(blocked(16, 4.5, solids));
  assert(!blocked(16, 4.5, obstacles(["study"])));
  assert.deepEqual(move([15.5, 4.5], 0.3, 0, solids), [15.5, 4.5]);
  assert.equal(clearLine([4, 4], [12, 4], walls), true);
  assert.equal(clearLine([4, 2], [12, 2], walls), false);
});
test("regeneration, reload and movement use game time without exceeding limits", () => {
  let r = {
    ...fresh(),
    health: 1,
    regen: 7.99,
    mag: 5,
    reserve: 3,
    reload: 0.01,
    enemies: [],
  };
  const next = advanceRun(r, 0.02, idle, []).patch;
  assert.equal(next.health, 2);
  assert.equal(next.regen, 0);
  assert.equal(next.mag, 8);
  assert.equal(next.reserve, 0);
  assert.equal(next.reload, 0);
  const walk = advanceRun(
    { ...r, position: [4, 5] },
    0.05,
    { ...idle, forward: 1 },
    [],
  ).patch;
  const sprint = advanceRun(
    { ...r, position: [4, 5] },
    0.05,
    { ...idle, forward: 1, sprint: true },
    [],
  ).patch;
  assert(sprint.position[1] < walk.position[1]);
});
test("simultaneous attacks cost one health, not instant death; no wall attacks", () => {
  const run = fresh();
  const enemies = run.enemies
    .slice(0, 3)
    .map((e, i) => ({ ...e, x: 4 + i * 0.05, z: 5.5, windup: 0.01, stun: 0 }));
  const r = { ...run, position: [4, 5] as [number, number], enemies };
  const hit = advanceRun(r, 0.02, idle, []);
  assert.equal(hit.patch.health, 2);
  assert.equal(hit.patch.immune, 1.5);
  assert.equal(advanceRun({ ...r, immune: 1 }, 0.02, idle, []).patch.health, 3);
  const wall = { x: 4, z: 5.25, w: 2, d: 0.1, h: 3 };
  assert.equal(advanceRun(r, 0.02, idle, [wall]).patch.health, 3);
});
test("only three normal enemies chase; only the next boss is active", () => {
  const r = fresh();
  const enemies = r.enemies.map((e) => ({ ...e, x: 4, z: 7 }));
  const tick = advanceRun({ ...r, enemies }, 0.03, idle, []);
  assert.equal(
    tick.patch.enemies.filter((e) => e.boss < 0 && e.state === "chase").length,
    3,
  );
  assert.equal(
    enemies.filter((e) => e.boss >= 0 && activeEnemy(e, r)).length,
    1,
  );
  assert.equal(
    enemies.filter((e) => e.boss >= 0 && enemyActive(e, r))[0].boss,
    0,
  );
});
test("complete campaign: all 4 bosses, 3 puzzles, gates, batch results and victory", () => {
  fresh();
  const s = useGame.getState();
  s.solve("drawer");
  assert(!useGame.getState().run.keys.includes("study"));
  for (let boss = 0; boss < 4; boss++) {
    while (
      useGame.getState().run.enemies.find((e) => e.id === `boss-${boss}`)!.hp >
      0
    )
      s.hit(`boss-${boss}`, true);
    if (boss === 0) assert(useGame.getState().run.keys.includes("study"));
    if (boss === 1) {
      assert(!s.group({}));
      assert(
        s.group({
          "mail-86": "Internships",
          "mail-87": "Internships",
          "mail-100": "Hackathons",
          "mail-101": "Hackathons",
          "mail-120": "Events",
          "mail-121": "Events",
        }),
      );
      assert(useGame.getState().run.keys.includes("bedroom"));
      s.solve("safe");
      assert(useGame.getState().run.keys.includes("storage"));
    }
    if (boss === 2) assert(useGame.getState().run.keys.includes("final"));
  }
  const { mail, run, mode } = useGame.getState();
  assert.equal(mode, "victory");
  assert.equal(run.bosses.length, 4);
  assert.equal(run.puzzles.length, 3);
  assert.equal(mail.emails[4].folder, "Trash");
  assert.equal(mail.emails[40].folder, "Archived");
  assert.equal(mail.emails[180].folder, "Inbox");
  assert.equal(mail.emails[181].folder, "Trash");
  assert.equal(mail.emails[200].folder, "Deleted");
  assert.equal(mail.emails[99].starred, true);
});
test("death checkpoint preserves operations and defeated enemies", () => {
  fresh();
  const s = useGame.getState();
  s.hit("zombie-0", true);
  s.update({ health: 0 });
  s.setMode("dead");
  s.respawn();
  const after = useGame.getState();
  assert.equal(after.run.health, 3);
  assert.equal(after.run.enemies[0].hp, 0);
  assert.equal(after.mail.emails[20].folder, "Trash");
  assert.equal(after.mode, "paused");
});
test("saved snapshot is JSON serializable and malformed saves are rejected", () => {
  fresh();
  useGame.getState().collect(pickupDefs[0].id);
  const { run, mail } = useGame.getState();
  const saved = JSON.parse(
    JSON.stringify({ version: 1, run, mail, volume: 0.35 }),
  );
  assert(validateSave(saved));
  assert(!validateSave({ version: 1, run: {}, mail: {} }));
  assert(!validateSave(null));
  assert(!validateSave({ ...saved, version: 2 }));
});
