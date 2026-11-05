// Panggung: selimut rajut untuk ruangan, dan taman luas untuk berkeliaran. Pola ubin mengikuti lantai di foto.

import * as THREE from 'three';
import { Loft, coreMesh, knit, knitPlane, knitBall, seededRandom } from '../yarn/loft.js';
import { stitchGeometry } from '../yarn/stitches.js';
import { yarnMaterial } from '../yarn/material.js';

export const BLANKET = { width: 4.8, depth: 3.4 };
export const PARK = { width: 18, depth: 15 };

const POND = { x: 4.2, z: -3, r: 1.7 };
const pathZ = (x) => 2.2 * Math.sin(x * 0.35) + 1.5;

const ROOM_WORLD = { halfX: BLANKET.width / 2, halfZ: BLANKET.depth / 2, walkX: 1.95, walkZ: 1.28, roomy: false };
const PARK_WORLD = { halfX: PARK.width / 2, halfZ: PARK.depth / 2, walkX: PARK.width / 2 - 0.5, walkZ: PARK.depth / 2 - 0.5, roomy: true };

const TILE = 0.6;
const EDGE = 0.13;

const onEdge = (x, z) => Math.abs(x) > BLANKET.width / 2 - EDGE || Math.abs(z) > BLANKET.depth / 2 - EDGE;

function noise(x, z) {
  return (Math.sin(x * 2.3 + z * 1.1) + Math.sin(x * 0.9 - z * 2.7) + Math.sin(x * 5.1 + z * 4.3) * 0.5) / 2.5;
}

export const THEMES = {
  room: {
    label: 'Ruang tamu',
    world: ROOM_WORLD,
    fringe: 0x1d8a7e,
    core: 0x8c7a5c,
    paint(x, z) {
      if (onEdge(x, z)) return 0x1d8a7e;
      const gx = Math.abs(((x + 300 * TILE) % TILE) - TILE / 2);
      const gz = Math.abs(((z + 300 * TILE) % TILE) - TILE / 2);
      if (gx < 0.032 || gz < 0.03) return 0xc6b08a;
      return 0xf0e4c9;
    },
    light: { hemiSky: 0xfff4e0, hemiGround: 0x6d6352, hemi: 1.15, key: 0xfff0d8, keyI: 2.5, rim: 0xbfe8e0, rimI: 0.9, env: 0.42, fuzz: 0.34 },
    props: ['room'],
  },
  garden: {
    label: 'Taman',
    world: PARK_WORLD,
    light: { hemiSky: 0xe9f6ff, hemiGround: 0x4f6b35, hemi: 1.3, key: 0xfff6dc, keyI: 2.8, rim: 0xfff0b0, rimI: 0.7, env: 0.45, fuzz: 0.36 },
  },
  night: {
    label: 'Malam',
    world: ROOM_WORLD,
    fringe: 0xe7c76b,
    core: 0x171a33,
    paint(x, z) {
      if (onEdge(x, z)) return 0xe7c76b;
      const gx = Math.abs(((x + 300 * TILE) % TILE) - TILE / 2);
      const gz = Math.abs(((z + 300 * TILE) % TILE) - TILE / 2);
      if (gx < 0.032 || gz < 0.03) return 0x323b6e;
      return 0x4a558f;
    },
    light: { hemiSky: 0x8b9be0, hemiGround: 0x20244a, hemi: 0.95, key: 0xffd9a0, keyI: 2.3, rim: 0x9fb4ff, rimI: 1.3, env: 0.28, fuzz: 0.42 },
    props: ['room', 'night'],
  },
};

// Benda boneka cepat: isian + jahitan, kualitas rendah karena tidak dekat kamera.
function plush(parent, loft, paint, options = {}) {
  const group = new THREE.Group();
  group.add(coreMesh(loft, { paint, darken: options.darken ?? 0.6, rows: 20, sides: 14, inset: 0.006 }));
  group.add(knit(loft, { stitch: 'v', w: 0.036, h: 0.03, depth: 0.026, paint, quality: 'low', seed: options.seed ?? 19, variance: 0.06, ...options }));
  parent.add(group);
  return group;
}

