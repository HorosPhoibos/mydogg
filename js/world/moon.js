// Bulan: dataran luas berkawah, bumi dan Saturnus di langit, roket, dan bintang yang melayang.

import * as THREE from 'three';
import { Loft, knitBall, plush, placed, scatter, patchFloor, noise, seededRandom, createTasks, createBurst } from './common.js';

export const MOON = { width: 18, depth: 15 };

const CRATERS = [
  { x: -4.6, z: -3.2, r: 1.1 },
  { x: 4.2, z: 2.6, r: 1.3 },
  { x: -5.6, z: 3.6, r: 0.8 },
  { x: 1.6, z: -4.4, r: 0.9 },
  { x: 6.8, z: -1.6, r: 0.7 },
  { x: -1.8, z: 4.8, r: 0.75 },
];
const ROCKET = { x: 5.4, z: -4.6 };

function moonPaint(x, z) {
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.r) return d < c.r * 0.55 ? 0xa59fb3 : 0xb4aec0;
    if (d < c.r + 0.25) return 0xe6e0ee;
  }
  const n = noise(x * 0.9, z * 0.9);
  if (Math.abs(noise(x * 2.4 + 3, z * 2.4)) < 0.03) return 0xb9b3c6;
  return n > 0.2 ? 0xd9d3e2 : n > -0.2 ? 0xcfc8da : 0xc4bdd0;
}

// Bibir kawah: cincin rajut yang melingkar, dibuat dari tulang punggung berbentuk lingkaran.
function buildCraterRim({ x, z, r }) {
  const points = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    points.push({ p: [x + Math.cos(a) * (r + 0.12), 0.04, z + Math.sin(a) * (r + 0.12)], rx: 0.1, ry: 0.2 });
  }
  const group = new THREE.Group();
  plush(group, new Loft(points, { side: [0, 1, 0], capStart: 0.4, capEnd: 0.4 }), ({ rand }) => (rand() > 0.85 ? 0xd3cddc : 0xe8e3ef), { w: 0.07, h: 0.06, depth: 0.04, coreRows: 60 });
  return group;
}

function buildRocket() {
  const group = new THREE.Group();
  group.position.set(ROCKET.x, 0, ROCKET.z);
  group.rotation.z = 0.06;
  const paint = ({ p }) => {
    if (p.y > 2.1) return 0xd9403b;
    if (p.y < 0.55) return 0xd9403b;
    return Math.abs(p.y - 1.25) < 0.08 ? 0x2c6e8f : 0xf6efe0;
  };
  plush(group, new Loft(
    [
      { p: [0, 0.25, 0], rx: 0.42 },
      { p: [0, 1.1, 0], rx: 0.5 },
      { p: [0, 1.9, 0], rx: 0.4 },
      { p: [0, 2.6, 0], rx: 0.04 },
    ],
    { capStart: 0.3, capEnd: 0.6, side: [1, 0, 0] },
  ), paint, { w: 0.07, h: 0.06, depth: 0.04 });
  // Jendela bundar
  const porthole = knitBall(0.17, { color: 0x7ec3e6, w: 0.04, h: 0.034, depth: 0.02, quality: 'low', darken: 0.85 });
  porthole.position.set(0, 1.6, 0.4);
  porthole.scale.z = 0.4;
  group.add(porthole);
  // Sirip
  [0, 2.1, 4.2].forEach((a) => {
    const fin = new THREE.Group();
    fin.rotation.y = a;
    plush(fin, new Loft(
      [
        { p: [0, 0.75, 0.42], rx: 0.04, ry: 0.22 },
        { p: [0, 0.35, 0.66], rx: 0.04, ry: 0.2 },
        { p: [0, 0.04, 0.78], rx: 0.04, ry: 0.12 },
      ],
      { side: [1, 0, 0], capStart: 0.4, capEnd: 0.6 },
    ), () => 0xd9403b, { w: 0.05, h: 0.044, depth: 0.03 });
    group.add(fin);
  });
  // Bendera kecil di sebelah roket
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xd9d4c3, metalness: 0.5, roughness: 0.4 }));
  pole.position.set(1.0, 0.55, 0.5);
  group.add(pole);
  const flag = new THREE.Group();
  flag.position.set(1.0, 0.98, 0.5);
  plush(flag, new Loft(
    [
      { p: [0.02, 0, 0], rx: 0.12, ry: 0.01 },
      { p: [0.2, 0, 0], rx: 0.12, ry: 0.01 },
      { p: [0.4, 0, 0], rx: 0.12, ry: 0.01 },
    ],
    { side: [0, 1, 0], square: 6, capStart: 0.1, capEnd: 0.1 },
  ), ({ p }) => (p.y > 0 ? 0xd9403b : 0xf6efe0), { w: 0.03, h: 0.026, depth: 0.012 });
  group.add(flag);
  return group;
}

