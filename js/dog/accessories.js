// Aksesori yang dipakai bersama oleh anjing, Mama, dan Bapak: topi, kacamata, dan kalung manik.

import * as THREE from 'three';
import { Loft, coreMesh, knit, knitBall } from '../yarn/loft.js';

export const HEADWEAR = [
  { id: 'none', label: 'Tanpa topi' },
  { id: 'beanie', label: 'Kupluk' },
  { id: 'cap', label: 'Topi bisbol' },
  { id: 'straw', label: 'Topi jerami' },
  { id: 'party', label: 'Topi pesta' },
  { id: 'santa', label: 'Topi santa' },
  { id: 'crown', label: 'Mahkota' },
  { id: 'flower', label: 'Bunga' },
  { id: 'bow', label: 'Pita' },
];

export const EYEWEAR = [
  { id: 'none', label: 'Tanpa kacamata' },
  { id: 'sun', label: 'Kacamata hitam' },
  { id: 'round', label: 'Kacamata bulat' },
  { id: 'heart', label: 'Kacamata hati' },
];

/** Satu benda rajut: isian + jahitan. */
export function piece(parent, loft, paint, quality, extra = {}) {
  const group = new THREE.Group();
  group.add(coreMesh(loft, { paint, darken: extra.darken ?? 0.6, inset: 0.004, rows: extra.coreRows ?? 26, sides: 18, castShadow: extra.castShadow ?? true }));
  const { darken, coreRows, castShadow, ...stitches } = extra;
  group.add(knit(loft, { stitch: 'v', w: 0.028, h: 0.024, depth: 0.022, paint, quality, ...stitches }));
  parent.add(group);
  return group;
}

const dome = (r, height, ry = r) =>
  new Loft(
    [
      { p: [0, 0, 0], rx: r, ry },
      { p: [0, height * 0.5, 0], rx: r * 0.97, ry: ry * 0.97 },
      { p: [0, height, 0], rx: r * 0.72, ry: ry * 0.72 },
    ],
    { capStart: 0, capEnd: 0.82, side: [1, 0, 0] },
  );

const brim = (rx, depth, front = 0) =>
  new Loft(
    [
      { p: [0, 0, front - depth * 0.4], rx: rx * 0.8, ry: 0.008 },
      { p: [0, 0, front], rx, ry: 0.008 },
      { p: [0, 0, front + depth * 0.4], rx: rx * 0.8, ry: 0.008 },
    ],
    { capStart: 2, capEnd: 2, side: [1, 0, 0] },
  );

/**
 * Topi di atas kepala berukuran hx, hy, hz.
 * `fit` memperbesar topi untuk kepala berambut.
 */
