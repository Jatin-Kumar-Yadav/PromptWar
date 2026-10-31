import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { useGame } from "../store/game";
import { sound } from "../utils/audio";
/** Sliding tray fitted to the existing authored wooden cabinet. */
function Drawer({ x, z, unlocked }: { x: number; z: number; unlocked: "drawer" | "safe" }) {
  const tray = useRef<T.Group>(null), open = useRef(false);
  useFrame((_, dt) => {
    if (!tray.current) return;
    const s = useGame.getState();
    const target = s.run.puzzles.includes(unlocked) && Math.hypot(s.run.position[0] - x, s.run.position[1] - z) < 3;
    if (target !== open.current) { sound("door", s.volume * 0.45); open.current = target; }
    tray.current.position.z = T.MathUtils.damp(tray.current.position.z, target ? 0.65 : 0.3, 6, Math.min(dt, 0.07));
  });
  return <group position={[x, 0.68, z]}><group ref={tray} position={[0, 0, 0.3]}>
    <mesh position={[0, -0.08, -0.17]}><boxGeometry args={[1.05, 0.035, 0.44]}/><meshStandardMaterial color="#3c3023"/></mesh>
    <mesh><boxGeometry args={[1.12, 0.25, 0.06]}/><meshStandardMaterial color="#54412b" roughness={0.8}/></mesh>
    <mesh position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.055, 0.012, 5, 10, Math.PI]}/><meshStandardMaterial color="#9a8554" metalness={0.7} roughness={0.4}/></mesh>
    <mesh position={[0, -0.05, -0.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.35, 0.23]}/><meshStandardMaterial color="#d3c7a5" side={T.DoubleSide}/></mesh>
  </group></group>;
}
export function InteractiveDrawers() {
  return <><Drawer x={14} z={7} unlocked="drawer"/><Drawer x={5} z={11} unlocked="safe"/></>;
}
