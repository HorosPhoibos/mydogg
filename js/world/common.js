// Bahan bersama untuk semua dunia: benda boneka, lantai rajut berpetak, dinding, dan rumbai tepi.

import * as THREE from 'three';
import { Loft, knit, coreMesh, knitPlane, knitBall, seededRandom } from '../yarn/loft.js';
import { stitchGeometry } from '../yarn/stitches.js';
import { yarnMaterial } from '../yarn/material.js';

export { Loft, knitBall, knitPlane, seededRandom };

export function noise(x, z) {
  return (Math.sin(x * 2.3 + z * 1.1) + Math.sin(x * 0.9 - z * 2.7) + Math.sin(x * 5.1 + z * 4.3) * 0.5) / 2.5;
}

// Benda boneka cepat: isian + jahitan, kualitas rendah karena tidak dekat kamera.
export function plush(parent, loft, paint, options = {}) {
  const group = new THREE.Group();
  group.add(coreMesh(loft, { paint, darken: options.darken ?? 0.6, rows: options.coreRows ?? 20, sides: 14, inset: 0.006 }));
  group.add(knit(loft, { stitch: 'v', w: 0.036, h: 0.03, depth: 0.026, paint, quality: 'low', seed: options.seed ?? 19, variance: 0.06, ...options }));
  parent.add(group);
  return group;
}

export function buildTable(x, z, length = 1.56) {
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

export function buildBowl(x, z) {
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

export function buildPad(x, z) {
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

export function buildBush(x, z, r, color) {
  return placed(knitBall(r, { stitch: 'curl', w: 0.07, h: 0.062, depth: 0.075, scatter: true, color, quality: 'low', darken: 0.5 }), x, r * 0.7, z);
}

export function placed(object, x, y, z) {
  object.position.set(x, y, z);
  return object;
}

// Rumput, bunga, dan bintang memakai satu InstancedMesh per jenis, jadi taman luas tetap ringan.
export function scatter(type, spots, sizer, colorer, quality = 'low') {
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

export function buildFringe(width, depth, spacing = 0.085, size = 0.1) {
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


/**
 * Lantai rajut yang dibagi petak-petak. Petak di luar pandangan otomatis tidak digambar,
 * jadi dunia yang luas tetap ringan.
 */
export function patchFloor({ width, depth, size, paint, quality, base = 0x5b4a36, fringeColor = null }) {
  const group = new THREE.Group();
  const stitchW = quality === 'high' ? 0.1 : 0.14;
  const stitchH = quality === 'high' ? 0.086 : 0.12;
  for (let ix = 0; ix < Math.round(width / size); ix++) {
    for (let iz = 0; iz < Math.round(depth / size); iz++) {
      const cx = -width / 2 + size * (ix + 0.5);
      const cz = -depth / 2 + size * (iz + 0.5);
      const patch = knitPlane({ width: size, depth: size, w: stitchW, h: stitchH, seed: 5 + ix * 13 + iz, paint: (x, z) => paint(x + cx, z + cz) });
      patch.mesh.position.set(cx, 0, cz);
      group.add(patch.mesh);
    }
  }
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width - 0.02, 0.14, depth - 0.02), new THREE.MeshStandardMaterial({ color: base, roughness: 1 }));
  slab.position.y = -0.076;
  slab.receiveShadow = true;
  group.add(slab);
  if (fringeColor) {
    const fringe = buildFringe(width, depth, 0.22, 0.26);
    fringe.repaint(fringeColor);
    group.add(fringe.mesh);
  }
  return group;
}

/**
 * Dinding rajut tegak. paint menerima (x dari kiri ke kanan, y dari bawah) dalam satuan dunia.
 * Dinding menghadap +z sebelum diputar.
 */
export function knitWall({ length, height, paint, quality }) {
  const group = new THREE.Group();
  const w = quality === 'high' ? 0.09 : 0.12;
  const h = quality === 'high' ? 0.078 : 0.1;
  const plane = knitPlane({ width: length, depth: height, w, h, seed: 31, paint: (x, z) => paint(x, height / 2 - z) });
  plane.mesh.rotation.x = Math.PI / 2;
  plane.mesh.position.y = height / 2;
  group.add(plane.mesh);
  const back = new THREE.Mesh(new THREE.BoxGeometry(length, height, 0.06), new THREE.MeshStandardMaterial({ color: 0x8d8471, roughness: 1 }));
  back.position.set(0, height / 2, -0.035);
  back.receiveShadow = true;
  group.add(back);
  return group;
}

/** Daftar animasi kecil. Tiap tugas mengembalikan true saat selesai. */
export function createTasks() {
  const list = [];
  return {
    add(fn) {
      list.push(fn);
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i](dt)) list.splice(i, 1);
      }
    },
  };
}

