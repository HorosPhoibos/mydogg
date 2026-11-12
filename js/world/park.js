// Taman luas: kolam bebek, pohon, semak, bunga, jalan setapak, dan tikar piknik.

import * as THREE from 'three';
import { Loft, knitBall, knitPlane, seededRandom, plush, placed, scatter, buildBush, patchFloor, noise, createTasks, wobble, createBurst } from './common.js';

export const PARK = { width: 18, depth: 15 };

const POND = { x: 4.2, z: -3, r: 1.7 };
const pathZ = (x) => 2.2 * Math.sin(x * 0.35) + 1.5;

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
  group.userData.ducks = ducks;
  group.userData.update = (time) => {
    ducks.forEach((item, i) => {
      const { duck, phase } = item;
      const a = time * (0.22 + i * 0.05) + phase;
      const r = 0.95 + i * 0.16;
      const hop = item.hop > 0 ? Math.sin((1 - item.hop) * Math.PI) * 0.35 : 0;
      duck.position.set(POND.x + Math.cos(a) * r, 0.06 + Math.sin(time * 2.4 + i) * 0.008 + hop, POND.z + Math.sin(a) * r);
      duck.rotation.y = -a + (item.hop > 0 ? (1 - item.hop) * Math.PI * 2 : 0);
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

export function buildPark(quality) {
  const park = new THREE.Group();
  park.add(patchFloor({ width: PARK.width, depth: PARK.depth, size: 3, paint: parkPaint, quality, base: 0x3f6a2c, fringeColor: 0xe8b923 }));

  const rand = seededRandom(23);
  park.add(buildMeadowDetails(rand));
  const tasks = createTasks();
  const burst = createBurst(park, 140);
  const interactives = [];
  const blockers = [];
  TREES.forEach(([x, z, s]) => {
    const tree = buildTree(x, z, s, rand);
    park.add(tree);
    blockers.push({ object: tree, x, z, r: 1.15 * s });
    interactives.push({
      id: 'tree', object: tree,
      onTap: (api) => {
        wobble(tasks, tree, { amp: 0.07, freq: 11, dur: 1.6, axis: 'z' });
        wobble(tasks, tree, { amp: 0.05, freq: 9, dur: 1.4, axis: 'x' });
        api.sounds.rustle();
        api.sounds.chirp();
        // Daun gugur, kadang ada apel merah ikut jatuh.
        burst.emit({ x, y: 1.9 * s, z, amount: 22, colors: [0x5f9e3d, 0x4a8a35, 0x8fc052, 0xe8b923], speed: 0.6, up: 0.2, spread: 0.8, gravity: 0.6, life: 3.2, size: 0.07 });
        if (Math.random() < 0.5) burst.emit({ x, y: 1.6 * s, z: z + 0.3, amount: 2, colors: [0xd9403b], speed: 0.3, up: 0.3, gravity: 5, life: 2.4, size: 0.12 });
      },
    });
  });
  BUSHES.forEach(([x, z, r]) => {
    const bush = buildBush(x, z, r, rand() > 0.5 ? 0x4d8234 : 0x5b9339);
    park.add(bush);
    blockers.push({ object: bush, x, z, r: r + 0.1 });
    interactives.push({
      id: 'bush', object: bush,
      onTap: (api) => {
        wobble(tasks, bush, { amp: 0.12, freq: 16, dur: 1.1 });
        api.sounds.rustle();
        burst.emit({ x, y: r, z, amount: 10, colors: [0xf48aa2, 0xf7d046, 0xc69cf0, 0x7ec3e6], speed: 0.5, up: 0.8, gravity: -0.25, life: 3, size: 0.07 });
        api.say('Kupu-kupu terbang!', 1600);
      },
    });
  });

  // Tikar piknik dekat tempat keluarga berkumpul
  const picnic = knitPlane({ width: 1.8, depth: 1.3, w: 0.07, h: 0.06, y: 0.012, seed: 9, paint: (x, z) => ((Math.floor((x + 9) / 0.3) + Math.floor((z + 9) / 0.3)) % 2 ? 0xd9403b : 0xf6efe0) });
  picnic.mesh.position.set(-2.7, 0, -1.7);
  picnic.mesh.rotation.y = 0.2;
  park.add(picnic.mesh);

  const pond = buildPond();
  park.add(pond);
  pond.userData.ducks.forEach((item) => {
    item.hop = 0;
    interactives.push({
      id: 'duck', object: item.duck,
      onTap: (api) => {
        item.hop = 1;
        api.sounds.quack();
        api.say('Kwek kwek!', 1400);
      },
    });
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r - 0.1, 24), new THREE.MeshBasicMaterial());
  water.rotation.x = -Math.PI / 2;
  water.position.set(POND.x, 0.03, POND.z);
  water.visible = false;
  park.add(water);
  const ripple = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 40), new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0 }));
  ripple.rotation.x = Math.PI / 2;
  park.add(ripple);
  interactives.push({
    id: 'pond', object: water,
    onTap: (api, point) => {
      api.sounds.splash();
      const x = point?.x ?? POND.x;
      const z = point?.z ?? POND.z;
      burst.emit({ x, y: 0.08, z, amount: 14, colors: [0x7ec3e6, 0xdff2fb, 0x549fc4], speed: 0.8, up: 2.2, gravity: 6, life: 0.9, size: 0.05 });
      let t = 0;
      tasks.add((dt) => {
        t += dt;
        ripple.position.set(x, 0.05, z);
        ripple.scale.setScalar(0.1 + t * 0.9);
        ripple.material.opacity = Math.max(0, 0.8 - t * 0.6);
        return t > 1.4;
      });
    },
  });
  let lastTime = 0;

  return {
    group: park,
    blockers,
    interactives,
    obstacles: [
      { x: POND.x, z: POND.z, r: POND.r + 0.08 },
      ...TREES.map(([x, z, s]) => ({ x, z, r: 0.3 * s })),
      ...BUSHES.map(([x, z, r]) => ({ x, z, r: r + 0.04 })),
    ],
    stage: { x: -1.2, z: -0.4 },
    layout: {
      kitty: { x: -1.5, z: 0.5, yaw: 0.4, pose: 'sploot' },
      jenges: { x: -0.5, z: 0.1, yaw: 0.1, pose: 'sit' },
      gemoy: { x: 0.5, z: 0.7, yaw: -0.2, pose: 'sit' },
      pompom: { x: 1.5, z: 0.2, yaw: -0.4, pose: 'sit' },
      mama: { x: -1, z: -1, yaw: 0.2, pose: 'idle' },
      bapak: { x: 0.8, z: -1.1, yaw: -0.2, pose: 'idle' },
    },
    update(time) {
      const dt = Math.min(Math.max(time - lastTime, 0), 0.1);
      lastTime = time;
      pond.userData.ducks.forEach((item) => (item.hop = Math.max(0, item.hop - dt * 1.4)));
      pond.userData.update(time);
      tasks.update(dt);
      burst.update(dt);
    },
  };
}
