import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as T from "three";
import { useGame } from "../store/game";
import { pickupDefs, rooms } from "./world";
export const presentation = {
  aiming: false,
  quality: (() => {
    try {
      const q = localStorage.getItem("dead-inbox-quality");
      return q && ["low", "medium", "high"].includes(q) ? q : "medium";
    } catch {
      return "medium";
    }
  })(),
};
export function Batch({ children }: { children: ReactNode }) {
  const root = useRef<T.Group>(null);
  useLayoutEffect(() => {
    const g = root.current!;
    g.updateMatrixWorld(true);
    const buckets = new Map<
      string,
      {
        material: T.MeshStandardMaterial;
        parts: T.BufferGeometry[];
        originals: T.Mesh[];
      }
    >();
    g.traverse((o) => {
      if (
        !(o instanceof T.Mesh) ||
        !(o.material instanceof T.MeshStandardMaterial)
      )
        return;
      const m = o.material;
      const key = [
        m.color.getHex(),
        m.map?.uuid,
        m.emissive.getHex(),
        m.roughness,
        m.metalness,
        Object.keys(o.geometry.attributes).sort().join(","),
        !!o.geometry.index,
      ].join(":");
      let b = buckets.get(key);
      if (!b) {
        b = { material: m, parts: [], originals: [] };
        buckets.set(key, b);
      }
      b.parts.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
      b.originals.push(o);
    });
    const merged: T.Mesh[] = [];
    for (const b of buckets.values()) {
      const geometry = mergeGeometries(b.parts);
      b.parts.forEach((p) => p.dispose());
      if (!geometry) continue;
      const mesh = new T.Mesh(geometry, b.material);
      g.add(mesh);
      merged.push(mesh);
      b.originals.forEach((o) => (o.visible = false));
    }
    return () => {
      merged.forEach((m) => {
        g.remove(m);
        m.geometry.dispose();
      });
      buckets.forEach((b) => b.originals.forEach((o) => (o.visible = true)));
    };
  }, [children]);
  return <group ref={root}>{children}</group>;
}
export function Asset({
  name,
  position = [0, 0, 0],
  scale = 1,
}: {
  name: string;
  position?: [number, number, number];
  scale?: number;
}) {
  const { scene } = useGLTF(`/models/${name}.glb`);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return (
    <primitive
      object={clone}
      position={position}
      scale={scale}
      dispose={null}
    />
  );
}
export function LicensedProp({
  name,
  position,
  width = 1,
  fit,
  rotation = 0,
}: {
  name: string;
  position: [number, number, number];
  width?: number;
  fit?: [number, number, number];
  rotation?: number;
}) {
  const { scene } = useGLTF(`/assets/quaternius/${name}.glb`);
  const data = useMemo(() => {
    const model = scene.clone(true);
    model.rotation.y = rotation;
    model.traverse((o) => {
      if (o instanceof T.Mesh) o.userData.solid = true;
    });
    model.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    return {
      model,
      scale: fit
        ? new T.Vector3(
            fit[0] / Math.max(size.x, 0.01),
            fit[1] / Math.max(size.y, 0.01),
            fit[2] / Math.max(size.z, 0.01),
          )
        : width / Math.max(size.x, 0.01),
      offset: new T.Vector3(-center.x, -box.min.y, -center.z),
    };
  }, [scene, width, fit?.[0], fit?.[1], fit?.[2], rotation]);
  return (
    <group position={position} scale={data.scale}>
      <group position={data.offset}>
        <primitive object={data.model} dispose={null} />
      </group>
    </group>
  );
}
export function Actor({ id }: { id?: string }) {
  const initial = useGame.getState().run.enemies.find((e) => e.id === id);
  const name = id
    ? initial!.boss < 0
      ? "infected"
      : `boss-${initial!.boss}`
    : "survivor";
  const { scene } = useGLTF(`/models/${name}.glb`);
  const model = useMemo(() => scene.clone(true), [scene]);
  const root = useRef<T.Group>(null);
  const flash = useRef<T.Mesh>(null);
  const last = useRef(new T.Vector3());
  const phase = useRef(0);
  const facing = useRef(0);
  const nodes = useMemo(
    () =>
      Object.fromEntries(
        [
          "legL",
          "legR",
          "kneeL",
          "kneeR",
          "armL",
          "armR",
          "elbowL",
          "elbowR",
          "head",
        ].map((n) => [n, model.getObjectByName(n)!]),
      ),
    [model],
  );
  useFrame((_, dt) => {
    const s = useGame.getState(),
      r = s.run,
      e = id ? r.enemies.find((e) => e.id === id) : undefined;
    if (!root.current) return;
    const x = e?.x ?? r.position[0],
      z = e?.z ?? r.position[1];
    const speed = Math.min(
      5,
      Math.hypot(x - last.current.x, z - last.current.z) / Math.max(dt, 0.01),
    );
    last.current.set(x, 0, z);
    if (s.mode !== "playing" && s.mode !== "dead") {
      root.current.position.set(x, 0, z);
      return;
    }
    phase.current += speed * dt * 5.5;
    const gait = Math.min(1, speed / 2.5);
    const angle = e
      ? Math.atan2(r.position[0] - x, r.position[1] - z) + Math.PI
      : r.yaw;
    facing.current +=
      Math.atan2(
        Math.sin(angle - facing.current),
        Math.cos(angle - facing.current),
      ) *
      (1 - Math.exp(-dt * 16));
    root.current.position.set(x, Math.sin(phase.current * 2) * gait * 0.025, z);
    root.current.rotation.set(
      e?.stun ? -0.12 : 0,
      facing.current,
      e?.windup ? -0.12 : 0,
    );
    const p = phase.current;
    for (const [side, sign] of [
      ["L", 1],
      ["R", -1],
    ] as const) {
      nodes[`leg${side}`].rotation.x = Math.sin(p) * gait * 0.55 * sign;
      nodes[`knee${side}`].rotation.x =
        Math.max(0, -Math.sin(p) * sign) * gait * 0.5;
      nodes[`arm${side}`].rotation.x = e
        ? -0.45 + Math.sin(p) * gait * 0.2 * sign
        : presentation.aiming
          ? 1.35
          : Math.sin(p) * gait * 0.35 * -sign;
      nodes[`elbow${side}`].rotation.x = e
        ? -0.2
        : presentation.aiming
          ? 0.35
          : -0.18;
    }
    if (!e) {
      if (r.reload > 0) {
        nodes.armR.rotation.x = -0.9;
        nodes.elbowL.rotation.x = -1.8;
      }
      const recoil = Math.max(0, 1 - (r.time - r.shotAt) / 0.16);
      nodes.armR.rotation.x -= recoil * 0.25;
      const pistol = model.getObjectByName("pistol");
      if (pistol)
        pistol.rotation.x = -nodes.armR.rotation.x - nodes.elbowR.rotation.x;
      if (flash.current) flash.current.visible = recoil > 0.35;
      if (r.health <= 0) root.current.rotation.z = Math.PI * 0.45;
    } else {
      if (e.hp <= 0)
        root.current.rotation.z = Math.min(
          1.5,
          (r.time - (e.diedAt ?? r.time)) * 2,
        );
      nodes.head.rotation.z = 0.15 + Math.sin(r.time * 2 + e.x) * 0.09;
      if (e.windup > 0) nodes.armR.rotation.x = -2.1;
      if (e.stun > 0) nodes.head.rotation.x = -0.4;
      else nodes.head.rotation.x = 0.12;
    }
  });
  const scale =
    initial?.boss !== undefined && initial.boss >= 0
      ? [1.65, 1.8, 1.65, 1.85][initial.boss]
      : 1;
  return (
    <group ref={root} scale={scale}>
      <primitive object={model} dispose={null} />
      {!id ? (
        <mesh ref={flash} position={[0.25, 1.35, -0.95]} visible={false}>
          <sphereGeometry args={[0.09, 5, 4]} />
          <meshBasicMaterial color="#ffe2a5" />
        </mesh>
      ) : null}
      {!id ? (
        <mesh position={[0.35, 1.4, -0.8]} visible={false} name="muzzle" />
      ) : null}
    </group>
  );
}
export function Collectibles() {
  const collected = useGame((s) => s.run.collected);
  return (
    <>
      {pickupDefs
        .filter((p) => !collected.includes(p.id))
        .map((p) => (
          <Asset
            key={p.id}
            name={p.kind === "ammo" ? "ammo" : "herb"}
            position={[p.x, 0.15, p.z]}
            scale={1.3}
          />
        ))}
    </>
  );
}
let maps: Record<string, T.CanvasTexture> | undefined;
export function surface(kind: string) {
  if (!maps) {
    maps = {};
    for (const type of ["wood", "plaster", "paper", "fabric"]) {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle =
        type === "wood"
          ? "#79644e"
          : type === "plaster"
            ? "#b4af96"
            : type === "fabric"
              ? "#7e8573"
              : "#ddd3b1";
      ctx.fillRect(0, 0, 256, 256);
      let seed = 42;
      for (let i = 0; i < 2400; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const x = seed % 256;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const y = seed % 256;
        ctx.fillStyle = i % 2 ? "#00000013" : "#ffffff0e";
        ctx.fillRect(x, y, type === "wood" ? 1 : 2, type === "wood" ? 30 : 2);
      }
      if (type === "wood") {
        ctx.strokeStyle = "#28201866";
        for (let i = 0; i < 256; i += 32) {
          ctx.strokeRect(i, 0, 32, 256);
          ctx.strokeRect(i, (i * 7) % 256, 32, 128);
        }
      }
      if (type === "plaster") {
        ctx.strokeStyle = "#6c73532a";
        for (let x = 0; x < 256; x += 32)
          for (let y = 0; y < 256; y += 32) {
            ctx.beginPath();
            ctx.ellipse(x, y, 5, 11, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
      }
      const map = new T.CanvasTexture(c);
      map.wrapS = map.wrapT = T.RepeatWrapping;
      map.repeat.set(type === "wood" ? 3 : 2, 2);
      map.colorSpace = T.SRGBColorSpace;
      maps[type] = map;
    }
  }
  return maps[kind] ?? maps.wood;
}
function Part({
  p,
  s,
  c = "#5d4431",
}: {
  p: [number, number, number];
  s: [number, number, number];
  c?: string;
}) {
  return (
    <mesh position={p} scale={s}>
      <boxGeometry />
      <meshStandardMaterial
        color={c}
        map={surface(c === "#aaa58d" ? "plaster" : "wood")}
        roughness={0.85}
      />
    </mesh>
  );
}
export function Mansion() {
  return (
    <>
      {rooms.map((r, i) => (
        <group key={i}>
          <Part p={[r.x, 3.55, r.z]} s={[7.8, 0.12, 8.8]} c="#aaa58d" />
          <Part
            p={[r.x, 0.025, r.z]}
            s={[3.2, 0.025, 2.8]}
            c={i === 1 ? "#6b493e" : "#4b514a"}
          />
          {[0, 1, 2, 3].map((j) => (
            <group key={j}>
              <Part
                p={[r.x - 2.7 + j * 1.8, 1.05, i < 3 ? 0.26 : 17.74]}
                s={[1.65, 1.9, 0.08]}
              />
              <Part
                p={[r.x - 2.7 + j * 1.8, 2.55, i < 3 ? 0.26 : 17.74]}
                s={[1.45, 0.7, 0.1]}
                c="#877c56"
              />
              <Part
                p={[r.x - 2.7 + j * 1.8, 2.55, i < 3 ? 0.33 : 17.67]}
                s={[1.25, 0.5, 0.03]}
                c="#374b43"
              />
            </group>
          ))}
          <Asset
            name="cabinet"
            position={[r.x + 2.5, 0, i < 3 ? 1 : 17]}
            scale={0.85}
          />
          <group position={[r.x - 2.8, 0, i < 3 ? 1 : 17]}>
            <mesh position={[0, 1.05, 0]}>
              <cylinderGeometry args={[0.035, 0.08, 2.1, 8]} />
              <meshStandardMaterial color="#4e4537" metalness={0.6} />
            </mesh>
            <mesh position={[0, 2.12, 0]}>
              <coneGeometry args={[0.35, 0.4, 12, 1, true]} />
              <meshStandardMaterial
                color="#d7c49d"
                emissive="#936b32"
                emissiveIntensity={0.6}
                side={T.DoubleSide}
              />
            </mesh>
          </group>
          {i === 1 ? (
            <>
              <Part p={[12, 0.4, 7.7]} s={[2.4, 0.8, 0.5]} />
              <Part p={[12, 1, 7.7]} s={[2.7, 0.12, 0.65]} c="#aaa58d" />
              <Part p={[12, 0.4, 7.4]} s={[1.5, 0.7, 0.05]} c="#171c18" />
              <LicensedProp
                name="coffee-table"
                position={[12, 0, 2.8]}
                fit={[1.6, 0.5, 0.7]}
              />
            </>
          ) : null}
          {i === 2 ? (
            <LicensedProp name="lamp" position={[18, 1, 2]} width={0.35} />
          ) : null}
          {i === 5 ? (
            <LicensedProp
              name="pipes"
              position={[23.4, 0, 15]}
              fit={[0.35, 2.5, 2]}
            />
          ) : null}
          {i === 5
            ? [0, 1, 2].map((j) => (
                <group key={j}>
                  <Part
                    p={[18 + j * 1.6, 1.2, 17]}
                    s={[0.75, 2.4, 0.7]}
                    c="#253c3c"
                  />
                  {[0, 1, 2, 3].map((k) => (
                    <Part
                      key={k}
                      p={[18 + j * 1.6, 0.5 + k * 0.45, 16.62]}
                      s={[0.55, 0.26, 0.02]}
                      c={k % 2 ? "#355f62" : "#894d3d"}
                    />
                  ))}
                </group>
              ))
            : null}
        </group>
      ))}
      <mesh position={[10, 0.78, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.23]} />
        <meshStandardMaterial
          color="#eee2bc"
          map={surface("paper")}
          side={T.DoubleSide}
        />
      </mesh>
    </>
  );
}
