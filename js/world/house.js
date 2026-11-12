// Rumah: ruang tamu luas dengan sofa yang bisa dinaiki, TV yang menyala, mainan, dan foto anjing di dinding.

import * as THREE from 'three';
import { Loft, knitBall, knitPlane, plush, placed, buildTable, buildBowl, buildPad, buildBush, patchFloor, knitWall, createTasks, wobble, squish, createBurst } from './common.js';
import { applyBake, bakeUniforms } from './baked.js';

export const HOUSE = { width: 10, depth: 7.5 };
const BACK_Z = -HOUSE.depth / 2;
const LEFT_X = -HOUSE.width / 2;
const WALL_H = 2.4;
const TILE = 0.6;

// Sofa menempel di dinding belakang, menghadap kamera.
const SOFA = { x: 0, z: -3.15, length: 2.7, seatY: 0.5 };
const SEATS = [-0.88, -0.29, 0.29, 0.88].map((dx) => ({
  x: SOFA.x + dx,
  z: SOFA.z + 0.04,
  y: SOFA.seatY,
  yaw: 0,
  front: { x: SOFA.x + dx, z: SOFA.z + 0.9 },
  occupant: null,
}));

function floorPaint(x, z) {
  const gx = Math.abs(((x + 300 * TILE) % TILE) - TILE / 2);
  const gz = Math.abs(((z + 300 * TILE) % TILE) - TILE / 2);
  if (gx < 0.04 || gz < 0.035) return 0xc8b28c;
  return (Math.floor((x + 300) / TILE) + Math.floor((z + 300) / TILE)) % 5 === 0 ? 0xebdec2 : 0xf1e6cc;
}

function wallPaint(x, y) {
  if (y < 0.34) return y > 0.3 ? 0xf1e6cc : 0x7c4522;
  if (y > WALL_H - 0.16) return 0xf1e6cc;
  return Math.floor((x + 50) / 0.36) % 2 ? 0xc8dccf : 0xd6e6da;
}

function buildSofa() {
  const sofa = new THREE.Group();
  sofa.position.set(SOFA.x, 0, SOFA.z);
  const L = SOFA.length;
  const teal = () => 0x2c7a75;
  const mustard = ({ rand }) => (rand() > 0.9 ? 0xd59a2a : 0xe5ac3c);

  // Badan bawah
  plush(sofa, new Loft(
    [
      { p: [-L / 2, 0.21, 0.02], rx: 0.44, ry: 0.21 },
      { p: [0, 0.21, 0.02], rx: 0.44, ry: 0.21 },
      { p: [L / 2, 0.21, 0.02], rx: 0.44, ry: 0.21 },
    ],
    { side: [0, 0, 1], square: 4, capStart: 0.3, capEnd: 0.3 },
  ), teal, { w: 0.05, h: 0.044, depth: 0.03 });

  // Bantal duduk
  [-0.88, 0, 0.88].forEach((cx) => {
    plush(sofa, new Loft(
      [
        { p: [cx - 0.4, SOFA.seatY - 0.05, 0.06], rx: 0.4, ry: 0.065 },
        { p: [cx, SOFA.seatY - 0.04, 0.06], rx: 0.41, ry: 0.07 },
        { p: [cx + 0.4, SOFA.seatY - 0.05, 0.06], rx: 0.4, ry: 0.065 },
      ],
      { side: [0, 0, 1], square: 3, capStart: 0.5, capEnd: 0.5 },
    ), mustard, { w: 0.045, h: 0.04, depth: 0.026 });
  });

  // Sandaran dan lengan
  plush(sofa, new Loft(
    [
      { p: [-L / 2, 0.78, -0.36], rx: 0.13, ry: 0.34 },
      { p: [0, 0.8, -0.36], rx: 0.13, ry: 0.36 },
      { p: [L / 2, 0.78, -0.36], rx: 0.13, ry: 0.34 },
    ],
    { side: [0, 0, 1], square: 3, capStart: 0.4, capEnd: 0.4 },
  ), teal, { w: 0.05, h: 0.044, depth: 0.03 });
  [-1, 1].forEach((sign) => {
    plush(sofa, new Loft(
      [
        { p: [sign * (L / 2 + 0.02), 0.6, -0.42], rx: 0.14, ry: 0.2 },
        { p: [sign * (L / 2 + 0.02), 0.62, 0], rx: 0.14, ry: 0.21 },
        { p: [sign * (L / 2 + 0.02), 0.6, 0.42], rx: 0.14, ry: 0.2 },
      ],
      { side: [1, 0, 0], square: 3, capStart: 0.6, capEnd: 0.6 },
    ), teal, { w: 0.05, h: 0.044, depth: 0.03 });
  });

  // Bantal hias
  const pillow = knitBall(0.2, { color: 0xf0aeb4, w: 0.04, h: 0.036, depth: 0.024, quality: 'low', ry: 0.08 });
  pillow.position.set(-L / 2 + 0.18, 0.7, -0.2);
  pillow.rotation.set(-1.1, 0.3, 0);
  sofa.add(pillow);
  sofa.userData.pillow = pillow;
  return sofa;
}

