import { useMemo, useEffect } from "react";
import * as T from "three";

/** Original fictional packaging; no commercial ammunition branding or borrowed textures. */
export function AmmunitionBox({ position }: {position: [number, number, number]}) {
  const label = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#481f1b"; c.fillRect(0, 0, 256, 128);
    c.fillStyle = "#d3c9aa"; c.fillRect(0, 8, 256, 12);
    c.font = "bold 28px Georgia"; c.textAlign = "center"; c.fillText("MORROW", 128, 59);
    c.font = "bold 17px monospace"; c.fillText("9mm / FIELD ISSUE", 128, 85);
    c.font = "13px monospace"; c.fillText("24 ROUNDS • PISTOL", 128, 109);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => label.dispose(), [label]);
  return <group position={position}>
    <mesh position={[0, 0.085, 0]}><boxGeometry args={[0.5, 0.17, 0.29]}/><meshStandardMaterial color="#a59a77" roughness={0.9}/></mesh>
    <mesh position={[0.07, 0.174, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.37, 0.29]}/><meshStandardMaterial map={label}/></mesh>
    {Array.from({length: 4}, (_, i) => <mesh key={i} position={[-0.18, 0.2, -0.1 + i * 0.065]}>
      <capsuleGeometry args={[0.022, 0.1, 3, 6]}/><meshStandardMaterial color="#b29b5c" metalness={0.7} roughness={0.36}/>
    </mesh>)}
  </group>;
}
