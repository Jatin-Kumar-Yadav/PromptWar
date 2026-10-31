import * as T from "three";
import { surface } from "./Art";

const textures = new Map<string, T.CanvasTexture>();
function print(kind: string) {
  if (textures.has(kind)) return textures.get(kind)!;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d")!;
  if (kind === "tile") {
    c.fillStyle = "#9e9b8a"; c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      c.fillStyle = (x + y) % 2 ? "#777d78" : "#b5af98";
      c.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
      c.strokeStyle = "#393e3a"; c.strokeRect(x * 128 + 16, y * 128 + 16, 96, 96);
    }
    let seed = 7;
    for (let i = 0; i < 9000; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed % 512; seed = (seed * 1664525 + 1013904223) >>> 0; c.fillStyle = "#201c1810"; c.fillRect(x, seed % 512, 2, 7); }
  } else if (kind === "seal") {
    c.fillStyle = "#262e2b"; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = "#b0a178"; c.lineWidth = 6;
    for (const r of [220, 200, 146]) { c.beginPath(); c.arc(256, 256, r, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = "#a89b75"; c.font = "bold 24px Georgia"; c.textAlign = "center";
    c.fillText("MORROW ARCHIVE", 256, 145); c.font = "80px Georgia"; c.fillText("M", 256, 288);
    c.font = "18px Georgia"; c.fillText("RECORDS • RESEARCH • 1938", 256, 350);
  } else {
    c.fillStyle = "#172420"; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = "#b5a16e"; c.lineWidth = 8; c.strokeRect(18, 18, 476, 476);
    c.fillStyle = "#d5c99f"; c.textAlign = "center";
    c.font = "28px Georgia"; c.fillText("MORROW INSTITUTE", 256, 155);
    c.font = "bold 42px Georgia"; c.fillText("RECORDS", 256, 250); c.fillText("& ARCHIVES", 256, 300);
    c.font = "20px monospace"; c.fillText("RECEPTION / 01", 256, 390);
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  if (kind === "tile") { texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(3, 3); }
  textures.set(kind, texture); return texture;
}
function Timber({ position, size, color = "#554332" }: {position: [number, number, number]; size: [number, number, number]; color?: string}) {
  return <mesh position={position} receiveShadow userData={{solid: true}}><boxGeometry args={size}/><meshStandardMaterial color={color} map={surface("wood")} roughness={0.72}/></mesh>;
}
/** Original architectural dressing, batched with the static house. Imported furniture remains in use. */
export function ArchiveDetails() {
  return <>
    <mesh position={[4, 0.015, 4.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[7.7, 8.7]}/><meshStandardMaterial map={print("tile")} roughness={0.62}/>
    </mesh>
    <mesh position={[4, 0.052, 4.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[1.55, 64]}/><meshStandardMaterial map={print("seal")} roughness={0.75}/>
    </mesh>
    <mesh position={[4, 2.5, 8.84]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[2.2, 1.3]}/><meshStandardMaterial map={print("sign")} roughness={0.7}/>
    </mesh>
    {/* A paneled reception counter, with brass trim and an open staff side. */}
    <Timber position={[4, 0.65, 7.4]} size={[4, 1.3, 0.16]}/>
    <Timber position={[4, 1.33, 7.5]} size={[4.3, 0.12, 0.85]} color="#292a25"/>
    {[2.1, 5.9].map(x => <Timber key={x} position={[x, 0.65, 7.75]} size={[0.16, 1.3, 0.7]}/>)}
    {[2.5, 3.5, 4.5, 5.5].map(x => <group key={x}>
      <Timber position={[x, 0.68, 7.3]} size={[0.84, 0.96, 0.04]} color="#817052"/>
      <Timber position={[x, 0.68, 7.27]} size={[0.72, 0.82, 0.035]} />
    </group>)}
    {[0.55, 7.45].flatMap(x => [2.8, 7.6].map(z => <group key={`${x}-${z}`} position={[x, 0, z]}>
      <mesh position={[0, 1.7, 0]} receiveShadow><cylinderGeometry args={[0.2, 0.24, 3.3, 16]}/><meshStandardMaterial color="#a4a38e" map={surface("plaster")} roughness={0.85}/></mesh>
      {[0.15, 3.2].map(y => <Timber key={y} position={[0, y, 0]} size={[0.58, 0.25, 0.58]} color="#9b987e"/>)}
      <mesh position={[x < 4 ? 0.26 : -0.26, 2.3, 0]}><sphereGeometry args={[0.12, 8, 8]}/><meshStandardMaterial color="#ffdda7" emissive="#ffbe75" emissiveIntensity={1.7}/></mesh>
    </group>))}
    {/* Wall panelling and crown mouldings unify the rooms. */}
    {[0.22, 17.78].map(z => <group key={z}>
      <Timber position={[12, 1.1, z]} size={[23.6, 0.12, 0.09]}/>
      <Timber position={[12, 3.3, z]} size={[23.6, 0.14, 0.12]} color="#a9a28d"/>
    </group>)}
  </>;
}