function buildTv() {
  const group = new THREE.Group();
  group.position.set(LEFT_X + 0.42, 0, -0.9);
  group.rotation.y = Math.PI / 2;

  // Lemari TV
  plush(group, new Loft(
    [
      { p: [-0.95, 0.24, 0], rx: 0.24, ry: 0.24 },
      { p: [0, 0.24, 0], rx: 0.24, ry: 0.24 },
      { p: [0.95, 0.24, 0], rx: 0.24, ry: 0.24 },
    ],
    { side: [0, 0, 1], square: 5, capStart: 0.2, capEnd: 0.2 },
  ), ({ p }) => (Math.abs(p.x) < 0.02 || Math.abs(Math.abs(p.x) - 0.5) < 0.02 ? 0x5e3218 : 0x8a5129), { w: 0.05, h: 0.044, depth: 0.026 });

  // Layar
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  plush(group, new Loft(
    [
      { p: [-0.68, 0.98, -0.04], rx: 0.42, ry: 0.05 },
      { p: [0, 0.98, -0.04], rx: 0.42, ry: 0.05 },
      { p: [0.68, 0.98, -0.04], rx: 0.42, ry: 0.05 },
    ],
    { side: [0, 1, 0], square: 6, capStart: 0.1, capEnd: 0.1 },
  ), () => 0x2a2a30, { w: 0.04, h: 0.036, depth: 0.02 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.7), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.position.set(0, 0.98, 0.022);
  group.add(screen);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6 }));
  stand.position.set(0, 0.52, -0.04);
  group.add(stand);

  const ctx = canvas.getContext('2d');
  let channel = 0;
  let last = -1;
  let power = 0;
  let powerTarget = 0;
  const CHANNELS = ['Kartun', 'Bulan', 'Keluarga', 'Warna'];
  const family = new Image();
  family.src = 'photos/foto-1.jpg';

  function draw(time) {
    const w = canvas.width;
    const h = canvas.height;
    if (power <= 0.01) {
      // TV mati: layar gelap dengan pantulan lembut.
      ctx.fillStyle = '#16181c';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, 0);
      ctx.lineTo(w * 0.35, 0);
      ctx.lineTo(w * 0.15, h);
      ctx.lineTo(0, h);
      ctx.fill();
      texture.needsUpdate = true;
      return;
    }
    if (channel === 2) {
      ctx.fillStyle = '#f8f0dd';
      ctx.fillRect(0, 0, w, h);
      if (family.complete && family.naturalWidth) {
        const scale = Math.max(w / family.naturalWidth, h / family.naturalHeight);
        const pan = Math.sin(time * 0.3) * 0.12;
        ctx.drawImage(family, (w - family.naturalWidth * scale) / 2, (h - family.naturalHeight * scale) * (0.5 + pan), family.naturalWidth * scale, family.naturalHeight * scale);
      }
    } else if (channel === 0) {
      ctx.fillStyle = '#8fd0e8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#7cc05a';
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      // Bola benang memantul dan tulang yang menggelinding
      const x = ((time * 70) % (w + 80)) - 40;
      const y = h * 0.72 - 18 - Math.abs(Math.sin(time * 4)) * 60;
      ctx.fillStyle = '#d9403b';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f1c232';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 10, time * 3, time * 3 + 2.4);
      ctx.stroke();
      ctx.fillStyle = '#fbf8f1';
      const bx = w - x;
      ctx.fillRect(bx - 18, h * 0.8, 36, 9);
      [[-18, 0], [-18, 9], [18, 0], [18, 9]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(bx + dx, h * 0.8 + dy, 7, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (channel === 1) {
      ctx.fillStyle = '#1a1f46';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * 3 + i * 1.7);
        ctx.fillStyle = `rgba(255, 233, 160, ${twinkle})`;
        ctx.fillRect((i * 73) % w, (i * 41) % (h * 0.8), 3, 3);
      }
      ctx.fillStyle = '#f4e5ad';
      ctx.beginPath();
      ctx.arc(w * 0.7, h * 0.35, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1f46';
      ctx.beginPath();
      ctx.arc(w * 0.7 + 14, h * 0.33, 30, 0, Math.PI * 2);
      ctx.fill();
    } else if (channel === 3) {
      const colors = ['#f5c518', '#1d8a7e', '#f0aeb4', '#d9403b', '#7c5cc4', '#2348c4', '#f8f0dd'];
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect((i * w) / colors.length, 0, w / colors.length + 1, h);
      });
    }
    // Efek menyala: garis terang yang membuka ke atas dan ke bawah.
    if (power < 1) {
      const open = (h * power) / 2;
      ctx.fillStyle = '#16181c';
      ctx.fillRect(0, 0, w, h / 2 - open);
      ctx.fillRect(0, h / 2 + open, w, h / 2 - open);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(0, h / 2 - 1, w, 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, h - 26, w, 26);
    ctx.fillStyle = '#f8f0dd';
    ctx.font = '600 16px Figtree, sans-serif';
    ctx.fillText(`MYDOGG TV · ${CHANNELS[channel]}`, 10, h - 8);
    texture.needsUpdate = true;
  }

  return {
    group,
    screen,
    update(time, dt) {
      power += Math.sign(powerTarget - power) * Math.min(Math.abs(powerTarget - power), dt * 3);
      // Cukup diperbarui sekitar 12 kali per detik, kecuali saat sedang menyala atau mati.
      const frame = Math.floor(time * 12);
      if (frame === last && (power === powerTarget)) return;
      last = frame;
      draw(time);
    },
    /** Ketuk: nyalakan, ganti saluran, dan setelah saluran terakhir matikan. */
    press() {
      if (powerTarget === 0) {
        powerTarget = 1;
        channel = 0;
        return 'TV menyala!';
      }
      if (channel === CHANNELS.length - 1) {
        powerTarget = 0;
        return 'TV dimatikan';
      }
      channel += 1;
      return `Saluran ${CHANNELS[channel]}`;
    },
  };
}