// Alien rajut kecil yang mengintip dari kawah.
function buildAlien() {
  const group = new THREE.Group();
  const green = 0x8fd16a;
  group.add(placed(knitBall(0.2, { color: green, w: 0.04, h: 0.034, depth: 0.026, quality: 'low', ry: 0.24 }), 0, 0.24, 0));
  const eyeWhite = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1 });
  const eyeDark = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.1, clearcoat: 1 });
  [-0.08, 0, 0.08].forEach((x, i) => {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), eyeWhite);
    white.position.set(x, 0.34 + (i === 1 ? 0.04 : 0), 0.16);
    group.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), eyeDark);
    pupil.position.set(x, 0.34 + (i === 1 ? 0.04 : 0), 0.2);
    group.add(pupil);
  });
  [-1, 1].forEach((s) => {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), new THREE.MeshStandardMaterial({ color: green }));
    stalk.position.set(s * 0.07, 0.52, 0);
    stalk.rotation.z = -s * 0.3;
    group.add(stalk);
    group.add(placed(knitBall(0.03, { color: 0xf5c518, w: 0.02, h: 0.018, depth: 0.012, quality: 'low' }), s * 0.1, 0.6, 0));
  });
  group.visible = false;
  return group;
}

function buildEarth() {
  const paint = ({ p }) => {
    const n = noise(p.x * 3.2 + 1, p.z * 3.2 + p.y * 2.1);
    if (Math.abs(p.y) > 1.35) return 0xf6efe0;
    return n > 0.12 ? 0x5f9e3d : 0x2c6eb8;
  };
  return knitBall(1.6, { paint, w: 0.2, h: 0.17, depth: 0.12, quality: 'low', darken: 0.8 });
}

function buildSaturn() {
  const group = new THREE.Group();
  group.add(knitBall(0.9, { paint: ({ row }) => (Math.floor(row / 3) % 2 ? 0xe3b36a : 0xf0cf8e), w: 0.14, h: 0.12, depth: 0.08, quality: 'low', darken: 0.8 }));
  const ringPoints = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ringPoints.push({ p: [Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45], rx: 0.03, ry: 0.32 });
  }
  plush(group, new Loft(ringPoints, { side: [0, 1, 0], capStart: 0.3, capEnd: 0.3 }), ({ col }) => (col % 2 ? 0xc69cf0 : 0xd8b8f4), { w: 0.12, h: 0.1, depth: 0.04, coreRows: 70 });
  group.rotation.set(0.35, 0, 0.28);
  return group;
}

