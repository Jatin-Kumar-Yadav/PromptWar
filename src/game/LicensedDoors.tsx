import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { doors } from "./world";
import { useGame } from "../store/game";
import { LicensedProp } from "./Art";
import { sound } from "../utils/audio";
function Door({ door: d }: { door: (typeof doors)[number] }) {
  const hinge = useRef<T.Group>(null);
  const wasOpen = useRef(false);
  useFrame((_, dt) => {
    if (!hinge.current) return;
    const r = useGame.getState().run;
    const unlocked = !d.requires || r.keys.includes(d.requires);
    const near = Math.hypot(r.position[0] - d.x, r.position[1] - d.z) < 3;
    if (unlocked && near !== wasOpen.current && useGame.getState().mode === "playing") sound("door", useGame.getState().volume * 0.45);
    wasOpen.current = unlocked && near;
    hinge.current.rotation.y = T.MathUtils.damp(
      hinge.current.rotation.y,
      unlocked && near ? -Math.PI / 2 : 0,
      8,
      Math.min(dt, 0.07),
    );
  });
  return (
    <group
      position={[
        d.axis === "z" ? d.x : d.x - 1.1,
        0,
        d.axis === "z" ? d.z + 1.1 : d.z,
      ]}
      rotation={[0, d.axis === "z" ? Math.PI / 2 : 0, 0]}
    >
      <group ref={hinge}>
        <LicensedProp
          name="door"
          position={[1.1, 0, 0]}
          fit={[2.2, 2.9, 0.16]}
        />
      </group>
    </group>
  );
}
export function LicensedDoors() {
  return (
    <>
      {doors.map((d) => (
        <Door key={d.id} door={d} />
      ))}
    </>
  );
}
