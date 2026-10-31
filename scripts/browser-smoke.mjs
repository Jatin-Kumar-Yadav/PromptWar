import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
// Run against Vite so test fixtures can import the actual store, without adding a production debug API.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const BASE=process.env.GAME_URL||'http://127.0.0.1:5173';
const errors = [],
  external = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (req) => {
  if (
    !req.url().startsWith(BASE) &&
    !req.url().startsWith("blob:") &&
    !req.url().startsWith("data:")
  )
    external.push(req.url());
});
const state = (fn) =>
  page.evaluate(async (code) => {
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((n) => n.includes("/src/store/game.ts"));
    const { useGame } = await import(url || "/src/store/game.ts");
    window.__inboxTestStore = useGame;
    return new Function("s", code)(useGame.getState());
  }, fn);
const until = async (code) =>
  page.waitForFunction(
    (code) => new Function("s", code)(window.__inboxTestStore.getState()),
    code,
    { timeout: 60000, polling: 80 },
  );
const shoot = async (id = "zombie-0", part = "body") => {
  const mag = await state("return s.run.mag");
  await page.mouse.down({ button: "right" });
  // Aim at the actual animated hitbox, not a hard-coded height for an old model.
  for (let i = 0; i < 3; i++) {
    const time = await state("return s.run.time");
    await until(`return s.run.time>${time + 0.2}`);
    await page.evaluate(async ({id, part}) => {
      const urls = performance.getEntriesByType('resource').map(e => e.name);
      const fiber = await import(urls.find(n => n.includes('@react-three_fiber')));
      const art = await import(urls.find(n => n.includes('/src/game/Art.tsx')));
      const root = fiber._roots.get(document.querySelector('canvas')).store.getState();
      let box;
      root.scene.traverse(o => { if (o.userData.enemyId === id && o.userData.part === part) box = o; });
      const point = box.getWorldPosition(root.camera.position.clone());
      const direction = point.sub(root.camera.position);
      const yaw = Math.atan2(-direction.x, -direction.z);
      const pitch = Math.atan2(-direction.y, Math.hypot(direction.x, direction.z));
      const previous = window.__inboxTestStore.getState().run.yaw;
      const change = Math.atan2(Math.sin(yaw - previous), Math.cos(yaw - previous));
      const event = new MouseEvent('mousemove');
      Object.defineProperties(event, {movementX:{value:-change / 0.0025}, movementY:{value:(pitch - art.presentation.pitch) / 0.002}});
      window.dispatchEvent(event);
    }, {id, part});
  }
  await page.mouse.down();
  await until(`return s.run.mag<${mag}`);
  await page.mouse.up();
  await page.mouse.up({ button: "right" });
  const time = await state("return s.run.time");
  if (await state("return s.mode==='playing'"))
    await until(`return s.mode!=='playing'||s.run.time>${time + 0.28}`);
};
const resume = async () => {
  await page
    .getByRole("button", { name: /Resume mission|Enter house/ })
    .click();
  await page.waitForTimeout(200);
  assert(
    await page.evaluate(() => !!document.pointerLockElement),
    "pointer lock should be active",
  );
};
const pause = async () => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
};
try {
  await page.goto(BASE);
  await page.waitForTimeout(1600);
  await mkdir(".playwright", { recursive: true });
  await page.screenshot({ path: ".playwright/menu.png" });
  await page.getByRole("button", { name: /New game/ }).click();
  await resume();
  const before = await state("return [...s.run.position]");
  await page.keyboard.down("KeyW");
  await until(
    `return Math.hypot(s.run.position[0]-${before[0]},s.run.position[1]-${before[1]})>.3`,
  );
  await page.keyboard.up("KeyW");
  const after = await state("return s.run.position");
  console.log(
    "Movement displacement",
    Math.hypot(before[0] - after[0], before[1] - after[1]).toFixed(2),
  );
  assert(
    Math.hypot(before[0] - after[0], before[1] - after[1]) > 0.2,
    "W moves the player",
  );
  await pause();
  const pausedTime = await state("return s.run.time");
  await page.waitForTimeout(400);
  assert.equal(
    await state("return s.run.time"),
    pausedTime,
    "pause freezes gameplay timers",
  );
  // Isolate a normal enemy at a known aim line; shoot through real pointer/mouse events and Three raycasting.
  await state(
    "s.update({position:[4,5],yaw:0,health:3,immune:0,mag:12,reserve:36,enemies:s.run.enemies.map((e,i)=>i===0?{...e,x:4.48,z:2,stun:1000,hp:3}:{...e,hp:0})});",
  );
  await resume();
  await until("return s.run.time>.7");
  for (let i = 0; i < 3; i++) await shoot();
  await page.screenshot({ path: ".playwright/gameplay.png" });
  await pause();
  assert.equal(
    await state("return s.run.enemies[0].hp"),
    0,
    "three body shots kill",
  );
  assert.equal(
    await state("return s.mail.emails[20].folder"),
    "Trash",
    "kill changes email folder",
  );
  assert.equal(await state("return s.run.kills"), 1);
  console.log(
    "PASS movement, pointer lock, pause and body-shot/email integration",
  );
  // Aiming upward changes the ray onto the separate head collider.
  await state(
    "s.update({position:[4,5],yaw:0,mag:12,enemies:s.run.enemies.map((e,i)=>i===1?{...e,x:4.48,z:2,stun:1000,hp:3}:e)});",
  );
  await resume();
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    const e = new MouseEvent("mousemove");
    Object.defineProperties(e, {
      movementX: { value: 0 },
      movementY: { value: -70 },
    });
    window.dispatchEvent(e);
  });
  const aimTime = await state("return s.run.time");
  await until(`return s.run.time>${aimTime + 0.45}`);
  await shoot("zombie-1", "head");
  await pause();
  assert.equal(
    await state("return s.run.enemies[1].hp"),
    0,
    "one aimed headshot kills",
  );
  console.log("PASS separate head hitbox");
  // Pickups via E, reload via R, herb via F.
  await state("s.update({position:[3,3.2],yaw:0,health:2,mag:0,reserve:0});");
  await resume();
  await page.keyboard.press("KeyE");
  await page.keyboard.press("KeyR");
  await until("return s.run.reload===0 && s.run.mag===12");
  await pause();
  assert.equal(await state("return s.run.mag"), 12);
  assert.equal(await state("return s.mail.emails[60].important"), true);
  await state("s.update({position:[5.4,3.2]});");
  await resume();
  await page.keyboard.press("KeyE");
  await page.keyboard.press("KeyF");
  await pause();
  assert.equal(await state("return s.run.health"), 3);
  assert.equal(await state("return s.mail.emails[80].starred"), true);
  console.log("PASS pickup, reload, herb and email preservation");
  // Real puzzle interactions and forms, with campaign bosses tested independently by the unit suite.
  await state("s.update({position:[14,5.8],yaw:0});");
  await resume();
  await page.keyboard.press("KeyE");
  await page.getByLabel("Three-digit combination").fill("314");
  await page.getByRole("button", { name: "Unlock drawer" }).click();
  assert(await state("return s.run.puzzles.includes('drawer')"));
  await state("s.update({position:[17,3],yaw:0,keys:['study']});");
  await resume();
  await page.keyboard.press("KeyE");
  const assignments = [
    ["Summer internship application open · 7", "Internships"],
    ["National hackathon / robothon confirmation · 1", "Hackathons"],
    ["National hackathon / robothon confirmation · 2", "Hackathons"],
    ["Workshop event registration successful · 1", "Events"],
    ["Summer internship application open · 8", "Internships"],
    ["Workshop event registration successful · 2", "Events"],
  ];
  for (const [title, category] of assignments) {
    await page
      .getByRole("button")
      .filter({ has: page.getByText(title, { exact: true }) })
      .click();
    await page
      .getByRole("button", {
        name: new RegExp(`^${category}\\s*\\d assigned$`),
      })
      .click();
  }
  await page.getByRole("button", { name: "Verify classification" }).click();
  assert(await state("return s.run.keys.includes('bedroom')"));
  assert.deepEqual(await state("return s.mail.emails[100].labels"), [
    "Hackathons",
  ]);
  await state("s.update({position:[5,10],yaw:0});");
  await resume();
  await page.keyboard.press("KeyE");
  await page.getByLabel("Three-digit combination").fill("726");
  await page.getByRole("button", { name: "Unlock safe" }).click();
  assert(await state("return s.run.keys.includes('storage')"));
  console.log("PASS all three puzzle UIs and their email labels");
  await page
    .getByRole("button", { name: "Virtual mailbox", exact: true })
    .click();
  await page.getByRole("button", { name: "Activity Log", exact: true }).click();
  assert(
    (await page.getByText("Zombie eliminated", { exact: true }).count()) > 0,
  );
  await page.screenshot({ path: ".playwright/mailbox.png" });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  const snapshot = await state(
    "s.save();return {puzzles:s.run.puzzles,kills:s.run.kills,operations:s.mail.operations.length};",
  );
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  assert.deepEqual(
    await state(
      "return {puzzles:s.run.puzzles,kills:s.run.kills,operations:s.mail.operations.length}",
    ),
    snapshot,
  );
  console.log("PASS mailbox audit and refresh/Continue persistence");
  // Finish a weakened final boss using actual raycasts, then validate the exported victory report.
  await state(
    "s.update({position:[20,14],yaw:0,mag:12,health:3,bosses:[0,1,2],keys:['study','bedroom','storage','final'],enemies:s.run.enemies.map(e=>e.boss===3?{...e,x:20.48,z:11,hp:3,stun:1000}:{...e,hp:0})});",
  );
  await resume();
  const settle = await state("return s.run.time");
  await until(`return s.run.time>${settle + 0.5}`);
  for (let i = 0; i < 3; i++) await shoot("boss-3");
  await page.getByRole("heading", { name: "INBOX RESTORED." }).waitFor();
  assert.equal(await state("return s.mail.emails[200].folder"), "Deleted");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download cleanup report" }).click(),
  ]);
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(exported.realMessagesModified, 0);
  assert.equal(exported.metrics.deleted, 20);
  assert.equal(exported.bossesDefeated, 4);
  console.log(
    "PASS final-boss raycasts, victory screen and actual JSON report",
  );
  // Corrupt data must remain untouched even when navigating settings or closing the page.
  await page.addInitScript(() => {
    localStorage.setItem("inbox-evil-v1", "{broken-json");
  });
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Mute audio", exact: true }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("inbox-evil-v1")),
    "{broken-json",
  );
  assert((await page.getByRole("alert").count()) > 0);
  console.log("PASS corrupt-save preservation");
  assert.deepEqual(errors, [], "no browser runtime errors");
  assert.deepEqual(external, [], "no external/email network requests");
  console.log("PASS runtime safety: no errors, no external requests");
} catch (error) {
  await page.screenshot({ path: ".playwright/failure.png" });
  throw error;
} finally {
  await browser.close();
}
