// Detail kecil di sekeliling tokoh: penanda terpilih, konfeti, kupu-kupu, kunang-kunang, awan.

import * as THREE from 'three';
import { knitBall } from '../yarn/loft.js';
import { stitchGeometry } from '../yarn/stitches.js';
import { yarnMaterial } from '../yarn/material.js';

const CONFETTI = 170;
const CONFETTI_COLORS = [0xf5c518, 0xf0aeb4, 0x1d8a7e, 0xd9403b, 0x7c5cc4, 0xf8f4ea];

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();

function buildRing() {
  const count = 26;
  const mesh = new THREE.InstancedMesh(stitchGeometry('bar', 'low'), yarnMaterial, count);
  const color = new THREE.Color(0xf5c518);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    // Tiap dua jahitan ada celah, seperti jahitan jelujur.
    const size = i % 2 ? 0.0001 : 1;
    q.setFromEuler(e.set(-Math.PI / 2, 0, -a + Math.PI / 2));
    m.compose(p.set(Math.cos(a), 0, -Math.sin(a)), q, s.set(0.17 * size, 0.09 * size, 0.1 * size));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, color);
  }
  return mesh;
}

function buildConfetti() {
  const mesh = new THREE.InstancedMesh(stitchGeometry('curl', 'low'), yarnMaterial, CONFETTI);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  const bits = [];
  for (let i = 0; i < CONFETTI; i++) {
    color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
    mesh.setColorAt(i, color);
    bits.push({ x: 0, y: -5, z: 0, vy: 0, spin: 0, phase: Math.random() * 6.28, size: 0.03 + Math.random() * 0.03 });
  }
  mesh.visible = false;
  return { mesh, bits };
}

function buildButterfly(color) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide });
  const geometry = new THREE.CircleGeometry(0.055, 12);
  const wings = [-1, 1].map((sign) => {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(geometry, material);
    wing.rotation.x = -Math.PI / 2;
    wing.position.x = sign * 0.05;
    pivot.add(wing);
    group.add(pivot);
    return { pivot, sign };
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.05, 3, 6), new THREE.MeshStandardMaterial({ color: 0x2a2018 }));
  body.rotation.x = Math.PI / 2;
  group.add(body);
  group.userData.wings = wings;
  return group;
}

