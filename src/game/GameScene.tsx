import { memo, Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text as DreiText } from "@react-three/drei";
import type { ComponentProps } from "react";
function Text(props: ComponentProps<typeof DreiText>) {
  return <DreiText font="/fonts/house-labels.woff" {...props} />;
}
import * as THREE from "three";
import { useGame, enemyActive, type Enemy } from "../store/game";
import {
  bossConfigs,
  clearLine,
  doors,
  furniture,
  interactions,
  move,
  obstacles,
  pickupDefs,
  rooms,
  walls,
} from "./world";
import { sound } from "../utils/audio";
import { advanceRun } from "./systems";
const ZERO = new THREE.Vector2(0, 0);
function Box({
  p,
  size,
  color,
  solid = true,
}: {
  p: [number, number, number];
  size: [number, number, number];
  color: string;
  solid?: boolean;
}) {
  return (
    <mesh
      position={p}
      userData={solid ? { solid: true } : {}}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.87} />
    </mesh>
  );
}
function House() {
  const keys = useGame((s) => s.run.keys);
  return (
    <group>
      {rooms.map((r, i) => (
        <group key={r.name}>
          <Box
            p={[r.x, -0.12, r.z]}
            size={[7.85, 0.2, 8.85]}
            color={
              [
                "#474940",
                "#574d40",
                "#414c47",
                "#4b4942",
                "#44473c",
                "#473c45",
              ][i]
            }
          />
          <Text
            position={[r.x, 0.015, r.z + 3.6]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.22}
            color="#a8a58b"
          >
            {r.name.toUpperCase()}
          </Text>
          {i % 2 === 0 ? (
            <pointLight position={[r.x, 2.9, r.z]} color="#b3c4c0" intensity={8} distance={10} decay={2} />
          ) : null}
          <mesh position={[r.x, 3.05, r.z]}>
            <cylinderGeometry args={[0.28, 0.4, 0.15, 8]} />
            <meshStandardMaterial
              color="#c4ac7f"
              emissive="#e8be7e"
              emissiveIntensity={0.7}
            />
          </mesh>
          {Array.from({ length: 4 }, (_, j) => (
            <Box
              key={j}
              p={[r.x - 2 + j * 0.65, 0.015, r.z + 2.3 + (j % 2) * 0.3]}
              size={[0.3, 0.02, 0.42]}
              color="#b2aa8c"
              solid={false}
            />
          ))}
          <Box
            p={[r.x, 1.8, i < 3 ? 0.18 : 17.82]}
            size={[1.7, 1.5, 0.08]}
            color="#243c46"
          />
          <Box
            p={[r.x, 1.8, i < 3 ? 0.24 : 17.76]}
            size={[0.06, 1.5, 0.04]}
            color="#9b9277"
          />
        </group>
      ))}
      {walls.map((w, i) => (
        <group key={`w${i}`}>
          <Box p={[w.x, w.h / 2, w.z]} size={[w.w, w.h, w.d]} color="#696a5b" />
          <Box
            p={[w.x, 0.15, w.z]}
            size={[w.w + 0.03, 0.25, w.d + 0.03]}
            color="#302f29"
          />
        </group>
      ))}
      {furniture.map((f, i) => (
        <group key={i}>
          <Box
            p={[f.x, f.h / 2, f.z]}
            size={[f.w, f.h, f.d]}
            color={
              f.kind === "sofa"
                ? "#536354"
                : f.kind === "bed"
                  ? "#858373"
                  : "#5c4938"
            }
          />
          {f.kind === "shelf" ? (
            Array.from({ length: 3 }, (_, j) => (
              <group key={j}>
                <Box
                  p={[f.x, f.h * 0.25 + j * 0.6, f.z + 0.02]}
                  size={[f.w + 0.08, 0.08, f.d + 0.1]}
                  color="#302c23"
                />
                {Array.from({ length: 5 }, (_, k) => (
                  <Box
                    key={k}
                    p={[
                      f.x - f.w * 0.35 + k * f.w * 0.16,
                      0.55 + j * 0.6,
                      f.z + f.d * 0.38,
                    ]}
                    size={[0.1, 0.32, 0.18]}
                    color={["#8a7751", "#556f66", "#87594e"][k % 3]}
                    solid={false}
                  />
                ))}
              </group>
            ))
          ) : (
            <Box
              p={[f.x, f.h + 0.04, f.z]}
              size={[f.w + 0.08, 0.08, f.d + 0.08]}
              color={f.kind === "bed" ? "#b8b09a" : "#806b50"}
            />
          )}
        </group>
      ))}
      {doors.map((d) => {
        const locked = !!d.requires && !keys.includes(d.requires);
        return (
          <group key={d.id}>
            <Box
              p={[d.x, 3.2, d.z]}
              size={d.axis === "z" ? [0.32, 0.6, 2.5] : [2.5, 0.6, 0.32]}
              color="#302f27"
            />
            {locked ? (
              <Box
                p={[d.x, 1.45, d.z]}
                size={d.axis === "z" ? [0.26, 2.9, 2.35] : [2.35, 2.9, 0.26]}
                color="#5e5240"
              />
            ) : null}
            <Text
              position={[
                d.x + (d.axis === "z" ? -0.2 : 0),
                2.6,
                d.z + (d.axis === "x" ? -0.2 : 0),
              ]}
              rotation={[0, d.axis === "z" ? -Math.PI / 2 : 0, 0]}
              fontSize={0.13}
              maxWidth={2}
              color={locked ? "#edb478" : "#b8cfaa"}
            >
              {locked ? "LOCKED" : "OPEN"}
            </Text>
          </group>
        );
      })}
      {interactions.map((o) => (
        <group key={o.id} position={[o.x, 1.25, o.z]}>
          <mesh>
            <octahedronGeometry args={[0.17]} />
            <meshStandardMaterial
              color="#c8ac64"
              emissive="#baa15c"
              emissiveIntensity={0.5}
            />
          </mesh>
          <Text position={[0, 0.35, 0]} fontSize={0.13} color="#eddaa0">
            {o.id === "note"
              ? "NOTE"
              : o.id === "digits"
                ? "DIGITS"
                : o.id.toUpperCase()}
          </Text>
        </group>
      ))}
    </group>
  );
}
function Creature({ enemy: e }: { enemy: Enemy }) {
  const group = useRef<THREE.Group>(null);
  const color = e.boss >= 0 ? bossConfigs[e.boss].color : "#75876b";
  const scale = e.boss >= 0 ? 1.65 : 1;
  useFrame(({ clock }) => {
    if (group.current) {
      const player = useGame.getState().run.position;
      group.current.rotation.y = Math.atan2(player[0] - e.x, player[1] - e.z);
      group.current.rotation.z =
        e.hp <= 0 ? Math.PI / 2 : Math.sin(clock.elapsedTime * 4 + e.x) * 0.035;
    }
  });
  return (
    <group
      ref={group}
      position={[e.x, e.hp <= 0 ? 0.14 : 0, e.z]}
      scale={scale}
    >
      <mesh
        position={[0, 1, 0]}
        userData={{ enemyId: e.id, part: "body" }}
        castShadow
      >
        <capsuleGeometry args={[0.24, 0.52, 4, 8]} />
        <meshStandardMaterial
          color={e.windup > 0 ? "#d99858" : e.stun > 0 ? "#b6b69b" : color}
        />
      </mesh>
      <mesh
        position={[0, 1.58, 0]}
        userData={{ enemyId: e.id, part: "head" }}
        castShadow
      >
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-1, 1].map((i) => (
        <group key={i}>
          <Box
            p={[i * 0.16, 0.35, 0]}
            size={[0.19, 0.7, 0.22]}
            color="#343b33"
            solid={false}
          />
          <Box
            p={[i * 0.4, 1.05, 0.18]}
            size={[0.18, 0.65, 0.2]}
            color={color}
            solid={false}
          />
          <mesh position={[i * 0.095, 1.63, 0.188]}>
            <boxGeometry args={[0.055, 0.035, 0.02]} />
            <meshBasicMaterial color="#e1b575" />
          </mesh>
        </group>
      ))}
      {e.boss >= 0 && e.hp > 0 ? (
        <Text
          position={[0, 2.2, 0]}
          fontSize={0.11}
          color="#edd6b1"
          maxWidth={2}
        >
          {bossConfigs[e.boss].name}
        </Text>
      ) : null}
    </group>
  );
}
function Pickups() {
  const collected = useGame((s) => s.run.collected);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.children.forEach((child, i) => {
        child.rotation.y = clock.elapsedTime + i;
        child.position.y = 0.65 + Math.sin(clock.elapsedTime * 2 + i) * 0.1;
      });
  });
  return (
    <group ref={ref}>
      {pickupDefs
        .filter((p) => !collected.includes(p.id))
        .map((p) => (
          <group key={p.id} position={[p.x, 0.6, p.z]}>
            {p.kind === "ammo" ? (
              <Box
                p={[0, 0, 0]}
                size={[0.45, 0.3, 0.3]}
                color="#c1a46a"
                solid={false}
              />
            ) : (
              <mesh>
                <coneGeometry args={[0.23, 0.6, 5]} />
                <meshStandardMaterial
                  color="#9fc58a"
                  emissive="#75a968"
                  emissiveIntensity={0.7}
                />
              </mesh>
            )}
            <pointLight
              color={p.kind === "ammo" ? "#e3bc7b" : "#a6d288"}
              intensity={1.2}
              distance={2}
            />
          </group>
        ))}
    </group>
  );
}
function Player() {
  const flash = useGame((s) => s.run.time - s.run.shotAt < 0.08);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const r = useGame.getState().run;
    if (ref.current) {
      ref.current.position.set(r.position[0], 0, r.position[1]);
      ref.current.rotation.y = r.yaw;
    }
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 1.02, 0]}><capsuleGeometry args={[0.27, 0.62, 5, 10]} /><meshStandardMaterial color="#263b3b" /></mesh>
      <mesh position={[0, 1.58, 0]}><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color="#c3ad92" /></mesh>
      <Box
        p={[0, 1.5, -0.16]}
        size={[0.31, 0.12, 0.06]}
        color="#385b59"
        solid={false}
      />
      {[-1, 1].map((i) => (
        <group key={i}>
          <mesh position={[i * 0.15, 0.4, 0]}><capsuleGeometry args={[0.08, 0.5, 4, 6]} /><meshStandardMaterial color="#252d2a" /></mesh>
          <mesh position={[i * 0.35, 1.05, -0.1]} rotation={[0, 0, i * 0.12]}><capsuleGeometry args={[0.07, 0.42, 4, 6]} /><meshStandardMaterial color="#455c58" /></mesh>
        </group>
      ))}
      <group position={[0.32, 1.18, -0.43]} rotation={[0.12, 0, 0]}><mesh><boxGeometry args={[0.13, 0.16, 0.48]} /><meshStandardMaterial color="#171b1a" metalness={0.7} roughness={0.3} /></mesh><mesh position={[0, -0.12, 0.09]}><boxGeometry args={[0.12, 0.22, 0.15]} /><meshStandardMaterial color="#303a38" /></mesh></group>
      {flash ? (
        <mesh position={[0.3, 1.16, -0.75]}>
          <sphereGeometry args={[0.17, 6, 4]} />
          <meshBasicMaterial color="#ffe3a1" />
        </mesh>
      ) : null}
    </group>
  );
}
function Controller() {
  const { camera, scene, gl } = useThree();
  const input = useRef(new Set<string>());
  const yaw = useRef(useGame.getState().run.yaw);
  const pitch = useRef(0.08);
  const firing = useRef(false);
  const aiming = useRef(false);
  const fireTimer = useRef(0);
  const step = useRef(0);
  const saveTimer = useRef(0);
  const ray = useRef(new THREE.Raycaster());
  const cameraRay = useRef(new THREE.Raycaster());
  const ready = useRef(false);
  const occludersRef = useRef<THREE.Object3D[]>([]);
  const shotTargetsRef = useRef<THREE.Object3D[]>([]);
  const targetRefresh = useRef(0);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    const onMove = (e: MouseEvent) => {
      if (
        useGame.getState().mode === "playing" &&
        document.pointerLockElement === canvas
      ) {
        yaw.current -= e.movementX * 0.0025;
        pitch.current = THREE.MathUtils.clamp(
          pitch.current + e.movementY * 0.002,
          -0.55,
          0.7,
        );
      }
    };
    const lock = () => {
      if (
        useGame.getState().mode === "playing" &&
        document.pointerLockElement !== canvas
      )
        useGame.getState().setMode("paused");
    };
    const down = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (
        s.mode === "playing" &&
        ["Tab", "Space", "ArrowUp", "ArrowDown"].includes(e.code)
      )
        e.preventDefault();
      if (e.repeat) return;
      input.current.add(e.code);
      if (s.mode !== "playing") return;
      if (e.code === "Escape") {
        s.setMode("paused");
        document.exitPointerLock?.();
      }
      if (e.code === "Tab" || e.code === "KeyM") {
        s.setPanel(e.code === "Tab" ? "inventory" : "map");
        document.exitPointerLock?.();
      }
      if (
        e.code === "KeyR" &&
        s.run.reload <= 0 &&
        s.run.mag < 12 &&
        s.run.reserve > 0
      ) {
        s.update({
          reload: Math.max(1.15, 1.5 - Math.floor(s.run.xp / 150) * 0.035),
        });
        sound("reload", s.volume);
      }
      if (e.code === "KeyF" && s.run.herbs > 0 && s.run.health < 3) {
        s.update({
          health: s.run.health + 1,
          herbs: s.run.herbs - 1,
          regen: 0,
        });
        s.save();
        sound("pickup", s.volume);
      }
      if (e.code === "KeyE") {
        const r = s.run;
        const p = pickupDefs.find(
          (p) =>
            !r.collected.includes(p.id) &&
            Math.hypot(p.x - r.position[0], p.z - r.position[1]) < 1.7 &&
            clearLine(r.position, [p.x, p.z], obstacles(r.keys)),
        );
        if (p) {
          s.collect(p.id);
          sound("pickup", s.volume);
          return;
        }
        const o = interactions.find(
          (o) =>
            Math.hypot(o.x - r.position[0], o.z - r.position[1]) < 2 &&
            clearLine(r.position, [o.x, o.z], walls),
        );
        if (o) {
          if (o.id === "supply") {
            if (r.mag + r.reserve < 36) {
              s.action(
                "supply-first",
                "Emergency supply terminal",
                "supply",
                "MARK_IMPORTANT",
                ["mail-69"],
              );
              s.update({ reserve: Math.max(36, r.reserve) });
              s.notify("Emergency ammo restored · faculty instruction secured");
              s.save();
            } else
              s.notify(
                "Emergency supply available when total ammunition falls below 36.",
              );
            return;
          }
          if (o.id === "note") {
            s.update({ note: true });
            s.notify("Sofa note: the drawer combination is 314.");
          } else if (o.id === "digits") {
            s.update({ digits: true });
            s.notify("Drawer slips: first = 7 · second = 2 · third = 6");
          } else {
            s.setPanel(o.id);
            document.exitPointerLock?.();
          }
        }
      }
    };
    const up = (e: KeyboardEvent) => input.current.delete(e.code);
    const mouseDown = (e: MouseEvent) => {
      if (e.button === 2) { aiming.current = true; return; }
      if (
        e.button === 0 &&
        useGame.getState().mode === "playing" &&
        document.pointerLockElement === canvas
      )
        firing.current = true;
    };
    const release = (e?: MouseEvent) => {
      if (e?.button === 2) aiming.current = false;
      firing.current = false;
    };
    const blur = () => {
      input.current.clear();
      firing.current = false;
      if (useGame.getState().mode === "playing")
        useGame.getState().setMode("paused");
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", release);
    window.addEventListener("blur", blur);
    document.addEventListener("pointerlockchange", lock);
    const unsub = useGame.subscribe((s, prev) => {
      if (s.mode !== "playing") {
        input.current.clear();
        firing.current = false;
        if (document.pointerLockElement) document.exitPointerLock?.();
      }
      if (s.mode === "playing" && prev.mode !== "playing")
        yaw.current = s.run.yaw;
    });
    return () => {
      unsub();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", release);
      canvas.removeEventListener("contextmenu", (e) => e.preventDefault());
      window.removeEventListener("blur", blur);
      document.removeEventListener("pointerlockchange", lock);
    };
  }, [gl]);
  useFrame((_, rawDelta) => {
    const s = useGame.getState();
    const r = s.run;
    const dt = Math.min(rawDelta, 0.05);
    const solids = obstacles(r.keys);
    targetRefresh.current -= dt;
    if (targetRefresh.current <= 0 || !shotTargetsRef.current.length) {
      occludersRef.current.length = 0;
      shotTargetsRef.current.length = 0;
      scene.traverse((obj) => {
        if (obj.userData.solid) {
          occludersRef.current.push(obj);
          shotTargetsRef.current.push(obj);
        } else if (obj.userData.enemyId) shotTargetsRef.current.push(obj);
      });
      targetRefresh.current = 0.25;
    }
    const occluders = occludersRef.current;
    const shotTargets = shotTargetsRef.current;
    const target = new THREE.Vector3(r.position[0], 1.45, r.position[1]);
    const forward = new THREE.Vector3(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      -Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    );
    const shoulder = new THREE.Vector3(
      Math.cos(yaw.current) * 0.48,
      0,
      -Math.sin(yaw.current) * 0.48,
    );
    const aimBlend = aiming.current ? 1 : 0;
    const cameraDistance = THREE.MathUtils.lerp(3.25, 2.1, aimBlend);
    const desired = target.clone().addScaledVector(forward, -cameraDistance).addScaledVector(shoulder, 1 + aimBlend * 0.35);
    const dir = desired.clone().sub(target);
    const distance = dir.length();
    cameraRay.current.set(target, dir.normalize());
    const hit = cameraRay.current
      .intersectObjects(occluders, false)
      .find((h) => h.object.userData.solid && h.distance < distance);
    if (hit)
      desired
        .copy(target)
        .addScaledVector(dir, Math.max(0.2, hit.distance - 0.2));
    if (!ready.current) {
      camera.position.copy(desired);
      ready.current = true;
    }
    camera.position.lerp(desired, 1 - Math.exp(-dt * 15));
    const actualDirection = camera.position.clone().sub(target);
    const actualDistance = actualDirection.length();
    cameraRay.current.set(target, actualDirection.normalize());
    const actualHit = cameraRay.current
      .intersectObjects(occluders, false)
      .find((h) => h.object.userData.solid && h.distance < actualDistance);
    if (actualHit)
      camera.position
        .copy(target)
        .addScaledVector(
          actualDirection,
          Math.max(0.15, actualHit.distance - 0.15),
        );
    const look = camera.position.clone().addScaledVector(forward, 10);
    if (r.immune > 1.1 && s.mode === "playing")
      look.x += Math.sin(r.time * 60) * 0.025;
    camera.lookAt(look);
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = THREE.MathUtils.lerp(perspective.fov, aiming.current ? 57 : 68, 1 - Math.exp(-dt * 10));
    perspective.updateProjectionMatrix();
    if (s.mode !== "playing") return;
    step.current += dt;
    if (step.current < 1 / 30) return;
    const delta = step.current;
    step.current = 0;
    fireTimer.current -= delta;
    const tick = advanceRun(
      r,
      delta,
      {
        strafe:
          Number(input.current.has("KeyD")) - Number(input.current.has("KeyA")),
        forward:
          Number(input.current.has("KeyW")) - Number(input.current.has("KeyS")),
        sprint:
          input.current.has("ShiftLeft") || input.current.has("ShiftRight"),
        aiming: aiming.current,
        yaw: yaw.current,
      },
      solids,
    );
    s.update(tick.patch);
    if (tick.damaged) sound("damage", s.volume);
    else if (tick.attacked) sound("attack", s.volume);
    const {
      health,
      mag,
      reload,
      position: [x, z],
    } = tick.patch;
    if (health <= 0) {
      s.setMode("dead");
      sound("damage", s.volume);
      return;
    }
    if (firing.current && aiming.current && fireTimer.current <= 0 && reload === 0) {
      fireTimer.current = 0.26;
      if (mag <= 0) {
        sound("empty", s.volume);
        s.notify("Magazine empty · press R to reload");
      } else {
        s.update({ mag: mag - 1, shotAt: r.time });
        sound("shoot", s.volume);
        ray.current.setFromCamera(ZERO, camera);
        const hits = ray.current.intersectObjects(shotTargets, false);
        const first = hits.find(
          (h) =>
            h.object.userData.solid ||
            (h.object.userData.enemyId &&
              useGame
                .getState()
                .run.enemies.find(
                  (e) =>
                    e.id === h.object.userData.enemyId &&
                    enemyActive(e, useGame.getState().run),
                )),
        );
        if (first?.object.userData.enemyId) {
          // Also check the line from muzzle, so third-person aiming cannot shoot around corners.
          if (clearLine([x, z], [first.point.x, first.point.z], solids)) {
            s.hit(
              first.object.userData.enemyId,
              first.object.userData.part === "head",
            );
            sound("hit", s.volume);
          }
        }
      }
    }
    saveTimer.current += delta;
    if (saveTimer.current > 3) {
      s.save();
      saveTimer.current = 0;
    }
  });
  return null;
}
function Enemies() {
  const run = useGame((s) => s.run);
  return (
    <>
      {run.enemies
        .filter((e) => e.hp > 0 && enemyActive(e, run))
        .map((e) => (
          <Creature key={e.id} enemy={e} />
        ))}
    </>
  );
}
function World() {
  return (
    <>
      <color attach="background" args={["#192521"]} />
      <fog attach="fog" args={["#25352f", 12, 40]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#b8d1d5", "#42412f", 1.2]} />
      <directionalLight position={[6, 15, 8]} intensity={1.4} color="#dac9a3" />
      <House />
      <Pickups />
      <Player />
      <Enemies />
      <Controller />
    </>
  );
}
export const GameScene = memo(function GameScene() {
  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.25]}
      camera={{ fov: 66, near: 0.08, far: 55 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.domElement.id = "game-canvas";
        gl.domElement.addEventListener("webglcontextlost", () => {
          useGame.getState().setMode("paused");
          useGame
            .getState()
            .notify("Graphics context lost. Reload to resume from your save.");
        });
      }}
    >
      <Suspense fallback={null}>
        <World />
      </Suspense>
    </Canvas>
  );
});
export function resume() {
  const s = useGame.getState();
  s.setMode("playing");
  const canvas = document.querySelector("canvas");
  try {
    const result = canvas?.requestPointerLock();
    if (result && typeof result.catch === "function")
      result.catch(() => {
        s.setMode("paused");
        s.notify(
          "Mouse capture was blocked. Click Resume again, or allow pointer lock in this browser.",
        );
      });
  } catch {
    s.setMode("paused");
    s.notify(
      "Pointer lock requires a desktop browser that permits mouse capture.",
    );
  }
}