function buildPicture() {
  const group = new THREE.Group();
  group.position.set(SOFA.x, 1.62, BACK_Z + 0.06);
  const loader = new THREE.TextureLoader();
  const textures = ['photos/foto-2.jpg', 'photos/foto-1.jpg'].map((src) => {
    const texture = loader.load(src);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
  const texture = textures[0];
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }));
  photo.position.z = 0.02;
  group.add(photo);
  const teak = () => 0x7c4522;
  const bar = (stations) => plush(group, new Loft(stations, { capStart: 0.5, capEnd: 0.5, side: [0, 0, 1] }), teak, { w: 0.03, h: 0.026, depth: 0.02 });
  bar([{ p: [-0.66, 0.5, 0.02], rx: 0.04 }, { p: [0, 0.5, 0.02], rx: 0.04 }, { p: [0.66, 0.5, 0.02], rx: 0.04 }]);
  bar([{ p: [-0.66, -0.5, 0.02], rx: 0.04 }, { p: [0, -0.5, 0.02], rx: 0.04 }, { p: [0.66, -0.5, 0.02], rx: 0.04 }]);
  bar([{ p: [-0.64, -0.5, 0.02], rx: 0.04 }, { p: [-0.64, 0, 0.02], rx: 0.04 }, { p: [-0.64, 0.5, 0.02], rx: 0.04 }]);
  bar([{ p: [0.64, -0.5, 0.02], rx: 0.04 }, { p: [0.64, 0, 0.02], rx: 0.04 }, { p: [0.64, 0.5, 0.02], rx: 0.04 }]);
  let shown = 0;
  group.userData.swap = () => {
    shown = (shown + 1) % textures.length;
    photo.material.map = textures[shown];
    // Foto kedua berdiri, jadi bingkainya dipakai miring sedikit agar lucu.
    photo.scale.set(shown ? 0.75 : 1, 1, 1);
  };
  return group;
}

