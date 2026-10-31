import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useEffect } from "react";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as T from "three";
import { useGame } from "../store/game";
import { presentation } from "./Art";
import { archiveMaterial } from "./materials";
export const actorTargets = new Map<string, { head: T.Vector3; body: T.Vector3 }>();
/** Each actor owns its skeleton/mixer; geometry, atlas textures and materials are shared. */
export function LicensedActor({ id }: { id?: string }) {
  const e0 = useGame.getState().run.enemies.find((e) => e.id === id);
  const variants = ["archive-zombie", "archive-zombie", "zombie-rib"];
  const name = !id
    ? "survivor"
    : e0!.boss >= 0
      ? ["security", "zombie-arm", "zombie-heavy", "zombie-rib"][e0!.boss]
      : variants[Number(id.split("-")[1]) % 3];
  const gltf = useGLTF(`/assets/quaternius/${name}.glb`);
  const targets = useMemo(() => ({head: new T.Vector3(), body: new T.Vector3()}), []);
  useEffect(() => { if (id) actorTargets.set(id, targets); return () => { if (id) actorTargets.delete(id); }; }, [id, targets]);
  const pistol = useGLTF("/assets/quaternius/pistol.glb");
  const model = useMemo(() => {
    const m = clone(gltf.scene);
    m.traverse((o) => {
      if (["Knife", "WoodenBat_Saw"].includes(o.name)) o.visible = false;
      if (o instanceof T.Mesh) {
        o.castShadow = true; o.receiveShadow = true;
        o.material = Array.isArray(o.material) ? o.material.map(mat => archiveMaterial(mat, true, !id)) : archiveMaterial(o.material, true, !id);
      }
    });
    return m;
  }, [gltf.scene]);
  const bounds = useMemo(() => {
    model.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(model),
      size = b.getSize(new T.Vector3()),
      center = b.getCenter(new T.Vector3());
    return {
      scale: 1.8 / Math.max(size.y, 0.1),
      offset: new T.Vector3(-center.x, -b.min.y, -center.z),
    };
  }, [model]);
  const rig = useRef<T.Group>(null),
    root = useRef<T.Group>(null),
    flash = useRef<T.Mesh>(null);
  const { actions, mixer } = useAnimations(gltf.animations, rig);
  useEffect(()=>()=>{const skeletons=new Set<T.Skeleton>();model.traverse(o=>{if(o instanceof T.SkinnedMesh)skeletons.add(o.skeleton);});skeletons.forEach(s=>s.dispose());},[model]);
  const last = useRef(new T.Vector3()),
    phase = useRef(""),
    facing = useRef(0),
    smoothSpeed = useRef(0);
  const weapon = useMemo(() => pistol.scene.clone(true), [pistol.scene]);
  const aimScratch = useMemo(
    () => ({
      root: new T.Quaternion(),
      parent: new T.Quaternion(),
      world: new T.Quaternion(),
      direction: new T.Vector3(),
      up: new T.Vector3(0, 1, 0),
    }),
    [],
  );
  useEffect(() => {
    if (id) return;
    const hand =
      model.getObjectByName("LowerArmR") ?? model.getObjectByName("LowerArm.R");
    if (!hand) return;
    weapon.position.set(0, 0.23, 0.02);
    weapon.scale.setScalar(0.65);
    weapon.rotation.set(Math.PI / 2, 0, Math.PI);
    hand.add(weapon);
    return () => {
      hand.remove(weapon);
    };
  }, [model, weapon, id]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.07),
      s = useGame.getState(),
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
    smoothSpeed.current = T.MathUtils.lerp(
      smoothSpeed.current,
      speed,
      1 - Math.exp(-dt * 12),
    );
    if (root.current.position.lengthSq() === 0 || s.mode !== "playing") root.current.position.set(x, 0, z);
    else { root.current.position.x = T.MathUtils.damp(root.current.position.x, x, 24, dt); root.current.position.z = T.MathUtils.damp(root.current.position.z, z, 24, dt); }
    const angle = e
      ? Math.atan2(r.position[0] - x, r.position[1] - z)
      : !presentation.aiming && Math.hypot(...(r.velocity ?? [0, 0])) > 0.2
        ? Math.atan2(r.velocity![0], r.velocity![1]) : r.yaw + Math.PI;
    facing.current +=
      Math.atan2(
        Math.sin(angle - facing.current),
        Math.cos(angle - facing.current),
      ) *
      (1 - Math.exp(-dt * 16));
    root.current.rotation.y = facing.current;
    const running =
      s.mode === "playing" || s.mode === "dead" || s.mode === "victory";
    mixer.timeScale = running ? 1 : 0;
    let clip = "Idle";
    if (e) {
      if (e.hp <= 0) clip = actions.Death ? "Death" : "Idle";
      else if (e.stun > 0 && e.stun < 1) clip = actions.HitReact ? "HitReact" : "Idle";
      else if (e.windup > 0 || e.special)
        clip = actions.Idle_Attack ? "Idle_Attack" : "Punch";
      else if (e.state === "chase") clip = "Walk";
    } else {
      if (r.health <= 0) clip = "Death";
      else if (presentation.aiming)
        clip = smoothSpeed.current > 0.25 ? "Walk_Gun" : "Idle_Gun";
      else if (smoothSpeed.current > 3) clip = "Run";
      else if (smoothSpeed.current > 0.25) clip = "Walk";
      if (r.reload > 0) clip = "Idle_Gun";
    }
    if (phase.current !== clip && actions[clip]) {
      const old = actions[phase.current],
        next = actions[clip]!;
      next.reset();
      const once = ["Death", "HitReact", "Idle_Attack", "Punch"].includes(clip);
      next.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      next.fadeIn(0.15).play();
      old?.fadeOut(0.15);
      phase.current = clip;
    }
    const head = model.getObjectByName("Head");
    if (head && name !== "archive-zombie") head.scale.setScalar(id ? 0.67 : 0.75);
    if (name === "archive-zombie" && e) {
      root.current.rotation.x = e.hp <= 0 ? Math.min(1.5, (r.time - (e.diedAt ?? r.time)) * 2) : e.stun > 0 && e.stun < 1 ? -0.15 : 0;
      if (e.hp <= 0) mixer.timeScale = 0;
    }
    const tongue = model.getObjectByName("Tongue1");
    if (tongue) tongue.scale.setScalar(0.01);
    if (actions[clip] && ["Walk", "Walk_Gun", "Run"].includes(clip)) {
      const locomotion = Math.max(0.35, Math.min(1.7, smoothSpeed.current / (clip === "Run" ? 3.8 : 1.6)));
      actions[clip]!.setEffectiveTimeScale(locomotion);
    }
    if (!e) {
      const arm =
        model.getObjectByName("LowerArmR") ??
        model.getObjectByName("LowerArm.R");
      if (arm && r.reload > 0) arm.rotation.z += Math.sin(r.time * 12) * 0.08;
      const recoil = Math.max(0, 1 - (r.time - r.shotAt) / 0.16);
      if (presentation.aiming && r.reload <= 0) {
        root.current.updateMatrixWorld(true);
        root.current.getWorldQuaternion(aimScratch.root);
        for (const n of ["UpperArmR", "LowerArmR", "UpperArmL", "LowerArmL"]) {
          const bone = model.getObjectByName(n);
          if (!bone?.parent) continue;
          aimScratch.direction
            .set(n.endsWith("L") ? -0.2 : 0, -Math.tan(presentation.pitch) + recoil * 0.15, 1)
            .normalize()
            .applyQuaternion(aimScratch.root);
          aimScratch.world.setFromUnitVectors(
            aimScratch.up,
            aimScratch.direction,
          );
          bone.parent.getWorldQuaternion(aimScratch.parent);
          bone.quaternion
            .copy(aimScratch.parent.invert())
            .multiply(aimScratch.world);
          bone.updateMatrixWorld(true);
        }
        if (weapon.parent) {
          weapon.parent.getWorldQuaternion(aimScratch.parent);
          weapon.quaternion
            .copy(aimScratch.parent.invert())
            .multiply(aimScratch.root);
          weapon.rotateX(presentation.pitch - recoil * 0.12);
        }
      } else weapon.rotation.set(Math.PI / 2, 0, Math.PI);
      if (flash.current) flash.current.visible = recoil > 0.35;
    }
    if (e) {
      root.current.updateMatrixWorld(true);
      (model.getObjectByName("Head") ?? root.current).getWorldPosition(targets.head);
      targets.head.y += 0.08;
      (model.getObjectByName("Spine1") ?? model.getObjectByName("Torso") ?? root.current).getWorldPosition(targets.body);
      targets.body.y -= 0.05;
    }
  });
  const bossScale =
    e0?.boss !== undefined && e0.boss >= 0 ? [1.4, 1.6, 1.5, 1.8][e0.boss] : 1;
  return (
    <group ref={root} scale={bossScale}>
      <group scale={bounds.scale}>
        <group position={bounds.offset}>
          <group ref={rig}>
            <primitive object={model} dispose={null} />
          </group>
        </group>
      </group>
      {!id ? (
        <mesh ref={flash} visible={false} position={[0.3, 1.4, 0.85]}>
          <sphereGeometry args={[0.08, 5, 4]} />
          <meshBasicMaterial color="#ffe9a9" />
        </mesh>
      ) : null}
    </group>
  );
}
