// Merakit satu anjing rajut: tiap bagian adalah boneka kecil yang disambung di sendi,
// persis seperti amigurumi. Hanya sendi yang digerakkan, jahitan tidak pernah dihitung ulang.

import * as THREE from 'three';
import { Loft, coreMesh, knit } from '../yarn/loft.js';

const eyeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0c0a09, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
const glintMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const noseMaterial = new THREE.MeshPhysicalMaterial({ color: 0x1a1412, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25 });
const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x5a2230, roughness: 0.9 });

const scleraMaterial = new THREE.MeshPhysicalMaterial({ color: 0xf6efe2, roughness: 0.25, clearcoat: 0.8 });
const angerMaterial = new THREE.MeshStandardMaterial({ color: 0xd42a2a, roughness: 0.75 });

const sphere = new THREE.SphereGeometry(1, 20, 16);

// Gumpalan benang kusut merah, tanda komik untuk marah.
let scribble = null;
function scribbleGeometry() {
  if (scribble) return scribble;
  const points = [];
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4;
    const r = 0.05 + (i % 3) * 0.012;
    points.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 1.3) * r, Math.sin(a) * r * 0.8));
  }
  scribble = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 110, 0.0075, 6, false);
  return scribble;
}

/** Mata boneka. Yang berputar untuk melirik adalah grup `iris`, disimpan di userData. */
export function createEye(parent, x, y, z, r) {
  const eye = joint(parent, x, y, z);
  const ball = new THREE.Mesh(sphere, scleraMaterial);
  ball.scale.setScalar(r);
  eye.add(ball);
  const iris = new THREE.Group();
  const dark = new THREE.Mesh(sphere, eyeMaterial);
  dark.scale.setScalar(r * 0.9);
  dark.position.z = r * 0.16;
  iris.add(dark);
  const glint = new THREE.Mesh(sphere, glintMaterial);
  glint.scale.setScalar(r * 0.24);
  glint.position.set(-r * 0.34, r * 0.4, r * 0.92);
  iris.add(glint);
  eye.add(iris);
  eye.userData.iris = iris;
  return eye;
}