function buildWindow(x) {
  const group = new THREE.Group();
  group.position.set(x, 1.35, BACK_Z + 0.05);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 64);
  sky.addColorStop(0, '#8fcbe8');
  sky.addColorStop(1, '#d9f0f6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffffff';
  [[18, 22, 9], [28, 20, 11], [40, 24, 8]].forEach(([cx, cy, r]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.0), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  glass.position.z = 0.01;
  group.add(glass);
  const frame = () => 0xf6efe0;
  const bar = (stations, rx = 0.04) => plush(group, new Loft(stations, { capStart: 0.5, capEnd: 0.5, side: [0, 0, 1] }), frame, { w: 0.03, h: 0.026, depth: 0.02 });
  bar([{ p: [-0.58, 0.52, 0.02], rx: 0.04 }, { p: [0, 0.52, 0.02], rx: 0.04 }, { p: [0.58, 0.52, 0.02], rx: 0.04 }]);
  bar([{ p: [-0.58, -0.52, 0.02], rx: 0.05 }, { p: [0, -0.52, 0.02], rx: 0.05 }, { p: [0.58, -0.52, 0.02], rx: 0.05 }]);
  bar([{ p: [0, -0.5, 0.02], rx: 0.03 }, { p: [0, 0, 0.02], rx: 0.03 }, { p: [0, 0.5, 0.02], rx: 0.03 }]);
  bar([{ p: [-0.55, 0, 0.02], rx: 0.03 }, { p: [0, 0, 0.02], rx: 0.03 }, { p: [0.55, 0, 0.02], rx: 0.03 }]);
  // Gorden
  group.userData.curtains = [-1, 1].map((sign) => {
    const holder = new THREE.Group();
    holder.position.x = sign * 0.82;
    group.add(holder);
    return { holder, sign };
  });
  group.userData.curtains.forEach(({ holder, sign }) => {
    plush(holder, new Loft(
      [
        { p: [-sign * 0.14, 0.66, 0.08], rx: 0.14, ry: 0.04 },
        { p: [-sign * 0.12, 0, 0.08], rx: 0.17, ry: 0.05 },
        { p: [-sign * 0.1, -0.72, 0.08], rx: 0.2, ry: 0.05 },
      ],
      { side: [1, 0, 0], capStart: 0.3, capEnd: 0.3, bump: (s, a) => Math.sin(a * 7) * 0.12 },
    ), ({ row }) => (row % 6 < 3 ? 0xf0aeb4 : 0xf6c4c8), { w: 0.04, h: 0.036, depth: 0.022, flip: true });
  });
  return group;
}

function buildLamp(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  plush(group, new Loft([{ p: [0, 0.04, 0], rx: 0.16, ry: 0.16 }, { p: [0, 0.06, 0], rx: 0.17 }, { p: [0, 0.08, 0], rx: 0.15 }], { capStart: 0.4, capEnd: 0.4 }), () => 0x7c4522, { w: 0.03, h: 0.026 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 10), new THREE.MeshStandardMaterial({ color: 0x5e3218, roughness: 0.7 }));
  pole.position.y = 0.8;
  group.add(pole);
  plush(group, new Loft(
    [
      { p: [0, 1.42, 0], rx: 0.26 },
      { p: [0, 1.6, 0], rx: 0.2 },
      { p: [0, 1.76, 0], rx: 0.14 },
    ],
    { capStart: 0, capEnd: 0, side: [1, 0, 0] },
  ), ({ row }) => (row % 4 === 0 ? 0xe5ac3c : 0xf6efe0), { w: 0.04, h: 0.034, depth: 0.02 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe2a6, toneMapped: false }));
  bulb.position.y = 1.5;
  group.add(bulb);
  const light = new THREE.PointLight(0xffd59a, 1.6, 4.5, 1.6);
  light.position.y = 1.5;
  group.add(light);
  group.userData.toggle = () => {
    light.visible = !light.visible;
    bulb.material.color.set(light.visible ? 0xffe2a6 : 0x6b6256);
    return light.visible;
  };
  return group;
}

