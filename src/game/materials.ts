import * as T from "three";

// Share one corrected material per imported material and treatment.
// Several legacy FBX props export alpha=0 despite being opaque furniture.
const library = new Map<string, T.MeshStandardMaterial>();
export function archiveMaterial(source: T.Material, actor = false, survivor = false) {
  const key = `${source.uuid}:${actor}:${survivor}`;
  const existing = library.get(key);
  if (existing) return existing;
  const material = source instanceof T.MeshStandardMaterial ? source.clone() : new T.MeshStandardMaterial();
  material.opacity = 1; material.transparent = false; material.alphaTest = 0;
  material.roughness = actor ? 0.92 : 0.78;
  material.side = T.FrontSide;
  material.onBeforeCompile = shader => {
    shader.vertexShader = "varying vec3 archivePosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n archivePosition = position;");
    shader.fragmentShader = "varying vec3 archivePosition;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      ${survivor ? `if (diffuseColor.r > diffuseColor.b * 2.2 && diffuseColor.g < diffuseColor.r * 0.65) diffuseColor.rgb = vec3(0.035, 0.049, 0.055);` : ""}
      float grey = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      diffuseColor.rgb = mix(vec3(grey), diffuseColor.rgb, ${actor ? "0.42" : "0.64"});
      float wear = sin(archivePosition.x * 91.0 + sin(archivePosition.z * 57.0)) * sin(archivePosition.y * 137.0);
      diffuseColor.rgb *= 0.94 + wear * 0.025;
    `);
  };
  material.customProgramCacheKey = () => `archive-v1-${actor}-${survivor}`;
  library.set(key, material);
  return material;
}