export function joint(parent, x = 0, y = 0, z = 0, name = '') {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

export function buildRig(breed, quality) {
  const { size, colors } = breed;
  const L = size.bodyLen;
  const bodyStitch = { ...breed.stitches.body, quality };
  const earStitch = { ...breed.stitches.ear, quality };
  let seed = breed.id.length * 97 + 5;

  // Satu bagian boneka: isian + jahitan.
  const part = (parent, loft, paint, style = bodyStitch, extra = {}) => {
    const group = new THREE.Group();
    group.add(coreMesh(loft, { paint, inset: extra.inset ?? 0.006, darken: extra.darken ?? 0.62 }));
    group.add(knit(loft, { ...style, paint, seed: seed++, ...extra }));
    parent.add(group);
    return group;
  };

  const coat = () => colors.coat;

  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0, 'body');
  const pelvis = joint(body, 0, 0, -L / 2, 'pelvis');
  const chest = joint(pelvis, 0, 0.012, L * 0.5, 'chest');

  // Badan belakang
  const [rumpX, rumpY] = size.rump;
  const rumpPaint = ({ n, rand }) =>
    breed.chestPatch && n.y < -0.62 + (rand() - 0.5) * 0.1 ? colors.chest : colors.coat;
  part(
    pelvis,
    new Loft(
      [
        { p: [0, 0, -0.02], rx: rumpX * 0.92, ry: rumpY * 0.92 },
        { p: [0, 0, L * 0.18], rx: rumpX, ry: rumpY },
        { p: [0, 0.006, L * 0.42], rx: size.waist, ry: size.waist * 1.02 },
        { p: [0, 0.012, L * 0.56], rx: size.waist * 0.96, ry: size.waist },
      ],
      { capStart: 0.8, capEnd: 0.5 },
    ),
    rumpPaint,
  );

  // Dada
  const [chestX, chestY] = size.chest;
  const chestPaint = ({ n, rand }) => {
    if (!breed.chestPatch && !breed.mane) return colors.coat;
    const front = n.z * 0.8 - n.y * 0.6;
    return front > 0.45 + (rand() - 0.5) * 0.16 ? colors.chest : colors.coat;
  };
  part(
    chest,
    new Loft(
      [
        { p: [0, 0, -L * 0.14], rx: size.waist * 0.96, ry: size.waist },
        { p: [0, 0, L * 0.2], rx: chestX * 0.96, ry: chestY * 0.96 },
        { p: [0, 0.008, L * 0.44], rx: chestX, ry: chestY },
      ],
      { capStart: 0.5, capEnd: 0.82 },
    ),
    chestPaint,
  );

  // Leher dan kepala
  const neckBaseY = chestY * 0.36;
  const neckBaseZ = L * 0.5 + chestY * 0.28;
  const neck = joint(chest, 0, neckBaseY, neckBaseZ, 'neck');
  const neckTip = [0, size.neckLen * 0.82, size.neckLen * 0.56];
  part(
    neck,
    new Loft(
      [
        { p: [0, -0.03, -0.02], rx: size.neckR * 1.16 },
        { p: [0, neckTip[1] * 0.5, neckTip[2] * 0.5], rx: size.neckR },
        { p: neckTip, rx: size.neckR * 0.92 },
      ],
      { capStart: 0.3, capEnd: 0.5 },
    ),
    ({ rand, n }) => (breed.chestPatch && n.z > 0.2 + (rand() - 0.5) * 0.2 ? colors.chest : colors.coat),
  );

  if (breed.mane) addMane(neck, part, breed, neckTip, quality);

  const [headX, headY, headZ] = size.head;
  const head = joint(neck, 0, neckTip[1] + headY * 0.5, neckTip[2] + headZ * 0.32, 'head');
  const headPaint = ({ p, rand }) => {
    if (breed.id === 'kitty' || breed.id === 'jenges') return colors.coat;
    const low = p.y < -headY * 0.34 + (rand() - 0.5) * 0.03 && p.z > -headZ * 0.2;
    return low ? colors.muzzle : colors.coat;
  };
  const headLoft = new Loft(
    [
      { p: [0, 0, -headZ * 0.5], rx: headX * 0.86, ry: headY * 0.84 },
      { p: [0, 0, 0], rx: headX, ry: headY },
      { p: [0, -headY * 0.04, headZ * 0.5], rx: headX * 0.82, ry: headY * 0.8 },
    ],
    { capStart: 0.9, capEnd: 0.72 },
  );
  part(head, headLoft, headPaint);

  if (breed.mane) {
    // Pipi berumbai.
    head.add(
      knit(headLoft, {
        stitch: 'tuft', w: 0.05, h: 0.044, depth: 0.05, droop: 0.2, to: 0.5, quality,
        paint: ({ n }) => (n.y < 0.1 ? colors.chest : colors.coat),
        mask: ({ n }) => n.y < 0.45,
        variance: 0.07, seed: seed++,
      }),
    );
  }

  if (breed.topknot) {
    const topLoft = new Loft(
      [
        { p: [0, 0, -0.03], rx: headX * 0.72, ry: headY * 0.46 },
        { p: [0, 0.01, 0.02], rx: headX * 0.72, ry: headY * 0.46 },
        { p: [0, 0, 0.06], rx: headX * 0.6, ry: headY * 0.4 },
      ],
      { capStart: 1, capEnd: 1 },
    );
    const top = new THREE.Group();
    top.position.set(0, headY * 0.72, -headZ * 0.16);
    head.add(top);
    part(top, topLoft, coat, bodyStitch);
  }

  // Moncong
  const snoutRoot = headZ * 0.62;
  const snoutY = -headY * 0.24;
  const snoutTip = snoutRoot + size.snoutLen;
  part(
    head,
    new Loft(
      [
        { p: [0, snoutY + 0.014, snoutRoot - 0.04], rx: size.snout[0] * 1.1, ry: size.snout[1] * 1.14 },
        { p: [0, snoutY + 0.006, snoutRoot + size.snoutLen * 0.45], rx: size.snout[0], ry: size.snout[1] },
        { p: [0, snoutY, snoutTip], rx: size.snout[0] * 0.92, ry: size.snout[1] * 0.92 },
      ],
      { capStart: 0.2, capEnd: 0.72 },
    ),
    () => colors.muzzle,
    bodyStitch,
    breed.stitches.body.stitch === 'v' ? { w: 0.026, h: 0.022, depth: 0.022 } : { w: 0.03, h: 0.026, depth: 0.03, droop: 0 },
  );

  // Hidung: manik hitam mengilap, seperti mata boneka.
  const noseR = size.snout[0] * 0.44;
  const nose = new THREE.Mesh(sphere, noseMaterial);
  const noseReach = size.snout[1] * 0.92 * 0.7;
  nose.scale.set(noseR * 1.12, noseR * 0.86, noseR * 0.8);
  nose.position.set(0, snoutY + size.snout[1] * 0.48, snoutTip + noseReach * 0.72 + (breed.stitches.body.stitch === 'v' ? 0 : 0.016));
  head.add(nose);

  // Rahang dan lidah
  const jaw = joint(head, 0, snoutY - size.snout[1] * 0.56, snoutRoot - 0.01, 'jaw');
  const jawLen = size.snoutLen * 0.84;
  const mouth = new THREE.Mesh(sphere, mouthMaterial);
  mouth.scale.set(size.snout[0] * 0.72, size.snout[1] * 0.36, jawLen * 0.6);
  mouth.position.set(0, size.snout[1] * 0.28, jawLen * 0.55);
  jaw.add(mouth);
  part(
    jaw,
    new Loft(
      [
        { p: [0, -0.004, -0.01], rx: size.snout[0] * 0.78, ry: size.snout[1] * 0.46 },
        { p: [0, -0.004, jawLen * 0.6], rx: size.snout[0] * 0.72, ry: size.snout[1] * 0.42 },
        { p: [0, 0, jawLen], rx: size.snout[0] * 0.56, ry: size.snout[1] * 0.3 },
      ],
      { capStart: 0.3, capEnd: 0.8 },
    ),
    () => colors.muzzle,
    bodyStitch,
    breed.stitches.body.stitch === 'v' ? { w: 0.024, h: 0.02, depth: 0.02 } : { w: 0.028, h: 0.024, depth: 0.026, droop: 0 },
  );

  const tongue = joint(jaw, 0, size.snout[1] * 0.26, jawLen * 0.42, 'tongue');
  const tongueW = size.snout[0] * 0.56;
  const tongueLen = size.snoutLen * 0.86 + 0.02;
  part(
    tongue,
    new Loft(
      [
        { p: [0, 0, 0], rx: tongueW * 0.92, ry: 0.012 },
        { p: [0, 0.002, tongueLen * 0.5], rx: tongueW, ry: 0.012 },
        { p: [0, -tongueLen * 0.22, tongueLen * 0.86], rx: tongueW * 0.94, ry: 0.012 },
        { p: [0, -tongueLen * 0.56, tongueLen * 0.98], rx: tongueW * 0.74, ry: 0.012 },
      ],
      { capStart: 0.3, capEnd: 3 },
    ),
    () => colors.tongue,
    { stitch: 'v', w: 0.017, h: 0.016, depth: 0.008, quality, variance: 0.03 },
    { darken: 0.9, inset: 0.002 },
  );

  // Mata: bola putih tipis dengan iris gelap yang bisa melirik.
  const eyeR = headX * 0.158;
  // Bulu lebat lebih tebal, jadi mata dan hidung dimajukan supaya tidak tertimbun.
  const fluffLift = breed.stitches.body.stitch === 'v' ? 0 : breed.stitches.body.depth * 0.55;
  const eyes = [-1, 1].map((sideSign) => {
    const nx = 0.46 * 0.96;
    const ny = 0.1 / 0.82;
    const z = headZ * 0.5 + headZ * 0.72 * Math.sqrt(Math.max(0.12, 1 - nx * nx - ny * ny)) * 0.74;
    return createEye(head, sideSign * headX * 0.46, headY * 0.1, z + fluffLift, eyeR);
  });

  // Alis dan coretan marah, hanya muncul saat kesal.
  const browColor = new THREE.Color(colors.coat).multiplyScalar(0.34);
  const browMaterial = new THREE.MeshStandardMaterial({ color: browColor, roughness: 0.9 });
  const brows = eyes.map((eye, i) => {
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(eyeR * 0.26, eyeR * 1.5, 4, 8), browMaterial);
    brow.position.copy(eye.position).add(new THREE.Vector3(0, eyeR * 1.5, eyeR * 0.5));
    brow.userData.side = i === 0 ? -1 : 1;
    brow.visible = false;
    head.add(brow);
    return brow;
  });
  const anger = new THREE.Mesh(scribbleGeometry(), angerMaterial);
  anger.position.set(headX * 0.82, headY * 1.2, 0);
  anger.visible = false;
  head.add(anger);

  // Telinga
  const ears = [-1, 1].map((sideSign) => buildEar(head, part, breed, sideSign, earStitch));

  // Kaki
  const legs = [
    buildLeg('fl', chest, -1, true, part, breed, bodyStitch),
    buildLeg('fr', chest, 1, true, part, breed, bodyStitch),
    buildLeg('hl', pelvis, -1, false, part, breed, bodyStitch),
    buildLeg('hr', pelvis, 1, false, part, breed, bodyStitch),
  ];

  // Ekor
  const { tailBase, tailTip } = buildTail(pelvis, part, breed, bodyStitch, quality);

  const pawH = size.pawR * 0.72;
  const measures = {
    L,
    pawH,
    fore: size.fore[0] + size.fore[1],
    hind: size.hind[0] + size.hind[1],
    hipX: rumpX * 0.68,
    hipDrop: rumpY * 0.42,
    shoulderX: chestX * 0.68,
    shoulderDrop: chestY * 0.46 - 0.012,
    rumpY,
    chestY,
    bellyY: Math.max(rumpY, chestY),
  };

  return { root, body, pelvis, chest, neck, head, jaw, tongue, eyes, brows, anger, nose, ears, legs, tailBase, tailTip, measures, headLoft, neckTip };
}