function buildShelf(x) {
  const group = new THREE.Group();
  group.position.set(x, 0, BACK_Z + 0.2);
  const teak = () => 0x8a5129;
  [-0.5, 0.5].forEach((dx) => {
    plush(group, new Loft([{ p: [dx, 0.02, 0], rx: 0.035, ry: 0.16 }, { p: [dx, 0.7, 0], rx: 0.035, ry: 0.16 }, { p: [dx, 1.4, 0], rx: 0.035, ry: 0.16 }], { side: [1, 0, 0], square: 4, capStart: 0.2, capEnd: 0.2 }), teak, { w: 0.03, h: 0.026 });
  });
  const colors = [0xd9403b, 0x2c6e8f, 0xf5c518, 0x1d8a7e, 0xf0aeb4, 0x7c5cc4];
  group.userData.books = [];
  [0.1, 0.55, 1.0, 1.4].forEach((y, row) => {
    plush(group, new Loft([{ p: [-0.52, y, 0], rx: 0.03, ry: 0.17 }, { p: [0, y, 0], rx: 0.03, ry: 0.17 }, { p: [0.52, y, 0], rx: 0.03, ry: 0.17 }], { side: [0, 1, 0], square: 4, capStart: 0.2, capEnd: 0.2 }), teak, { w: 0.03, h: 0.026 });
    if (row === 3) return;
    let bx = -0.42;
    for (let i = 0; i < 6 && bx < 0.42; i++) {
      const height = 0.24 + ((i * 7 + row * 3) % 5) * 0.03;
      const book = new THREE.Group();
      book.position.set(bx, y + 0.03, 0);
      group.add(book);
      plush(book, new Loft([{ p: [0, 0, 0], rx: 0.04, ry: 0.11 }, { p: [0, height / 2, 0], rx: 0.04, ry: 0.11 }, { p: [0, height, 0], rx: 0.04, ry: 0.11 }], { side: [1, 0, 0], square: 4, capStart: 0.1, capEnd: 0.1 }), () => colors[(i + row * 2) % colors.length], { w: 0.026, h: 0.022, depth: 0.014 });
      group.userData.books.push(book);
      bx += 0.1 + ((i + row) % 3) * 0.015;
    }
  });
  return group;
}

function buildPlant(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  plush(group, new Loft([{ p: [0, 0.02, 0], rx: 0.2 }, { p: [0, 0.2, 0], rx: 0.24 }, { p: [0, 0.38, 0], rx: 0.27 }], { capStart: 0.3, capEnd: 0, side: [1, 0, 0] }), ({ row }) => (row < 2 ? 0xa94f2c : 0xc8653a), { w: 0.04, h: 0.034 });
  group.add(placed(buildBush(0, 0, 0.36, 0x4d8234), 0, 0.68, 0));
  group.add(placed(buildBush(0, 0, 0.24, 0x5f9e3d), 0.18, 0.95, 0.08));
  return group;
}

// Boneka beruang rajut yang bisa dipencet.
function buildTeddy() {
  const group = new THREE.Group();
  const brown = 0xa8723a;
  const ball = (r, color, x, y, z, ry) => group.add(placed(knitBall(r, { color, w: 0.03, h: 0.026, depth: 0.02, quality: 'low', ry }), x, y, z));
  ball(0.17, brown, 0, 0.2, 0, 0.2);
  ball(0.08, 0xf1dcc0, 0, 0.2, 0.13, 0.1);
  ball(0.14, brown, 0, 0.5, 0.02);
  ball(0.055, 0xf1dcc0, 0, 0.47, 0.13);
  [-1, 1].forEach((s) => {
    ball(0.055, brown, s * 0.1, 0.62, 0);
    ball(0.065, brown, s * 0.17, 0.27, 0.06);
    ball(0.07, brown, s * 0.1, 0.06, 0.12, 0.05);
  });
  const eye = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.15, clearcoat: 1 });
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), eye);
    e.position.set(s * 0.05, 0.54, 0.125);
    group.add(e);
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), eye);
  nose.position.set(0, 0.49, 0.18);
  group.add(nose);
  ball(0.035, 0xd9403b, 0, 0.38, 0.11);
  return group;
}