export function buildHat(id, parent, { hx, hy, hz, quality, fit = 1 }) {
  const group = new THREE.Group();
  parent.add(group);
  const r = hx * 0.82 * fit;
  const q = quality;

  if (id === 'beanie') {
    group.position.set(0, hy * 0.5 * fit, -hz * 0.1);
    group.rotation.x = -0.12;
    const paint = ({ row }) => (row < 5 ? 0xf5c518 : Math.floor(row / 4) % 2 ? 0x1d8a7e : 0xf6efe0);
    piece(group, dome(r, 0.1, r * 0.94), paint, q);
    const pom = knitBall(0.05, { stitch: 'curl', color: 0xf5c518, w: 0.03, h: 0.026, depth: 0.03, scatter: true, quality: q });
    pom.position.set(0, 0.2, 0);
    group.add(pom);
  } else if (id === 'cap') {
    group.position.set(0, hy * 0.56 * fit, -hz * 0.06);
    group.rotation.x = -0.1;
    const paint = ({ row }) => (row < 2 ? 0xf6efe0 : 0x24508f);
    piece(group, dome(r, 0.08, r * 0.96), paint, q);
    piece(group, brim(r * 0.76, r * 0.5, r * 0.82), () => 0xf6efe0, q, { w: 0.022, h: 0.018, depth: 0.01 });
  } else if (id === 'straw') {
    group.position.set(0, hy * 0.56 * fit, -hz * 0.06);
    group.rotation.x = -0.1;
    const straw = ({ row }) => (row % 2 ? 0xe1c382 : 0xd2b06a);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.75, r * 1.82, 0.012, 32), new THREE.MeshStandardMaterial({ color: 0xc9a65e, roughness: 1 }));
    disc.castShadow = true;
    group.add(disc);
    const ring = new Loft(
      [
        { p: [0, 0.008, 0], rx: r * 1.8 },
        { p: [0, 0.014, 0], rx: r * 1.22 },
        { p: [0, 0.018, 0], rx: r * 0.95 },
      ],
      { capStart: 0, capEnd: 0, side: [1, 0, 0] },
    );
    group.add(knit(ring, { stitch: 'bar', w: 0.034, h: 0.018, depth: 0.012, paint: straw, quality: q }));
    piece(group, dome(r, 0.085, r * 0.96), ({ row }) => (row < 4 ? 0xc62c33 : straw({ row })), q, { stitch: 'bar', w: 0.03, h: 0.016, depth: 0.014 });
  } else if (id === 'party') {
    group.position.set(hx * 0.2, hy * 0.82 * fit, -hz * 0.05);
    group.rotation.z = -0.2;
    const paint = ({ row }) => (Math.floor(row / 4) % 2 ? 0xf0aeb4 : 0x7c5cc4);
    piece(group, new Loft(
      [
        { p: [0, 0, 0], rx: 0.085 },
        { p: [0, 0.08, 0], rx: 0.054 },
        { p: [0, 0.17, 0], rx: 0.012 },
      ],
      { capStart: 0, capEnd: 1, side: [1, 0, 0] },
    ), paint, q, { w: 0.024, h: 0.02, depth: 0.018 });
    const pom = knitBall(0.032, { stitch: 'curl', color: 0xf5c518, w: 0.022, h: 0.02, depth: 0.022, scatter: true, quality: q });
    pom.position.set(0, 0.19, 0);
    group.add(pom);
  } else if (id === 'santa') {
    group.position.set(0, hy * 0.56 * fit, -hz * 0.08);
    group.rotation.x = -0.14;
    piece(group, new Loft(
      [
        { p: [0, 0.02, 0], rx: r * 0.98 },
        { p: [0, 0.11, -0.01], rx: r * 0.68 },
        { p: [hx * 0.28, 0.17, -0.05], rx: r * 0.3 },
        { p: [hx * 0.56, 0.1, -0.09], rx: r * 0.1 },
      ],
      { capStart: 0, capEnd: 0.8, side: [0, 0, 1] },
    ), () => 0xc8232c, q);
    piece(group, new Loft(
      [
        { p: [0, -0.012, 0], rx: r * 1.05 },
        { p: [0, 0.012, 0], rx: r * 1.08 },
        { p: [0, 0.034, 0], rx: r * 1.02 },
      ],
      { capStart: 0, capEnd: 0, side: [1, 0, 0] },
    ), () => 0xf8f4ea, q, { stitch: 'curl', w: 0.03, h: 0.024, depth: 0.024, scatter: true });
    const pom = knitBall(0.04, { stitch: 'curl', color: 0xf8f4ea, w: 0.026, h: 0.022, depth: 0.024, scatter: true, quality: q });
    pom.position.set(hx * 0.6, 0.075, -0.1);
    group.add(pom);
  } else if (id === 'crown') {
    group.position.set(0, hy * 0.8 * fit, -hz * 0.02);
    const R = r * 0.64;
    piece(group, new Loft(
      [
        { p: [0, 0, 0], rx: R },
        { p: [0, 0.04, 0], rx: R * 1.04 },
        { p: [0, 0.075, 0], rx: R * 1.1 },
      ],
      { capStart: 0, capEnd: 0, side: [1, 0, 0] },
    ), ({ row }) => (row < 2 ? 0xc62c33 : 0xf0b92a), q, { w: 0.022, h: 0.016, depth: 0.012 });
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xf0b92a, roughness: 0.35, metalness: 0.5 });
    const ruby = new THREE.MeshPhysicalMaterial({ color: 0xd11f3a, roughness: 0.15, clearcoat: 1 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.055, 8), gold);
      tip.position.set(Math.sin(a) * R * 1.1, 0.102, Math.cos(a) * R * 1.1);
      group.add(tip);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), ruby);
      gem.position.set(Math.sin(a) * R * 1.13, 0.132, Math.cos(a) * R * 1.13);
      group.add(gem);
    }
  } else if (id === 'flower') {
    group.position.set(hx * 0.56 * fit, hy * 0.7 * fit, hz * 0.2);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petal = knitBall(0.03, { color: 0xf48aa2, w: 0.018, h: 0.016, depth: 0.012, quality: q, ry: 0.024 });
      petal.position.set(Math.cos(angle) * 0.04, Math.sin(angle) * 0.04, 0);
      group.add(petal);
    }
    const center = knitBall(0.024, { color: 0xf5c518, w: 0.016, h: 0.014, depth: 0.012, quality: q });
    center.position.z = 0.016;
    group.add(center);
  } else if (id === 'bow') {
    group.position.set(0, hy * 0.92 * fit, hz * 0.02);
    const paint = () => 0xef6f94;
    [-1, 1].forEach((sign) => {
      piece(group, new Loft(
        [
          { p: [sign * 0.006, 0, 0], rx: 0.018, ry: 0.016 },
          { p: [sign * 0.05, 0.004, 0], rx: 0.04, ry: 0.016 },
          { p: [sign * 0.092, 0.012, 0], rx: 0.05, ry: 0.016 },
        ],
        { capStart: 0.2, capEnd: 0.9, side: [0, 1, 0] },
      ), paint, q, { w: 0.02, h: 0.017, depth: 0.014 });
    });
    const knot = knitBall(0.024, { color: 0xd94e78, w: 0.014, h: 0.012, depth: 0.01, quality: q });
    group.add(knot);
  }
  return group;
}