function addMane(neck, part, breed, neckTip, quality) {
  const { size, colors } = breed;
  const r = size.neckR * 1.5;
  const loft = new Loft(
    [
      { p: [0, -size.chest[1] * 0.42, -0.05], rx: r * 0.9, ry: r * 0.86 },
      { p: [0, neckTip[1] * 0.1, neckTip[2] * 0.2], rx: r * 1.06, ry: r },
      { p: [0, neckTip[1] * 0.7, neckTip[2] * 0.8], rx: r * 0.88, ry: r * 0.84 },
    ],
    { capStart: 0, capEnd: 0.1 },
  );
  neck.add(
    knit(loft, {
      stitch: 'tuft', w: 0.05, h: 0.05, depth: 0.056, droop: 0.32, quality, seed: 71, variance: 0.07,
      paint: ({ n, rand }) => (n.z - n.y * 0.25 > -0.1 + (rand() - 0.5) * 0.3 ? colors.chest : colors.coat),
    }),
  );
}

function buildEar(head, part, breed, sideSign, style) {
  const { ear, colors, size } = breed;
  const pivot = joint(head, sideSign * ear.x, ear.y, ear.z, 'ear');

  if (ear.type === 'upright') {
    const lean = sideSign * 0.03;
    part(
      pivot,
      new Loft(
        [
          { p: [lean * 0.2, -0.01, 0], rx: ear.thick, ry: ear.width },
          { p: [lean * 0.7, ear.length * 0.45, -0.004], rx: ear.thick * 0.86, ry: ear.width * 0.62 },
          { p: [lean * 1.4, ear.length * 0.85, -0.008], rx: ear.thick * 0.6, ry: ear.width * 0.22 },
        ],
        { capStart: 0.3, capEnd: 2 },
      ),
      () => colors.ear,
      style,
    );
    pivot.userData.rest = { x: -0.06, z: sideSign * -0.2 };
    return pivot;
  }

  const down = ear.length;
  const stations =
    ear.type === 'fold'
      ? [
          { p: [sideSign * 0.004, 0.012, 0.0], rx: ear.thick, ry: ear.width * 0.82 },
          { p: [sideSign * 0.01, -down * 0.42, 0.012], rx: ear.thick * 0.92, ry: ear.width },
          { p: [sideSign * 0.012, -down * 0.78, 0.022], rx: ear.thick * 0.7, ry: ear.width * 0.46 },
        ]
      : [
          { p: [sideSign * 0.004, 0.01, 0], rx: ear.thick * 0.8, ry: ear.width * 0.7 },
          { p: [sideSign * 0.012, -down * 0.42, 0], rx: ear.thick, ry: ear.width },
          { p: [sideSign * 0.016, -down * 0.74, 0], rx: ear.thick * 0.94, ry: ear.width * 0.9 },
        ];
  part(
    pivot,
    new Loft(stations, { capStart: 0.5, capEnd: 0.9 }),
    () => colors.ear,
    style,
    { flip: true },
  );
  pivot.userData.rest = { x: 0.04, z: sideSign * 0.2 };
  return pivot;
}