function buildTable(x, z, length = 1.56) {
  const table = new THREE.Group();
  table.position.set(x, 0, z);
  const teak = () => 0x7c4522;
  const dark = () => 0x5e3218;
  const height = 0.42;
  const depth = 0.3;

  plush(table, new Loft(
    [
      { p: [-length / 2, height, 0], rx: depth, ry: 0.032 },
      { p: [0, height, 0], rx: depth, ry: 0.032 },
      { p: [length / 2, height, 0], rx: depth, ry: 0.032 },
    ],
    { side: [0, 0, 1], square: 5, capStart: 0.6, capEnd: 0.6 },
  ), teak);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      plush(table, new Loft(
        [
          { p: [sx * (length / 2 - 0.08), height, sz * (depth - 0.06)], rx: 0.036 },
          { p: [sx * (length / 2 - 0.08), height / 2, sz * (depth - 0.06)], rx: 0.036 },
          { p: [sx * (length / 2 - 0.08), 0.018, sz * (depth - 0.06)], rx: 0.04 },
        ],
        { capStart: 0.3, capEnd: 0.4, side: [1, 0, 0] },
      ), dark, { w: 0.03, h: 0.026 });
    }
  }

  // Rak bilah, seperti meja jati di foto.
  const slats = 6;
  for (let i = 0; i < slats; i++) {
    const sx = -length / 2 + 0.14 + (i / (slats - 1)) * (length - 0.28);
    plush(table, new Loft(
      [
        { p: [sx, 0.17, -depth + 0.05], rx: 0.026, ry: 0.012 },
        { p: [sx, 0.17, 0], rx: 0.026, ry: 0.012 },
        { p: [sx, 0.17, depth - 0.05], rx: 0.026, ry: 0.012 },
      ],
      { capStart: 0.5, capEnd: 0.5, side: [1, 0, 0] },
    ), dark, { w: 0.026, h: 0.024, depth: 0.016 });
  }
  return table;
}

function buildBowl(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  plush(group, new Loft(
    [
      { p: [0, 0.015, 0], rx: 0.14 },
      { p: [0, 0.05, 0], rx: 0.165 },
      { p: [0, 0.09, 0], rx: 0.17 },
    ],
    { capStart: 0.2, capEnd: 0, side: [1, 0, 0] },
  ), () => 0xd43f7a, { w: 0.03, h: 0.024, depth: 0.018, darken: 0.8 });
  const kibble = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 24), new THREE.MeshStandardMaterial({ color: 0x8c2a55, roughness: 1 }));
  kibble.position.y = 0.075;
  group.add(kibble);
  return group;
}

function buildPad(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.008, z);
  group.rotation.y = 0.14;
  const paint = ({ p }) => (Math.abs(p.x) > 0.34 || Math.abs(p.z) > 0.24 ? 0xf5f7fa : 0x8ec3e8);
  plush(group, new Loft(
    [
      { p: [0, 0.008, -0.28], rx: 0.4, ry: 0.008 },
      { p: [0, 0.008, 0], rx: 0.4, ry: 0.008 },
      { p: [0, 0.008, 0.28], rx: 0.4, ry: 0.008 },
    ],
    { square: 8, capStart: 0.1, capEnd: 0.1, side: [1, 0, 0] },
  ), paint, { w: 0.032, h: 0.028, depth: 0.012, darken: 0.85 });
  return group;
}

function buildBush(x, z, r, color) {
  return placed(knitBall(r, { stitch: 'curl', w: 0.07, h: 0.062, depth: 0.075, scatter: true, color, quality: 'low', darken: 0.5 }), x, r * 0.7, z);
}

function placed(object, x, y, z) {
  object.position.set(x, y, z);
  return object;
}

// Rumput dan bunga memakai satu InstancedMesh per jenis, jadi taman luas tetap ringan.
function scatter(type, spots, sizer, colorer, quality = 'low') {
  const mesh = new THREE.InstancedMesh(stitchGeometry(type, quality), yarnMaterial, spots.length);
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pose = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  spots.forEach((spot, i) => {
    const size = sizer(spot, i);
    q.setFromAxisAngle(up, spot.spin);
    pose.setFromAxisAngle(new THREE.Vector3(0, 0, 1), spot.flip ?? Math.PI).premultiply(q);
    m.compose(new THREE.Vector3(spot.x, spot.y, spot.z), pose, new THREE.Vector3(size, size * 1.1, size));
    mesh.setMatrixAt(i, m);
    color.set(colorer(spot, i));
    mesh.setColorAt(i, color);
  });
  return mesh;
}