export function createFx(scene) {
  const ring = buildRing();
  ring.position.y = 0.035;
  scene.add(ring);

  const confetti = buildConfetti();
  scene.add(confetti.mesh);
  let confettiTime = 0;

  // Kunang-kunang malam
  const fireflies = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe487, toneMapped: false }),
    26,
  );
  fireflies.frustumCulled = false;
  fireflies.visible = false;
  scene.add(fireflies);
  const flies = Array.from({ length: fireflies.count }, () => ({
    x: (Math.random() - 0.5) * 5,
    y: 0.25 + Math.random() * 1.4,
    z: (Math.random() - 0.5) * 3.6,
    phase: Math.random() * 6.28,
    speed: 0.5 + Math.random() * 0.7,
  }));

  // Taman: kupu-kupu dan awan, dibuat saat pertama dibuka.
  let garden = null;
  function buildGarden() {
    const group = new THREE.Group();
    const palette = [0xf48aa2, 0xf7d046, 0xc69cf0, 0xf4806a, 0x7ec3e6, 0xf8f4ea, 0xf7d046];
    const butterflies = palette.map((color, i) => {
      const butterfly = buildButterfly(color);
      group.add(butterfly);
      return { butterfly, phase: i * 1.7, range: 1.4 + (i % 3) * 0.7, dx: (i % 3) - 1, dz: ((i + 1) % 3) - 1 };
    });
    const clouds = [
      [-7, 4.6, -9, 1], [-1, 5.4, -10, 1.3], [5, 4.3, -9.5, 0.9], [10, 5.2, -8, 1.15], [-11, 5, -7, 1.1],
    ].map(([x, y, z, size]) => {
      const cloud = new THREE.Group();
      [[0, 0, 0, 0.8], [-0.8, -0.14, 0.1, 0.56], [0.82, -0.12, -0.08, 0.6], [0.2, 0.3, 0.1, 0.5]].forEach(([cx, cy, cz, r]) => {
        const puff = knitBall(r, { stitch: 'curl', w: 0.2, h: 0.17, depth: 0.16, scatter: true, color: 0xfbf8f1, quality: 'low', darken: 0.92 });
        puff.position.set(cx, cy, cz);
        cloud.add(puff);
      });
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(size);
      group.add(cloud);
      return { cloud, speed: 0.05 + size * 0.05 };
    });
    scene.add(group);
    return { group, butterflies, clouds };
  }

  function updateConfetti(dt, center) {
    if (!confetti.mesh.visible) return;
    confettiTime -= dt;
    const pouring = confettiTime > 2.2;
    let alive = false;
    confetti.bits.forEach((bit, i) => {
      if (bit.y < 0.02) {
        if (!pouring) {
          bit.y = -5;
        } else {
          bit.x = center.x + (Math.random() - 0.5) * 5;
          bit.z = center.z + (Math.random() - 0.5) * 3.6;
          bit.y = 2 + Math.random() * 2.4;
          bit.vy = 0.7 + Math.random() * 0.6;
        }
      }
      if (bit.y > -1) {
        alive = true;
        bit.y -= bit.vy * dt;
        bit.phase += dt * 4;
        q.setFromEuler(e.set(bit.phase, bit.phase * 0.7, 0));
        m.compose(p.set(bit.x + Math.sin(bit.phase) * 0.06, bit.y, bit.z), q, s.setScalar(bit.size));
      } else {
        m.compose(p.set(0, -5, 0), q.identity(), s.setScalar(0.0001));
      }
      confetti.mesh.setMatrixAt(i, m);
    });
    confetti.mesh.instanceMatrix.needsUpdate = true;
    if (!pouring && !alive) {
      confetti.mesh.visible = false;
      confettiTime = 0;
    }
  }

  return {
    setTheme(id) {
      fireflies.visible = id === 'night';
      if (id === 'garden' && !garden) garden = buildGarden();
      if (garden) garden.group.visible = id === 'garden';
    },
    /** Hentikan konfeti lebih awal; yang masih melayang tetap jatuh sampai habis. */
    stopCelebrate() {
      confettiTime = Math.min(confettiTime, 2.2);
    },
    celebrate(seconds = 8) {
      confettiTime = seconds;
      confetti.mesh.visible = true;
      confetti.bits.forEach((bit) => (bit.y = 0));
    },
    update(dt, time, active, center, showRing) {
      ring.visible = showRing && Boolean(active);
      if (ring.visible) {
        const size = (active.isDog ? active.radius * 1.28 : active.radius * 1.5) * (1 + Math.sin(time * 3) * 0.03);
        ring.position.x = active.position.x;
        ring.position.y = active.position.y + 0.035;
        ring.position.z = active.position.z;
        ring.rotation.y = time * 0.35;
        ring.scale.set(size, 1, size);
      }
      updateConfetti(dt, center);
      if (fireflies.visible) {
        flies.forEach((fly, i) => {
          const t = time * fly.speed + fly.phase;
          const glow = 0.5 + 0.5 * Math.sin(t * 2.3);
          m.compose(
            p.set(fly.x + Math.sin(t) * 0.5, fly.y + Math.sin(t * 1.4) * 0.2, fly.z + Math.cos(t * 0.8) * 0.4),
            q.identity(),
            s.setScalar(0.006 + glow * 0.016),
          );
          fireflies.setMatrixAt(i, m);
        });
        fireflies.instanceMatrix.needsUpdate = true;
      }
      if (garden?.group.visible) {
        garden.butterflies.forEach(({ butterfly, phase, range, dx, dz }) => {
          const t = time * 0.42 + phase;
          const x = center.x + dx * 1.6 + Math.sin(t) * range;
          const z = center.z + dz * 1.4 + Math.sin(t * 1.3 + 1) * range * 0.8;
          butterfly.position.set(x, 0.55 + Math.sin(t * 3.1) * 0.22, z);
          butterfly.rotation.y = Math.atan2(Math.cos(t) * range, Math.cos(t * 1.3 + 1) * range);
          const flap = Math.sin(time * 16 + phase) * 0.8;
          butterfly.userData.wings.forEach(({ pivot, sign }) => (pivot.rotation.z = sign * flap));
        });
        garden.clouds.forEach((item) => {
          item.cloud.position.x += item.speed * dt;
          if (item.cloud.position.x > 14) item.cloud.position.x = -14;
        });
      }
    },
  };
}