export function buildMoon(quality) {
  const group = new THREE.Group();
  group.add(patchFloor({ width: MOON.width, depth: MOON.depth, size: 3, paint: moonPaint, quality, base: 0x6d6681, fringeColor: 0xc69cf0 }));
  CRATERS.forEach((crater) => group.add(buildCraterRim(crater)));
  const rocket = buildRocket();
  group.add(rocket);
  const tasks = createTasks();
  const burst = createBurst(group, 140);
  const alien = buildAlien();
  group.add(alien);
  let lastTime = 0;
  let spinEarth = 0;
  let spinSaturn = 0;
  // Bidang tak terlihat di atas kawah, supaya kawah bisa diketuk.
  const craterPads = CRATERS.map((c) => {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(c.r + 0.2, 20), new THREE.MeshBasicMaterial());
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(c.x, 0.03, c.z);
    pad.visible = false;
    pad.userData.crater = c;
    group.add(pad);
    return pad;
  });

  const earth = buildEarth();
  earth.position.set(-7, 6.4, -13);
  group.add(earth);
  const saturn = buildSaturn();
  saturn.position.set(8.5, 5.4, -12);
  group.add(saturn);

  // Batu bulan kecil dan bintang yang melayang rendah, seperti di dunia dongeng.
  const rand = seededRandom(51);
  const rocks = [];
  for (let i = 0; i < 26; i++) {
    const x = (rand() - 0.5) * (MOON.width - 1);
    const z = (rand() - 0.5) * (MOON.depth - 1);
    if (Math.hypot(x, z) < 3) continue;
    rocks.push({ x, y: 0.02, z, spin: rand() * 6.28, flip: 0, size: rand() });
  }
  group.add(scatter('curl', rocks, (s) => 0.14 + s.size * 0.18, () => 0xa59fb3));

  const stars = [];
  for (let i = 0; i < 70; i++) {
    stars.push({
      x: (rand() - 0.5) * (MOON.width + 6),
      y: 1.6 + rand() * 4.5,
      z: -MOON.depth / 2 - 1 + rand() * (MOON.depth * 0.75),
      spin: rand() * 6.28,
      flip: rand() * 6.28,
      size: rand(),
    });
  }
  const starMesh = scatter('curl', stars, (s) => 0.08 + s.size * 0.12, (s) => (s.size > 0.7 ? 0xfff3c4 : 0xffe487));
  group.add(starMesh);

  const interactives = [
    {
      id: 'rocket', object: rocket,
      onTap: (api) => {
        if (rocket.userData.flying) return;
        rocket.userData.flying = true;
        api.sounds.rumble();
        api.say('3... 2... 1... Meluncur!', 2400);
        let t = 0;
        tasks.add((dt) => {
          t += dt;
          // Naik, menghilang di langit, lalu turun lagi dengan pelan.
          const up = t < 3 ? Math.pow(t / 3, 2) * 14 : t < 6 ? 14 : Math.max(0, 14 * (1 - (t - 6) / 3.5));
          rocket.position.y = up;
          rocket.rotation.y += dt * (t < 3 ? 2 : 0.4);
          if ((t < 3.2 || (t > 6 && t < 9.5)) && Math.random() < 0.7) {
            burst.emit({ x: ROCKET.x, y: up + 0.15, z: ROCKET.z, amount: 3, colors: [0xf8f4ea, 0xd9d4e6, 0xf5c518, 0xf08a2c], speed: 0.6, up: -0.4, gravity: -0.3, life: 1.6, size: 0.12 });
          }
          if (t < 9.6) return false;
          rocket.position.y = 0;
          rocket.userData.flying = false;
          return true;
        });
      },
    },
    { id: 'earth', object: earth, onTap: (api) => { spinEarth = 3; api.sounds.boing(); api.say('Halo, Bumi!', 1600); } },
    { id: 'saturn', object: saturn, onTap: (api) => { spinSaturn = 3; api.sounds.pop(); } },
    ...craterPads.map((pad) => ({
      id: 'alien', object: pad,
      onTap: (api) => {
        if (alien.userData.busy) return;
        const c = pad.userData.crater;
        alien.userData.busy = true;
        alien.visible = true;
        alien.position.set(c.x, -0.5, c.z);
        api.sounds.pop();
        api.say(['Halo, makhluk Bumi!', 'Boleh ikut main?', 'Bip bop! Anjingnya lucu!'][Math.floor(Math.random() * 3)], 2400);
        let t = 0;
        tasks.add((dt) => {
          t += dt;
          const rise = t < 0.4 ? t / 0.4 : t < 2.6 ? 1 : Math.max(0, 1 - (t - 2.6) / 0.4);
          alien.position.y = -0.55 + rise * 0.55;
          alien.rotation.z = Math.sin(t * 10) * 0.12 * rise;
          if (t < 3) return false;
          alien.visible = false;
          alien.userData.busy = false;
          return true;
        });
      },
    })),
  ];

  return {
    group,
    interactives,
    lowGravity: true,
    obstacles: [
      ...CRATERS.map((c) => ({ x: c.x, z: c.z, r: c.r + 0.3 })),
      { x: ROCKET.x, z: ROCKET.z, r: 0.95 },
      { x: ROCKET.x + 1, z: ROCKET.z + 0.5, r: 0.15 },
    ],
    blockers: [{ object: rocket, x: ROCKET.x, z: ROCKET.z, r: 1 }],
    stage: { x: 0, z: 0 },
    layout: {
      kitty: { x: -1.5, z: 0.5, yaw: 0.4, pose: 'sit' },
      jenges: { x: -0.5, z: 0.1, yaw: 0.1, pose: 'sit' },
      gemoy: { x: 0.5, z: 0.7, yaw: -0.2, pose: 'sit' },
      pompom: { x: 1.5, z: 0.2, yaw: -0.4, pose: 'sit' },
      mama: { x: -1, z: -1, yaw: 0.2, pose: 'idle' },
      bapak: { x: 0.8, z: -1.1, yaw: -0.2, pose: 'idle' },
    },
    update(time) {
      const dt = Math.min(Math.max(time - lastTime, 0), 0.1);
      lastTime = time;
      spinEarth = Math.max(0, spinEarth - dt);
      spinSaturn = Math.max(0, spinSaturn - dt);
      earth.rotation.y += dt * (0.05 + spinEarth * 3);
      saturn.rotation.y += dt * (0.03 + spinSaturn * 3);
      tasks.update(dt);
      burst.update(dt);
    },
  };
}