function buildLeg(id, parent, sideSign, isFore, part, breed, style) {
  const { size, colors } = breed;
  const [a, b] = isFore ? size.fore : size.hind;
  const r = size.legR;
  const paintLeg = ({ rand, n }) =>
    breed.chestPatch && isFore && n.z > 0.5 + (rand() - 0.5) * 0.3 ? colors.chest : colors.coat;

  const m = {
    x: isFore ? size.chest[0] * 0.68 : size.rump[0] * 0.68,
    y: isFore ? -(size.chest[1] * 0.46 - 0.012) : -size.rump[1] * 0.42,
    z: isFore ? size.bodyLen * 0.5 : 0.0,
  };

  const hip = joint(parent, sideSign * m.x, m.y, m.z, id);
  hip.rotation.order = 'ZXY';
  const topR = isFore ? r * 1.3 : r * 1.65;
  part(
    hip,
    new Loft(
      [
        { p: [0, 0.02, 0], rx: topR * 0.94, ry: topR },
        { p: [0, -a * 0.5, 0], rx: topR * 0.88 + r * 0.1, ry: (topR + r) * 0.5 },
        { p: [0, -a, 0], rx: r * 0.98, ry: r },
      ],
      { capStart: 0.8, capEnd: 0.9 },
    ),
    paintLeg,
    style,
    { flip: true },
  );

  const knee = joint(hip, 0, -a, 0);
  part(
    knee,
    new Loft(
      [
        { p: [0, 0.01, 0], rx: r * 0.98, ry: r },
        { p: [0, -b * 0.6, 0], rx: r * 0.94, ry: r * 0.96 },
        { p: [0, -b, 0], rx: r * 0.92, ry: r * 0.94 },
      ],
      { capStart: 0.7, capEnd: 0.5 },
    ),
    paintLeg,
    style,
    { flip: true },
  );

  const ankle = joint(knee, 0, -b, 0);
  const pawR = size.pawR;
  const pawH = pawR * 0.72;
  const pawY = -pawH * 0.32;
  part(
    ankle,
    new Loft(
      [
        { p: [0, pawY, -pawR * 0.24], rx: pawR * 0.92, ry: pawH * 0.66 },
        { p: [0, pawY, pawR * 0.34], rx: pawR, ry: pawH * 0.68 },
        { p: [0, pawY - 0.002, pawR * 0.72], rx: pawR * 0.86, ry: pawH * 0.6 },
      ],
      { capStart: 0.8, capEnd: 0.72 },
    ),
    () => colors.coat,
    style,
  );

  return { id, hip, knee, ankle, a, b, isFore, bend: isFore ? -1 : 1, sideSign };
}