function buildMeadowDetails(rand) {
  const clear = (x, z) => Math.hypot(x - POND.x, z - POND.z) > POND.r + 0.5 && Math.abs(z - pathZ(x)) > 0.42;
  const pick = () => {
    for (;;) {
      const x = (rand() - 0.5) * (PARK.width - 0.6);
      const z = (rand() - 0.5) * (PARK.depth - 0.6);
      if (clear(x, z)) return { x, z, y: 0.008, spin: rand() * Math.PI * 2, size: rand() };
    }
  };
  const group = new THREE.Group();
  const grass = Array.from({ length: 520 }, pick);
  group.add(scatter('tuft', grass, (s) => 0.1 + s.size * 0.09, (s) => (s.size > 0.5 ? 0x8fc052 : 0x5f9a39)));

  const stems = [];
  const petals = [];
  const palette = [0xf48aa2, 0xfafafa, 0xc69cf0, 0xf7d046, 0xf4806a];
  for (let i = 0; i < 46; i++) {
    const spot = pick();
    const height = 0.11 + spot.size * 0.11;
    stems.push({ ...spot, height });
    const color = palette[i % palette.length];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      petals.push({ x: spot.x + Math.cos(a) * 0.042, y: height, z: spot.z + Math.sin(a) * 0.042, spin: rand() * 6.28, flip: 0, color });
    }
    petals.push({ x: spot.x, y: height + 0.012, z: spot.z, spin: 0, flip: 0, color: 0xf5c518 });
  }
  group.add(scatter('tuft', stems, (s) => s.height * 0.72, () => 0x4f8a33));
  group.add(scatter('curl', petals, () => 0.07, (s) => s.color));
  return group;
}

function buildTree(x, z, size, rand) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(size);
  plush(tree, new Loft(
    [
      { p: [0, 1.35, 0], rx: 0.15 },
      { p: [0, 0.6, 0], rx: 0.17 },
      { p: [0, 0.02, 0], rx: 0.24 },
    ],
    { capStart: 0.3, capEnd: 0.2, side: [1, 0, 0] },
  ), () => 0x6b4426, { w: 0.07, h: 0.06, depth: 0.05 });
  const leafy = () => (rand() > 0.5 ? 0x4a8a35 : 0x5f9e3d);
  [[0, 1.75, 0, 0.82], [-0.55, 1.35, 0.14, 0.52], [0.55, 1.4, -0.12, 0.56], [0.08, 1.3, 0.5, 0.46]].forEach(([cx, cy, cz, r]) => {
    tree.add(placed(knitBall(r, { stitch: 'curl', w: 0.15, h: 0.13, depth: 0.15, scatter: true, paint: leafy, quality: 'low', darken: 0.5 }), cx, cy, cz));
  });
  return tree;
}

function buildPond() {
  const group = new THREE.Group();
  const ducks = [0, 2.4].map((phase, i) => {
    const duck = new THREE.Group();
    const body = knitBall(0.14, { color: i ? 0xf8f0dc : 0xf5c518, w: 0.05, h: 0.044, depth: 0.03, quality: 'low', ry: 0.11, darken: 0.8 });
    duck.add(body);
    const head = knitBall(0.08, { color: i ? 0xf8f0dc : 0xf5c518, w: 0.034, h: 0.03, depth: 0.02, quality: 'low', darken: 0.8 });
    head.position.set(0, 0.13, 0.1);
    duck.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xee8a22, roughness: 0.7 }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.125, 0.19);
    duck.add(beak);
    [-1, 1].forEach((sign) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }));
      eye.position.set(sign * 0.05, 0.155, 0.158);
      duck.add(eye);
    });
    group.add(duck);
    return { duck, phase };
  });
  group.userData.update = (time) => {
    ducks.forEach(({ duck, phase }, i) => {
      const a = time * (0.22 + i * 0.05) + phase;
      const r = 0.95 + i * 0.16;
      duck.position.set(POND.x + Math.cos(a) * r, 0.06 + Math.sin(time * 2.4 + i) * 0.008, POND.z + Math.sin(a) * r);
      duck.rotation.y = -a;
    });
  };
  return group;
}

const TREES = [
  [-6.6, -5.4, 1.15], [-2.6, -6, 1], [1, -6.3, 1.2], [7.4, -5.8, 1.05], [-7.8, -1, 1.1],
  [7.9, 0.6, 1.2], [6.3, 5.2, 1.1], [-7.2, 5.6, 1.15], [-2.4, 6, 1], [2.3, 6.1, 1.12],
];
const BUSHES = [
  [-4.8, -3.4, 0.5], [-1, -4.1, 0.4], [1.2, -3.7, 0.36], [7.6, -2.4, 0.46], [-5.9, 0.9, 0.42],
  [5.8, 2, 0.4], [3.6, 5, 0.46], [-4.8, 4.9, 0.5], [0.2, 4.9, 0.36], [-8, 3, 0.44],
];

