// Tiga dunia: Rumah, Taman, dan Bulan. Tiap dunia baru dirajut saat pertama dibuka.

import * as THREE from 'three';
import { buildHouse, HOUSE } from './house.js';
import { buildPark, PARK } from './park.js';
import { buildMoon, MOON } from './moon.js';

const worldSize = (size, margin = 0.5) => ({
  halfX: size.width / 2,
  halfZ: size.depth / 2,
  walkX: size.width / 2 - margin,
  walkZ: size.depth / 2 - margin,
  roomy: true,
});

export const THEMES = {
  room: {
    label: 'Rumah',
    world: worldSize(HOUSE, 0.45),
    build: buildHouse,
    light: { hemiSky: 0xfff4e0, hemiGround: 0x6d6352, hemi: 1.15, key: 0xfff0d8, keyI: 2.4, rim: 0xbfe8e0, rimI: 0.8, env: 0.42, fuzz: 0.34 },
  },
  garden: {
    label: 'Taman',
    world: worldSize(PARK),
    build: buildPark,
    light: { hemiSky: 0xe9f6ff, hemiGround: 0x4f6b35, hemi: 1.3, key: 0xfff6dc, keyI: 2.8, rim: 0xfff0b0, rimI: 0.7, env: 0.45, fuzz: 0.36 },
  },
  night: {
    label: 'Bulan',
    world: worldSize(MOON),
    build: buildMoon,
    light: { hemiSky: 0x9aa6e8, hemiGround: 0x3a3556, hemi: 1.05, key: 0xf2f0ff, keyI: 2.5, rim: 0xa9c4ff, rimI: 1.4, env: 0.3, fuzz: 0.42 },
  },
};

export function createRoom({ quality }) {
  const group = new THREE.Group();
  const built = new Map();
  let current = null;

  // Bayangan lembut di bawah dunia, supaya panggung terasa mengambang.
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
  shadowPlane.position.y = -0.3;
  shadowPlane.renderOrder = -1;
  group.add(shadowPlane);

  /** Mengganti dunia. Mengembalikan data dunia: rintangan, kursi, mainan, dan posisi awal. */
  const setTheme = (id) => {
    if (!built.has(id)) {
      const world = THEMES[id].build(quality);
      group.add(world.group);
      built.set(id, world);
    }
    built.forEach((world, key) => (world.group.visible = key === id));
    current = built.get(id);
    const { halfX, halfZ } = THEMES[id].world;
    shadowPlane.scale.set(halfX * 2.6, halfZ * 2.7, 1);
    return current;
  };

  // Benda yang menghalangi kamera (pohon, semak, roket, dinding) disembunyikan sementara.
  const update = (time, camera, target) => {
    if (!current) return;
    current.update?.(time);
    current.walls?.forEach((wall) => (wall.object.visible = !wall.hidden(camera)));
    if (!current.blockers) return;
    const ax = target.x - camera.x;
    const az = target.z - camera.z;
    const lengthSq = ax * ax + az * az || 1;
    for (const blocker of current.blockers) {
      const u = Math.max(0, Math.min(1, ((blocker.x - camera.x) * ax + (blocker.z - camera.z) * az) / lengthSq));
      const distance = Math.hypot(blocker.x - (camera.x + ax * u), blocker.z - (camera.z + az * u));
      blocker.object.visible = distance > blocker.r || u > 0.92;
    }
  };

  /** Benda yang bisa diketuk di dunia ini. Mengembalikan yang paling dekat dengan kamera beserta titik ketukannya. */
  const pick = (raycaster) => {
    let best = null;
    for (const item of current?.interactives ?? []) {
      if (!item.object.visible && !item.object.isMesh) continue;
      const hit = raycaster.intersectObject(item.object, true)[0];
      if (hit && (!best || hit.distance < best.distance)) best = { item, distance: hit.distance, point: hit.point };
    }
    return best;
  };

  return { group, setTheme, update, pick };
}
