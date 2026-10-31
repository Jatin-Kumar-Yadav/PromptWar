import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:5173");
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /New game/ }).click();
  await page.getByRole("button", { name: /Enter house/ }).click();
  await page.waitForTimeout(3000);
  await mkdir(".playwright", { recursive: true });
  await page.screenshot({ path: ".playwright/rebuild.png" });
  await page.mouse.down({button:'right'});
  await page.waitForTimeout(1600);
  await page.screenshot({path:'.playwright/licensed-aim.png'});
  await page.mouse.up({button:'right'});
  const measured = await page.evaluate(async () => {
    const frames = [];
    const start = performance.now();
    await new Promise((resolve) => {
      let last = start;
      const frame = (t) => {
        frames.push(t - last);
        last = t;
        if (t - start < 5000) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((n) => n.includes("@react-three_fiber"));
    let info = null;
    if (url) {
      const mod = await import(url);
      const root = mod._roots?.get(document.querySelector("canvas"));
      const gl = root?.store.getState().gl;
      info = gl
        ? {
            drawCalls: gl.info.render.calls,
            triangles: gl.info.render.triangles,
            geometries: gl.info.memory.geometries,
            textures: gl.info.memory.textures,
          }
        : null;
    }
    return {
      fps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
      frames: frames.length,
      info,
    };
  });
  console.log(
    JSON.stringify({
      renderer: "Chromium software SwiftShader",
      ...measured,
      errors,
    }),
  );
  if (errors.length) throw new Error(errors.join("\n"));
  await page.keyboard.press("Escape");
  if (!(await page.getByText("Catch your breath.").count()))
    throw new Error("Pause did not open");
} finally {
  await browser.close();
}