function parkPaint(x, z) {
  const pond = Math.hypot(x - POND.x, z - POND.z);
  if (pond < POND.r) return Math.sin(pond * 7 + x) > 0.2 ? 0x6fb7d6 : 0x549fc4;
  if (pond < POND.r + 0.26) return 0xdac394;
  if (Math.abs(z - pathZ(x)) < 0.28) return Math.sin(x * 11 + z * 7) > 0.8 ? 0xc6ad7f : 0xd8c298;
  const patch = Math.floor((x + 90) / 3) + Math.floor((z + 90) / 3);
  const n = noise(x * 0.8, z * 0.8);
  if (patch % 2) return n > 0.1 ? 0x79ab46 : 0x6fa240;
  return n > 0.1 ? 0x659a3b : 0x5b8f38;
}

function buildPark(quality) {
  const park = new THREE.Group();
  const stitchW = quality === 'high' ? 0.1 : 0.14;
  const stitchH = quality === 'high' ? 0.086 : 0.12;
  // Lantai dibagi petak: petak di luar pandangan otomatis tidak digambar.
  const size = 3;
  for (let ix = 0; ix < PARK.width / size; ix++) {
    for (let iz = 0; iz < PARK.depth / size; iz++) {
      const cx = -PARK.width / 2 + size * (ix + 0.5);
      const cz = -PARK.depth / 2 + size * (iz + 0.5);
      const patch = knitPlane({ width: size, depth: size, w: stitchW, h: stitchH, seed: 5 + ix * 13 + iz, paint: (x, z) => parkPaint(x + cx, z + cz) });
      patch.mesh.position.set(cx, 0, cz);
      park.add(patch.mesh);
    }
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(PARK.width - 0.02, 0.14, PARK.depth - 0.02), new THREE.MeshStandardMaterial({ color: 0x3f6a2c, roughness: 1 }));
  base.position.y = -0.076;
  base.receiveShadow = true;
  park.add(base);

  const fringe = buildFringe(PARK.width, PARK.depth, 0.22, 0.26);
  fringe.repaint(0xe8b923);
  park.add(fringe.mesh);

  const rand = seededRandom(23);
  park.add(buildMeadowDetails(rand));
  const blockers = [];
  TREES.forEach(([x, z, s]) => {
    const tree = buildTree(x, z, s, rand);
    park.add(tree);
    blockers.push({ object: tree, x, z, r: 1.15 * s });
  });
  BUSHES.forEach(([x, z, r]) => {
    const bush = buildBush(x, z, r, rand() > 0.5 ? 0x4d8234 : 0x5b9339);
    park.add(bush);
    blockers.push({ object: bush, x, z, r: r + 0.1 });
  });
  park.userData.blockers = blockers;

  // Tikar piknik dekat tempat keluarga berkumpul
  const picnic = knitPlane({ width: 1.8, depth: 1.3, w: 0.07, h: 0.06, y: 0.012, seed: 9, paint: (x, z) => ((Math.floor((x + 9) / 0.3) + Math.floor((z + 9) / 0.3)) % 2 ? 0xd9403b : 0xf6efe0) });
  picnic.mesh.position.set(-2.7, 0, -1.7);
  picnic.mesh.rotation.y = 0.2;
  park.add(picnic.mesh);

  const pond = buildPond();
  park.add(pond);
  park.userData.update = pond.userData.update;
  return park;
}

function buildFringe(width = BLANKET.width, depth = BLANKET.depth, spacing = 0.085, size = 0.1) {
  const spots = [];
  for (let x = -width / 2 + 0.04; x < width / 2; x += spacing) {
    spots.push([x, depth / 2, 0]);
    spots.push([x, -depth / 2, Math.PI]);
  }
  for (let z = -depth / 2 + 0.04; z < depth / 2; z += spacing) {
    spots.push([width / 2, z, Math.PI / 2]);
    spots.push([-width / 2, z, -Math.PI / 2]);
  }
  const mesh = new THREE.InstancedMesh(stitchGeometry('tuft', 'low'), yarnMaterial, spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, yaw], i) => {
    q.setFromAxisAngle(up, yaw);
    m.compose(new THREE.Vector3(x, 0.0, z), q, new THREE.Vector3(size, size * 0.9, size * 0.7));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(0xffffff));
  });
  const repaint = (hex) => {
    const c = new THREE.Color(hex);
    const rand = seededRandom(7);
    for (let i = 0; i < spots.length; i++) {
      mesh.setColorAt(i, c.clone().multiplyScalar(0.92 + rand() * 0.16));
    }
    mesh.instanceColor.needsUpdate = true;
  };
  return { mesh, repaint };
}