// Mainan yang bisa diketuk supaya anjing terpilih datang bermain.
function buildToy(kind) {
  const group = new THREE.Group();
  if (kind === 'bone') {
    plush(group, new Loft([{ p: [-0.13, 0.05, 0], rx: 0.035 }, { p: [0, 0.05, 0], rx: 0.03 }, { p: [0.13, 0.05, 0], rx: 0.035 }], { side: [0, 1, 0], capStart: 0.5, capEnd: 0.5 }), () => 0xfbf8f1, { w: 0.022, h: 0.02 });
    [[-0.15, 0.03], [-0.15, -0.03], [0.15, 0.03], [0.15, -0.03]].forEach(([x, z]) => group.add(placed(knitBall(0.04, { color: 0xfbf8f1, w: 0.02, h: 0.018, depth: 0.012, quality: 'low' }), x, 0.045, z)));
  } else if (kind === 'duck') {
    group.add(placed(knitBall(0.11, { color: 0xf5c518, w: 0.034, h: 0.03, depth: 0.02, quality: 'low', ry: 0.085 }), 0, 0.09, 0));
    group.add(placed(knitBall(0.065, { color: 0xf5c518, w: 0.026, h: 0.022, depth: 0.016, quality: 'low' }), 0, 0.2, 0.06));
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0xee8a22, roughness: 0.7 }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.2, 0.14);
    group.add(beak);
  } else if (kind === 'rope') {
    plush(group, new Loft([{ p: [-0.2, 0.04, -0.05], rx: 0.04 }, { p: [0, 0.04, 0.04], rx: 0.04 }, { p: [0.2, 0.04, -0.03], rx: 0.04 }], { side: [0, 1, 0], capStart: 0.6, capEnd: 0.6 }), ({ row }) => [0xd9403b, 0xf6efe0, 0x2c6e8f][row % 3], { stitch: 'bar', w: 0.03, h: 0.02, depth: 0.016 });
  } else if (kind === 'carrot') {
    plush(group, new Loft([{ p: [-0.16, 0.05, 0], rx: 0.055 }, { p: [0, 0.05, 0], rx: 0.045 }, { p: [0.14, 0.05, 0], rx: 0.012 }], { side: [0, 1, 0], capStart: 0.6, capEnd: 0.4 }), () => 0xf08a2c, { w: 0.026, h: 0.022 });
    group.add(placed(knitBall(0.04, { stitch: 'tuft', color: 0x5f9e3d, w: 0.03, h: 0.03, depth: 0.02, quality: 'low' }), -0.2, 0.06, 0));
  } else {
    group.add(placed(knitBall(0.1, { stitch: 'bar', paint: ({ row }) => (row % 8 < 4 ? 0x7c5cc4 : 0xf5c518), w: 0.034, h: 0.016, depth: 0.012, quality: 'low' }), 0, 0.1, 0));
  }
  return group;
}

const TOYS = [
  { kind: 'bone', x: 1.7, z: 0.9, label: 'tulang' },
  { kind: 'duck', x: -1.7, z: 1.3, label: 'bebek karet' },
  { kind: 'rope', x: 2.7, z: -1.6, label: 'tali' },
  { kind: 'carrot', x: -2.6, z: 0.2, label: 'wortel' },
  { kind: 'ball', x: 0.5, z: 1.9, label: 'bola' },
];