/** Bergoyang seperti ditepuk, lalu kembali diam. */
export function wobble(tasks, object, { amp = 0.12, freq = 14, dur = 1.3, axis = 'z' } = {}) {
  if (object.userData.wobbling) return;
  object.userData.wobbling = true;
  const base = object.rotation[axis];
  let t = 0;
  tasks.add((dt) => {
    t += dt;
    const fade = Math.max(0, 1 - t / dur);
    object.rotation[axis] = base + Math.sin(t * freq) * amp * fade;
    if (t < dur) return false;
    object.rotation[axis] = base;
    object.userData.wobbling = false;
    return true;
  });
}

/** Penyet lalu memantul, seperti boneka yang dipencet. */
export function squish(tasks, object, { amount = 0.32, dur = 0.7 } = {}) {
  if (object.userData.squishing) return;
  object.userData.squishing = true;
  const base = object.scale.clone();
  let t = 0;
  tasks.add((dt) => {
    t += dt;
    const k = Math.sin(Math.min(t / dur, 1) * Math.PI * 3) * amount * Math.max(0, 1 - t / dur);
    object.scale.set(base.x * (1 + k * 0.5), base.y * (1 - k), base.z * (1 + k * 0.5));
    if (t < dur) return false;
    object.scale.copy(base);
    object.userData.squishing = false;
    return true;
  });
}

/**
 * Semburan kecil benang: daun gugur, kelopak, asap roket, cipratan air.
 * Satu InstancedMesh dipakai ulang untuk semua semburan di dunia itu.
 */
export function createBurst(parent, count = 120) {
  const mesh = new THREE.InstancedMesh(stitchGeometry('curl', 'low'), yarnMaterial, count);
  mesh.frustumCulled = false;
  const hidden = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);
  const bits = Array.from({ length: count }, () => ({ life: 0 }));
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    mesh.setMatrixAt(i, hidden);
    mesh.setColorAt(i, color.set(0xffffff));
  }
  parent.add(mesh);
  let next = 0;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();

  return {
    emit({ x, y, z, amount = 20, colors, speed = 1.2, up = 1, spread = 0.4, gravity = 2.5, life = 2.2, size = 0.06 }) {
      for (let k = 0; k < amount; k++) {
        const bit = bits[next];
        const i = next;
        next = (next + 1) % count;
        const a = Math.random() * Math.PI * 2;
        Object.assign(bit, {
          x: x + Math.cos(a) * spread * Math.random(),
          y,
          z: z + Math.sin(a) * spread * Math.random(),
          vx: Math.cos(a) * speed * Math.random(),
          vy: up * (0.4 + Math.random()),
          vz: Math.sin(a) * speed * Math.random(),
          gravity,
          life,
          age: 0,
          spin: Math.random() * 6,
          size: size * (0.7 + Math.random() * 0.6),
        });
        mesh.setColorAt(i, color.set(colors[k % colors.length]));
      }
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt) {
      let changed = false;
      bits.forEach((bit, i) => {
        if (bit.life <= 0) return;
        changed = true;
        bit.age += dt;
        if (bit.age >= bit.life) {
          bit.life = 0;
          mesh.setMatrixAt(i, hidden);
          return;
        }
        bit.vy -= bit.gravity * dt;
        bit.x += bit.vx * dt;
        bit.y = Math.max(0.02, bit.y + bit.vy * dt);
        bit.z += bit.vz * dt;
        bit.spin += dt * 5;
        const shrink = 1 - Math.max(0, (bit.age - bit.life * 0.7) / (bit.life * 0.3));
        q.setFromEuler(e.set(bit.spin, bit.spin * 0.6, 0));
        m.compose(p.set(bit.x, bit.y, bit.z), q, s.setScalar(bit.size * shrink));
        mesh.setMatrixAt(i, m);
      });
      if (changed) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