function buildTail(pelvis, part, breed, style, quality) {
  const { tail, colors, size } = breed;
  const L = tail.length;
  const r = tail.radius;
  const tailBase = joint(pelvis, 0, size.rump[1] * 0.42, -size.rump[1] * 0.92, 'tailBase');
  tailBase.rotation.order = 'YXZ';
  let midpoint;

  if (tail.type === 'pom') {
    midpoint = [0, L * 0.8, -L * 0.44];
    part(tailBase, new Loft([{ p: [0, 0, 0], rx: r }, { p: [0, L * 0.4, -L * 0.2], rx: r * 0.86 }, { p: midpoint, rx: r * 0.8 }], { capStart: 0.6, capEnd: 0.6 }), () => colors.coat, style);
    const tailTip = joint(tailBase, ...midpoint);
    const R = 0.07;
    part(tailTip, new Loft([{ p: [0, 0, -0.012], rx: R }, { p: [0, 0, 0], rx: R }, { p: [0, 0, 0.012], rx: R }], { capStart: 1, capEnd: 1 }), () => colors.coat, style);
    return { tailBase, tailTip };
  }

  const plume = tail.type === 'plume' || tail.type === 'curl';
  const curve = tail.type === 'curl' ? 1 : tail.type === 'plume' ? 0.62 : 0.2;
  midpoint = [0, L * 0.5, -L * (0.42 - curve * 0.34)];
  part(
    tailBase,
    new Loft(
      [
        { p: [0, -0.01, 0.01], rx: r * 0.8 },
        { p: [0, midpoint[1] * 0.55, midpoint[2] * 0.72], rx: r },
        { p: midpoint, rx: r * 1.02 },
      ],
      { capStart: 0.6, capEnd: 0.5 },
    ),
    () => colors.coat,
    style,
    { flip: true },
  );
  if (plume) addTailFluff(tailBase, new Loft([{ p: [0, 0, 0], rx: r * 0.9 }, { p: [0, midpoint[1] * 0.55, midpoint[2] * 0.72], rx: r * 0.98 }, { p: midpoint, rx: r }], { capStart: 0, capEnd: 0 }), breed, quality, 33);

  const tailTip = joint(tailBase, ...midpoint);
  const end = [0, L * 0.3 * (1 - curve * 0.5), L * (curve * 0.46 - 0.14)];
  const tipLoft = new Loft(
    [
      { p: [0, -0.005, 0], rx: r * 1.02 },
      { p: [0, end[1] * 0.55, end[2] * 0.5], rx: r * (plume ? 1.02 : 0.76) },
      { p: end, rx: r * (plume ? 0.62 : 0.5) },
    ],
    { capStart: 0.5, capEnd: 1 },
  );
  part(tailTip, tipLoft, () => colors.coat, style, { flip: true });
  if (plume) addTailFluff(tailTip, tipLoft, breed, quality, 37);
  return { tailBase, tailTip };
}

function addTailFluff(parent, loft, breed, quality, seed) {
  const color = breed.id === 'pompom' ? breed.colors.chest : breed.colors.coat;
  parent.add(
    knit(loft, {
      stitch: 'tuft', w: 0.05, h: 0.05, depth: 0.052, droop: 0.28, flip: true, quality, seed, variance: 0.07,
      paint: () => color,
    }),
  );
}