export function createRoom({ quality }) {
  const group = new THREE.Group();

  // Ruangan: selimut, meja, dan isi malam
  const indoor = new THREE.Group();
  group.add(indoor);
  const blanket = knitPlane({ width: BLANKET.width, depth: BLANKET.depth, w: 0.058, h: 0.05, paint: THEMES.room.paint, quality: quality === 'high' ? 'medium' : 'low' });
  indoor.add(blanket.mesh);

  const baseMaterial = new THREE.MeshStandardMaterial({ color: THEMES.room.core, roughness: 1 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(BLANKET.width - 0.01, 0.08, BLANKET.depth - 0.01), baseMaterial);
  base.position.y = -0.044;
  base.receiveShadow = true;
  indoor.add(base);

  const fringe = buildFringe();
  indoor.add(fringe.mesh);

  // Bayangan lembut di atas latar, supaya panggung terasa mengambang.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 18, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,.42)');
  gradient.addColorStop(0.72, 'rgba(0,0,0,.24)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, toneMapped: false }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.26;
  shadowPlane.renderOrder = -1;
  group.add(shadowPlane);

  const furniture = new THREE.Group();
  furniture.add(buildTable(-1.12, -1.24), buildTable(1.12, -1.24), buildBowl(1.92, -0.18), buildPad(1.68, 0.72));
  indoor.add(furniture);

  const sky = new THREE.Group();
  const moon = knitBall(0.26, { color: 0xf4e5ad, w: 0.044, h: 0.038, depth: 0.032, quality: 'low', darken: 0.82 });
  moon.position.set(-1.7, 1.25, -1.5);
  sky.add(moon);
  [[-0.9, 1.5, -1.5], [0.1, 1.28, -1.6], [0.95, 1.55, -1.55], [1.9, 1.15, -1.4], [-2.05, 0.75, -1.4]].forEach(([x, y, z], i) => {
    const star = knitBall(0.034 + (i % 2) * 0.012, { stitch: 'curl', color: 0xffe9a0, w: 0.03, h: 0.028, depth: 0.026, scatter: true, quality: 'low', darken: 0.9 });
    star.position.set(x, y, z);
    sky.add(star);
  });
  indoor.add(sky);

  // Taman baru dibuat saat pertama dibuka, supaya halaman awal tetap cepat.
  let park = null;

  const setTheme = (id) => {
    const theme = THEMES[id];
    const outdoors = id === 'garden';
    indoor.visible = !outdoors;
    if (outdoors) {
      if (!park) {
        park = buildPark(quality);
        group.add(park);
      }
      shadowPlane.scale.set(PARK.width * 1.3, PARK.depth * 1.35, 1);
    } else {
      blanket.repaint(theme.paint);
      fringe.repaint(theme.fringe);
      baseMaterial.color.set(theme.core);
      sky.visible = id === 'night';
      shadowPlane.scale.set(BLANKET.width * 1.32, BLANKET.depth * 1.4, 1);
    }
    if (park) park.visible = outdoors;
  };

  // Pohon dan semak yang berdiri di antara kamera dan tokoh disembunyikan.
  const update = (time, camera, target) => {
    if (!park?.visible) return;
    park.userData.update(time);
    const ax = target.x - camera.x;
    const az = target.z - camera.z;
    const lengthSq = ax * ax + az * az || 1;
    for (const blocker of park.userData.blockers) {
      const u = Math.max(0, Math.min(1, ((blocker.x - camera.x) * ax + (blocker.z - camera.z) * az) / lengthSq));
      const distance = Math.hypot(blocker.x - (camera.x + ax * u), blocker.z - (camera.z + az * u));
      blocker.object.visible = distance > blocker.r || u > 0.92;
    }
  };

  return { group, setTheme, update };
}

// Rintangan sederhana untuk jalan anjing: lingkaran pada bidang lantai.
export function obstaclesFor(themeId) {
  if (themeId === 'garden') {
    return [
      { x: POND.x, z: POND.z, r: POND.r + 0.08 },
      ...TREES.map(([x, z, s]) => ({ x, z, r: 0.3 * s })),
      ...BUSHES.map(([x, z, r]) => ({ x, z, r: r + 0.04 })),
    ];
  }
  const legs = [];
  for (const tx of [-1.12, 1.12]) {
    for (const dx of [-0.6, -0.2, 0.2, 0.6]) legs.push({ x: tx + dx, z: -1.24, r: 0.34 });
  }
  legs.push({ x: 1.92, z: -0.18, r: 0.24 });
  return legs;
}