function heartShape(size) {
  const s = size;
  const shape = new THREE.Shape();
  shape.moveTo(0, -s);
  shape.bezierCurveTo(-s * 1.4, -s * 0.2, -s * 1.1, s * 1, 0, s * 0.42);
  shape.bezierCurveTo(s * 1.1, s * 1, s * 1.4, -s * 0.2, 0, -s);
  return shape;
}

/** Kacamata dipasang tepat di depan kedua mata. `eyes` berisi dua grup mata. */
export function buildGlasses(id, parent, eyes, eyeR) {
  const group = new THREE.Group();
  parent.add(group);
  const front = eyes[0].position.z + eyeR * 1.05;
  const y = eyes[0].position.y;
  const halfGap = Math.abs(eyes[0].position.x);
  const R = eyeR * 1.42;

  const frameColor = { sun: 0x15110f, round: 0xd3a43a, heart: 0xe64a7c }[id];
  const frame = new THREE.MeshPhysicalMaterial({ color: frameColor, roughness: 0.35, metalness: id === 'round' ? 0.7 : 0.1 });
  const lens = {
    sun: new THREE.MeshPhysicalMaterial({ color: 0x0b0a0c, roughness: 0.08, clearcoat: 1 }),
    round: new THREE.MeshPhysicalMaterial({ color: 0xdff2f8, roughness: 0.05, transparent: true, opacity: 0.22 }),
    heart: new THREE.MeshPhysicalMaterial({ color: 0xf0407c, roughness: 0.1, transparent: true, opacity: 0.88 }),
  }[id];

  [-1, 1].forEach((sign) => {
    const x = sign * halfGap;
    if (id === 'heart') {
      const geometry = new THREE.ExtrudeGeometry(heartShape(R * 0.96), { depth: 0.006, bevelEnabled: false, curveSegments: 12 });
      const mesh = new THREE.Mesh(geometry, lens);
      mesh.position.set(x, y, front);
      group.add(mesh);
    } else {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 24), lens);
      disc.position.set(x, y, front);
      group.add(disc);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.13, 8, 28), frame);
      rim.position.set(x, y, front);
      group.add(rim);
    }
    // Gagang
    const temple = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.09, front * 0.72, 3, 6), frame);
    temple.rotation.x = Math.PI / 2;
    temple.position.set(sign * (halfGap + R * 0.96), y, front * 0.56);
    group.add(temple);
  });
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.1, Math.max(halfGap * 2 - R * 2, 0.002), 3, 6), frame);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, y + R * 0.16, front);
  group.add(bridge);
  return group;
}

/** Kalung manik mengelilingi sumbu tertentu. */
export function beadRing(parent, center, axis, radius, count, beadRadius, material, sizeAt = null) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), material, count);
  const u = new THREE.Vector3(1, 0, 0);
  const v = new THREE.Vector3().crossVectors(axis, u).normalize();
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    p.copy(center).addScaledVector(u, Math.cos(a) * radius).addScaledVector(v, Math.sin(a) * radius);
    const size = beadRadius * (sizeAt ? sizeAt(i / count) : 1);
    s.setScalar(size);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
