import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGame, enemyActive } from "../store/game";
import { presentation } from "./Art";
/** F3 developer overlay; DOM text updates twice a second without React frame renders. */
export function PerformanceProbe() {
  const { gl, setDpr } = useThree();
  const budget = useRef({time: 0, frames: 0, ratio: 1, quality: ""});
  const output = useRef<HTMLOutputElement | null>(null),
    elapsed = useRef(0),
    frames = useRef(0);
  useEffect(() => {
    const node = document.createElement("output");
    node.id = "inbox-performance";
    node.hidden = true;
    Object.assign(node.style, {
      position: "fixed",
      left: "16px",
      top: "170px",
      zIndex: "60",
      background: "#09120fe8",
      color: "#d0d9be",
      padding: "12px",
      whiteSpace: "pre",
      font: "11px monospace",
      pointerEvents: "none",
    });
    document.body.appendChild(node);
    output.current = node;
    const toggle = (e: KeyboardEvent) => {
      if (e.code === "F3") {
        e.preventDefault();
        node.hidden = !node.hidden;
      }
    };
    window.addEventListener("keydown", toggle);
    return () => {
      window.removeEventListener("keydown", toggle);
      node.remove();
      output.current = null;
    };
  }, []);
  useFrame((_, dt) => {
    const b = budget.current;
    const ceiling = presentation.quality === "low" ? 0.75 : presentation.quality === "high" ? 1.25 : 1;
    if (b.quality !== presentation.quality) { b.quality = presentation.quality; b.ratio = ceiling; b.time = b.frames = 0; }
    b.time += dt; b.frames++;
    if (b.time > 3) {
      const fps = b.frames / b.time;
      const ratio = Math.max(0.55, Math.min(ceiling, b.ratio + (fps < 35 ? -0.1 : fps > 57 ? 0.05 : 0)));
      if (ratio !== b.ratio) { setDpr(ratio); b.ratio = ratio; }
      b.time = b.frames = 0;
    }
    elapsed.current += dt;
    frames.current++;
    if (elapsed.current < 0.5) return;
    const r = useGame.getState().run;
    if (output.current && !output.current.hidden)
      output.current.textContent = `FPS ${(frames.current / elapsed.current).toFixed(1)} | Frame ${((elapsed.current / frames.current) * 1000).toFixed(1)}ms\nDraws ${gl.info.render.calls} | Triangles ${gl.info.render.triangles}\nActive enemies ${r.enemies.filter((e) => enemyActive(e, r) && Math.hypot(e.x - r.position[0], e.z - r.position[1]) < 7).length}\nGeometries ${gl.info.memory.geometries} | Textures ${gl.info.memory.textures}`;
    elapsed.current = 0;
    frames.current = 0;
  });
  return null;
}
