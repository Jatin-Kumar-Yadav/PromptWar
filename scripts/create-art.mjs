// Original DEAD INBOX assets. No third-party models or textures.
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mkdir, writeFile } from "node:fs/promises";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((v) => {
      this.result = v;
      this.onloadend?.();
    });
  }
};
await mkdir("public/models", { recursive: true });
const mat = (color, metalness = 0) =>
  new T.MeshStandardMaterial({
    color,
    metalness,
    roughness: metalness ? 0.38 : 0.84,
  });
const leather = mat("#253537"),
  cloth = mat("#343e38"),
  skin = mat("#b8a189"),
  hair = mat("#302820"),
  iron = mat("#303638", 0.75),
  brass = mat("#baa56d", 0.7),
  wood = mat("#503829");
function mesh(g, material, p = [0, 0, 0], s = [1, 1, 1], parent) {
  const m = new T.Mesh(g, material);
  m.position.set(...p);
  m.scale.set(...s);
  parent?.add(m);
  return m;
}
function oval(parent, p, s, m) {
  return mesh(new T.SphereGeometry(1, 12, 10), m, p, s, parent);
}
function profile(parent, p, points, m) {
  return mesh(
    new T.LatheGeometry(
      points.map(([r, y]) => new T.Vector2(r, y)),
      12,
    ),
    m,
    p,
    [1, 1, 1],
    parent,
  );
}
async function save(name, scene) {
  scene.updateMatrixWorld(true);
  const data = await new GLTFExporter().parseAsync(scene, { binary: true });
  await writeFile(`public/models/${name}.glb`, Buffer.from(data));
}
function pistol() {
  const g = new T.Group();
  mesh(
    new T.BoxGeometry(0.105, 0.115, 0.36),
    iron,
    [0, 0, -0.06],
    [1, 1, 1],
    g,
  );
  mesh(
    new T.BoxGeometry(0.09, 0.2, 0.12),
    leather,
    [0, -0.13, 0.055],
    [1, 1, 1],
    g,
  ).rotation.x = -0.2;
  mesh(
    new T.TorusGeometry(0.065, 0.012, 5, 10, Math.PI * 1.5),
    iron,
    [0, -0.085, -0.065],
    [0.6, 1, 1],
    g,
  ).rotation.y = Math.PI / 2;
  mesh(
    new T.CylinderGeometry(0.027, 0.027, 0.05, 10),
    iron,
    [0, 0, -0.26],
    [1, 1, 1],
    g,
  ).rotation.x = Math.PI / 2;
  return g;
}
function human(infected = false, boss = -1) {
  const root = new T.Group();
  const jacket = infected
    ? mat(["#666553", "#586471", "#3e4d52"][Math.max(0, boss) % 3])
    : leather;
  const flesh = infected ? mat("#989c83") : skin;
  const torso = profile(
    root,
    [0, 0.83, 0],
    [
      [0.14, 0],
      [0.22, 0.08],
      [0.24, 0.35],
      [0.29, 0.54],
      [0.22, 0.65],
      [0.13, 0.68],
    ],
    jacket,
  );
  torso.scale.z = 0.65;
  oval(root, [0, 0.91, 0], [0.2, 0.13, 0.14], cloth);
  mesh(
    new T.TorusGeometry(0.2, 0.035, 6, 16),
    iron,
    [0, 0.87, 0],
    [1, 0.75, 1],
    root,
  ).rotation.x = Math.PI / 2;
  profile(
    root,
    [0, 1.46, 0],
    [
      [0.075, 0],
      [0.07, 0.12],
    ],
    flesh,
  );
  const head = new T.Group();
  head.name = "head";
  head.position.set(0, 1.65, 0);
  root.add(head);
  oval(head, [0, 0, 0], [0.145, 0.19, 0.145], flesh);
  oval(
    head,
    [0, 0.105, 0.025],
    [0.151, 0.115, 0.15],
    infected ? mat("#484538") : hair,
  );
  oval(head, [0, -0.025, -0.142], [0.03, 0.045, 0.035], flesh);
  for (const x of [-0.058, 0.058]) {
    oval(head, [x, 0.018, -0.132], [0.035, 0.015, 0.013], iron);
    oval(
      head,
      [x, 0.019, -0.146],
      [0.012, 0.008, 0.006],
      infected ? mat("#b95439") : mat("#b4b5a2"),
    );
  }
  oval(head, [0, -0.09, -0.123], [0.045, 0.012, 0.015], mat("#66504a"));
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.name = side < 0 ? "legL" : "legR";
    leg.position.set(side * 0.12, 0.83, 0);
    root.add(leg);
    profile(
      leg,
      [0, -0.39, 0],
      [
        [0.07, 0],
        [0.09, 0.18],
        [0.105, 0.39],
      ],
      cloth,
    );
    const shin = new T.Group();
    shin.name = side < 0 ? "kneeL" : "kneeR";
    shin.position.y = -0.4;
    leg.add(shin);
    profile(
      shin,
      [0, -0.32, 0],
      [
        [0.06, 0],
        [0.075, 0.3],
      ],
      cloth,
    );
    oval(shin, [0, -0.33, -0.055], [0.09, 0.09, 0.16], iron);
    const arm = new T.Group();
    arm.name = side < 0 ? "armL" : "armR";
    arm.position.set(side * 0.25, 1.4, 0);
    root.add(arm);
    profile(
      arm,
      [0, -0.28, 0],
      [
        [0.07, 0],
        [0.09, 0.26],
      ],
      jacket,
    );
    const elbow = new T.Group();
    elbow.name = side < 0 ? "elbowL" : "elbowR";
    elbow.position.y = -0.28;
    arm.add(elbow);
    profile(
      elbow,
      [0, -0.27, 0],
      [
        [0.052, 0],
        [0.065, 0.25],
      ],
      jacket,
    );
    oval(elbow, [0, -0.3, 0], [0.057, 0.08, 0.045], infected ? flesh : iron);
    for (let f = 0; f < 3; f++)
      oval(
        elbow,
        [(f - 1) * 0.027, -0.35, -0.015],
        [0.013, 0.045, 0.015],
        flesh,
      );
    if (side === 1 && !infected) {
      const gun = pistol();
      gun.name = "pistol";
      gun.position.set(0, -0.31, -0.08);
      elbow.add(gun);
    }
  }
  oval(root, [0.23, 0.94, 0.09], [0.09, 0.13, 0.065], leather);
  if (infected) {
    root.getObjectByName("head").rotation.z = 0.2;
    root.getObjectByName("armL").rotation.x = -0.45;
    root.getObjectByName("armR").rotation.x = -0.7;
  }
  if (boss >= 0) {
    torso.scale.x = [1.6, 0.9, 1.7, 1.5][boss];
    for (const side of [-1, 1]) {
      oval(
        root,
        [side * 0.32, 1.36, 0],
        [boss === 0 ? 0.25 : 0.17, 0.22, 0.22],
        boss === 3 ? iron : jacket,
      );
      if (boss === 1)
        for (let i = 0; i < 3; i++)
          mesh(
            new T.PlaneGeometry(0.18, 0.3),
            mat("#baae83"),
            [side * 0.28, 1.25 - i * 0.18, -0.2],
            [1, 1, 1],
            root,
          );
    }
    if (boss === 3)
      oval(
        root,
        [0, 1.25, -0.18],
        [0.12, 0.15, 0.06],
        new T.MeshStandardMaterial({
          color: "#bd4e36",
          emissive: "#ad2818",
          emissiveIntensity: 2,
        }),
      );
  }
  return root;
}
await save("survivor", human());
await save("infected", human(true));
for (let i = 0; i < 4; i++) await save(`boss-${i}`, human(true, i));
await save("pistol", pistol());
const herb = new T.Group();
profile(
  herb,
  [0, 0, 0],
  [
    [0.1, 0],
    [0.14, 0.2],
  ],
  mat("#915737"),
);
for (let i = 0; i < 9; i++) {
  const a = i * 2.4;
  const leaf = oval(
    herb,
    [Math.cos(a) * 0.13, 0.25 + i * 0.018, Math.sin(a) * 0.13],
    [0.055, 0.14, 0.018],
    mat(i % 2 ? "#497d43" : "#7b9b50"),
  );
  leaf.rotation.set(0.5, a, 0.6);
}
await save("herb", herb);
const ammo = new T.Group();
mesh(
  new T.BoxGeometry(0.38, 0.18, 0.23),
  mat("#797248"),
  [0, 0.09, 0],
  [1, 1, 1],
  ammo,
);
for (let i = 0; i < 5; i++)
  profile(
    ammo,
    [-0.14 + i * 0.07, 0.18, 0],
    [
      [0.022, 0],
      [0.022, 0.08],
      [0.01, 0.115],
      [0, 0.13],
    ],
    brass,
  );
await save("ammo", ammo);
const cabinet = new T.Group();
mesh(new T.BoxGeometry(1.3, 0.9, 0.6), wood, [0, 0.45, 0], [1, 1, 1], cabinet);
for (let i = 0; i < 3; i++) {
  mesh(
    new T.BoxGeometry(1.2, 0.24, 0.035),
    wood,
    [0, 0.19 + i * 0.27, -0.32],
    [1, 1, 1],
    cabinet,
  );
  mesh(
    new T.TorusGeometry(0.07, 0.012, 5, 12, Math.PI),
    brass,
    [0, 0.18 + i * 0.27, -0.35],
    [1, 1, 1],
    cabinet,
  );
}
await save("cabinet", cabinet);
await writeFile(
  "public/models/LICENSE.txt",
  "Original DEAD INBOX procedural models, authored for this project. Copyright 2026 PromptWar contributors. Licensed under MIT: permission is granted to use, copy, modify, merge, publish, distribute, sublicense and sell these assets, provided this notice is retained. THE ASSETS ARE PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND. Source: scripts/create-art.mjs. No third-party game assets.\n",
);
