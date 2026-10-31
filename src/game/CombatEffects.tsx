import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { useGame } from "../store/game";
export const impact = { at: -10, position: new T.Vector3(), head: false };
const dummy = new T.Object3D();
/** A fixed eight-particle pool: no objects allocated on shots or per-frame. */
export function CombatEffects() {
  const pool = useRef<T.InstancedMesh>(null), warning = useRef<T.Mesh>(null);
  useFrame(() => {
    const r = useGame.getState().run, age = r.time - impact.at;
    if (pool.current) {
      pool.current.visible = age >= 0 && age < 0.35;
      if (pool.current.visible) for (let i = 0; i < 8; i++) {
        const a = i * 2.399;
        dummy.position.copy(impact.position);
        dummy.position.x += Math.sin(a) * age * 1.5;
        dummy.position.z += Math.cos(a) * age * 1.5;
        dummy.position.y += age * (i % 3 + 0.5) - age * age * 5;
        dummy.scale.setScalar((impact.head ? 0.045 : 0.03) * (1 - age / 0.35));
        dummy.updateMatrix(); pool.current.setMatrixAt(i, dummy.matrix);
      }
      pool.current.instanceMatrix.needsUpdate = true;
    }
    if (warning.current) {
      const boss = r.enemies.find(e => e.hp > 0 && e.special === "slam" && (e.specialUntil ?? 0) > r.time);
      warning.current.visible = !!boss;
      if (boss) {
        warning.current.position.set(boss.x, 0.045, boss.z);
        (warning.current.material as T.MeshBasicMaterial).opacity = 0.2 + Math.sin(r.time * 18) * 0.1;
      }
    }
  });
  return <>
    <instancedMesh ref={pool} args={[undefined, undefined, 8]} frustumCulled={false} visible={false}>
      <sphereGeometry args={[1, 4, 3]}/><meshBasicMaterial color="#713526"/>
    </instancedMesh>
    <mesh ref={warning} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[2.85, 3, 48]}/><meshBasicMaterial color="#db9868" transparent opacity={0.3} depthWrite={false}/>
    </mesh>
  </>;
}