export function buildHouse(quality) {
  const group = new THREE.Group();
  const floor = patchFloor({ width: HOUSE.width, depth: HOUSE.depth, size: 2.5, paint: floorPaint, quality, base: 0x6e5a3f });
  applyBake(floor, 'floor');
  group.add(floor);

  // Karpet di tengah ruangan
  const rug = knitPlane({
    width: 4.2, depth: 2.8, w: 0.07, h: 0.06, y: 0.014, seed: 4,
    paint: (x, z) => {
      if (Math.abs(x) > 1.95 || Math.abs(z) > 1.25) return 0x1d8a7e;
      if (Math.abs(x) > 1.8 || Math.abs(z) > 1.1) return 0xf5c518;
      return (Math.abs(x) + Math.abs(z)) % 0.7 < 0.12 ? 0xf0aeb4 : 0xf8f0dd;
    },
  });
  rug.mesh.position.set(0, 0, -0.4);
  applyBake(rug.mesh, 'floor');
  group.add(rug.mesh);

  const backWall = knitWall({ length: HOUSE.width, height: WALL_H, paint: (x, y) => wallPaint(x, y), quality });
  backWall.position.set(0, 0, BACK_Z);
  applyBake(backWall, 'back');
  group.add(backWall);
  const leftWall = knitWall({ length: HOUSE.depth, height: WALL_H, paint: (x, y) => wallPaint(x, y), quality });
  leftWall.position.set(LEFT_X, 0, 0);
  leftWall.rotation.y = Math.PI / 2;
  applyBake(leftWall, 'left');
  group.add(leftWall);

  const sofa = buildSofa();
  const picture = buildPicture();
  const windowFrame = buildWindow(3.3);
  const lamp = buildLamp(1.95, -3.3);
  const shelf = buildShelf(-2.85);
  const plant = buildPlant(4.35, -3.2);
  const bowl = buildBowl(3.9, -0.9);
  const teddy = buildTeddy();
  teddy.position.set(-3.3, 0.01, 2.1);
  teddy.rotation.y = 0.6;
  group.add(sofa, picture, windowFrame, lamp, shelf, plant, teddy, buildTable(0, -1.05), bowl, buildPad(3.6, 0.7));
  const tv = buildTv();
  group.add(tv.group);
  const tasks = createTasks();
  const burst = createBurst(group, 80);
  let curtainsOpen = false;
  let lastTime = 0;

  const toys = TOYS.map((toy) => {
    const object = buildToy(toy.kind);
    object.position.set(toy.x, 0.01, toy.z);
    object.rotation.y = toy.x * 1.7;
    group.add(object);
    return { ...toy, object };
  });

  // Benda yang bisa diketuk. Setiap kejutan punya id yang dihitung di penghitung kejutan.
  const interactives = [
    {
      id: 'tv', object: tv.screen,
      onTap: (api) => {
        api.say(tv.press(), 1800);
        api.sounds.click();
      },
    },
    {
      id: 'lamp', object: lamp,
      onTap: (api) => {
        const on = lamp.userData.toggle();
        // Cahaya lampu hasil bake di lantai dan dinding ikut meredup atau menyala.
        const from = bakeUniforms.uBakeLamp.value;
        let t = 0;
        tasks.add((dt) => {
          t = Math.min(1, t + dt * 4);
          bakeUniforms.uBakeLamp.value = from + ((on ? 1 : 0) - from) * t;
          return t >= 1;
        });
        api.sounds.click();
        api.say(on ? 'Lampu menyala' : 'Lampu dimatikan', 1600);
      },
    },
    {
      id: 'curtain', object: windowFrame,
      onTap: (api) => {
        curtainsOpen = !curtainsOpen;
        api.sounds.rustle();
        windowFrame.userData.curtains.forEach(({ holder, sign }) => {
          const from = holder.position.x;
          const to = sign * (curtainsOpen ? 1.05 : 0.82);
          let t = 0;
          tasks.add((dt) => {
            t = Math.min(1, t + dt * 2);
            holder.position.x = from + (to - from) * t * t * (3 - 2 * t);
            holder.scale.x = curtainsOpen ? 1 - 0.35 * t : 0.65 + 0.35 * t;
            return t >= 1;
          });
        });
        api.say(curtainsOpen ? 'Gorden dibuka. Cerahnya!' : 'Gorden ditutup', 1800);
      },
    },
    {
      id: 'picture', object: picture,
      onTap: (api) => {
        picture.userData.swap();
        wobble(tasks, picture, { amp: 0.14, freq: 9, dur: 1.6 });
        api.sounds.pop();
      },
    },
    {
      id: 'teddy', object: teddy,
      onTap: (api) => {
        squish(tasks, teddy, { amount: 0.35 });
        api.sounds.squeak();
        burst.emit({ x: teddy.position.x, y: 0.7, z: teddy.position.z, amount: 6, colors: [0xe8526c, 0xf0aeb4], speed: 0.3, up: 0.8, gravity: -0.2, life: 1.4, size: 0.05 });
        api.say(['Peluk aku!', 'Hihi, geli!', 'Aku boneka Mama'][Math.floor(Math.random() * 3)], 1600);
      },
    },
    {
      id: 'book', object: shelf,
      onTap: (api) => {
        const book = shelf.userData.books[Math.floor(Math.random() * shelf.userData.books.length)];
        if (book.userData.jumping) return;
        book.userData.jumping = true;
        const baseY = book.position.y;
        let t = 0;
        tasks.add((dt) => {
          t += dt;
          book.position.y = baseY + Math.sin(Math.min(t / 0.7, 1) * Math.PI) * 0.22;
          book.position.z = Math.sin(Math.min(t / 0.7, 1) * Math.PI) * 0.12;
          book.rotation.z = Math.sin(t * 18) * 0.2 * Math.max(0, 1 - t / 0.9);
          if (t < 0.9) return false;
          book.position.y = baseY;
          book.position.z = 0;
          book.rotation.z = 0;
          book.userData.jumping = false;
          return true;
        });
        api.sounds.boing();
      },
    },
    {
      id: 'plant', object: plant,
      onTap: (api) => {
        wobble(tasks, plant, { amp: 0.1, freq: 16, dur: 1.4 });
        api.sounds.rustle();
        burst.emit({ x: plant.position.x, y: 1, z: plant.position.z, amount: 8, colors: [0x5f9e3d, 0x4d8234], speed: 0.6, up: 0.6, life: 1.6 });
      },
    },
    {
      id: 'bowl', object: bowl,
      onTap: (api) => {
        squish(tasks, bowl, { amount: 0.2 });
        api.sounds.crunch();
        burst.emit({ x: bowl.position.x, y: 0.18, z: bowl.position.z, amount: 12, colors: [0x8c5a2b, 0xa8723a], speed: 0.5, up: 1.2, gravity: 4, life: 0.9, size: 0.035 });
        api.feedAtBowl(bowl.position.x, bowl.position.z);
      },
    },
    {
      id: 'pillow', object: sofa.userData.pillow,
      onTap: (api) => {
        squish(tasks, sofa.userData.pillow, { amount: 0.4 });
        api.sounds.boing();
      },
    },
    ...toys.map((toy) => ({
      id: 'toy', object: toy.object,
      onTap: (api) => {
        squish(tasks, toy.object, { amount: 0.3, dur: 0.5 });
        api.playWith(toy);
      },
    })),
  ];

  // Saat kamera berputar ke belakang dinding, dinding itu disembunyikan supaya isi rumah tetap terlihat.
  const walls = [
    { object: backWall, hidden: (camera) => camera.z < BACK_Z + 0.3 },
    { object: leftWall, hidden: (camera) => camera.x < LEFT_X + 0.3 },
  ];

  return {
    group,
    seats: SEATS,
    walls,
    interactives,
    obstacles: [
      ...[-1.0, -0.33, 0.33, 1.0].map((dx) => ({ x: SOFA.x + dx, z: SOFA.z - 0.05, r: 0.5, sofa: true })),
      ...[-1.45, -0.9, -0.35].map((z) => ({ x: LEFT_X + 0.42, z, r: 0.36 })),
      ...[-0.6, -0.2, 0.2, 0.6].map((dx) => ({ x: dx, z: -1.05, r: 0.34 })),
      { x: 3.9, z: -0.9, r: 0.24 },
      { x: 1.95, z: -3.3, r: 0.25 },
      { x: -2.85, z: BACK_Z + 0.2, r: 0.5 },
      { x: 4.35, z: -3.2, r: 0.4 },
      { x: -3.3, z: 2.1, r: 0.25 },
      ...toys.map((toy) => ({ x: toy.x, z: toy.z, r: 0.14 })),
    ],
    stage: { x: 0, z: 0.7 },
    layout: {
      kitty: { seat: 0, pose: 'sit' },
      jenges: { x: -0.7, z: 0.1, yaw: 0.2, pose: 'sit' },
      gemoy: { x: 0.6, z: 0.5, yaw: -0.2, pose: 'sploot' },
      pompom: { x: 1.7, z: -0.2, yaw: -0.4, pose: 'sit' },
      mama: { x: -2.2, z: -0.9, yaw: 0.6, pose: 'idle' },
      bapak: { seat: 2, pose: 'sofa' },
    },
    update(time) {
      const dt = Math.min(Math.max(time - lastTime, 0), 0.1);
      lastTime = time;
      tv.update(time, dt);
      tasks.update(dt);
      burst.update(dt);
    },
  };
}
