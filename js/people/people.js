// Mama dan Bapak versi boneka rajut. Ciri yang dipakai berasal dari foto:
// Mama berambut hitam panjang, atasan merah marun berenda hitam, tas hitam bergambar, acungan jempol.
// Bapak berambut pendek dan berkumis, polo cokelat abu berkerah krem-merah, jin, membawa kue ulang tahun.

import * as THREE from 'three';
import { Loft, coreMesh, knit, knitBall } from '../yarn/loft.js';
import { joint, createEye } from '../dog/rig.js';
import { solveTwoBone, Spring } from '../dog/ik.js';
import { HEADWEAR, EYEWEAR, piece, buildHat, buildGlasses, beadRing, buildHelmet } from '../dog/accessories.js';

export const PEOPLE = [
  {
    id: 'mama',
    name: 'Mama',
    role: 'Selalu kasih jempol',
    about: 'Rambut hitam panjang dan atasan marun berenda. Panggil Mama, semua anjing akan datang.',
    signature: 'thumbs',
    signatureLabel: 'Kasih jempol',
    height: 1.56,
    skin: 0xc99a78,
    shoes: 0x201c20,
    hair: 'long',
  },
  {
    id: 'bapak',
    name: 'Bapak',
    role: 'Pembawa kue',
    about: 'Kumis tipis, polo berkerah merah, dan kue cokelat. Begitu kuenya keluar, anjing-anjing pasti mendekat.',
    signature: 'cake',
    signatureLabel: 'Keluarkan kue',
    height: 1.7,
    skin: 0xd2a381,
    shoes: 0x38291f,
    hair: 'short',
  },
];

const BLACK = 0x18161b;
const JEANS = 0x2d4a7c;
const KHAKI = 0xb79b6e;

const batik = ({ row, col }) => {
  const a = (row + col) % 6;
  const b = (row - col + 600) % 6;
  if (a === 0 || b === 0) return 0xe0b56a;
  return (row + col * 2) % 9 === 0 ? 0xf1e0ba : 0x5c3218;
};
const flowers = (base, petal) => ({ row, col }) => {
  const r = row % 8;
  const c = (col + (row % 16 < 8 ? 4 : 0)) % 8;
  if ((r === 1 || r === 3) && c === 2) return petal;
  if (r === 2 && (c === 1 || c === 3)) return petal;
  if (r === 2 && c === 2) return 0xf5c518;
  return base;
};

const TOP = 0.285;

/**
 * Setelan Mama dan Bapak.
 * shirt: warna atasan, sleeve: warna lengan, long: lengan panjang,
 * cuff: warna ujung lengan, legs: warna celana, shin: warna betis (celana pendek), skirt: warna rok.
 */
const OUTFITS = {
  mama: [
    {
      id: 'marun', label: 'Marun renda',
      shirt: ({ p, a, row, col }) => (p.y > TOP * 0.56 + Math.sin(a * 12) * 0.008 ? ((row + col) % 3 === 0 ? 0x352329 : 0x161114) : 0x7c1628),
      sleeve: 0x7c1628, cuff: [0, 0x161114], legs: BLACK, neck: 0x161114,
    },
    { id: 'daster', label: 'Daster bunga', shirt: flowers(0xf29ab0, 0xf8f4ea), sleeve: flowers(0xf29ab0, 0xf8f4ea), cuff: [0, 0xe77c97], skirt: flowers(0xf29ab0, 0xf8f4ea), legs: 'skin', neck: 0xe77c97, flare: 0.14 },
    { id: 'kebaya', label: 'Kebaya batik', shirt: () => 0x1d8a7e, sleeve: 0x1d8a7e, long: true, cuff: [0, 0xf5c518], skirt: batik, legs: 'skin', neck: 0xf5c518, flare: 0.13 },
    { id: 'kaus', label: 'Kaus kuning', shirt: ({ row }) => (row < 3 ? 0xd9a90f : 0xf5c518), sleeve: 0xf5c518, cuff: [0, 0xd9a90f], legs: JEANS, neck: 0xd9a90f, flare: 0.13 },
    { id: 'kardigan', label: 'Kardigan', shirt: ({ p }) => (p.z > 0 && Math.abs(p.x) < 0.035 ? 0xf8f4ea : 0xc86a8a), sleeve: 0xc86a8a, long: true, cuff: [0, 0xa84e70], legs: BLACK, neck: 0xa84e70 },
    { id: 'gaunBiru', label: 'Gaun biru', shirt: ({ row }) => (row % 7 === 0 ? 0x4c78c9 : 0x2f5cb2), sleeve: 0x2f5cb2, cuff: [0, 0xf8f4ea], skirt: ({ row }) => (row % 7 === 0 ? 0x4c78c9 : 0x2f5cb2), legs: 'skin', neck: 0xf8f4ea, flare: 0.14 },
  ],
  bapak: [
    {
      id: 'polo', label: 'Polo cokelat',
      shirt: ({ p }) => {
        if (p.z > 0 && Math.abs(p.x) < 0.017 && p.y > TOP * 0.62) return 0x77695d;
        if (p.z > 0 && p.x > 0.04 && p.x < 0.1 && p.y > TOP * 0.44 && p.y < TOP * 0.68) return 0x7f7165;
        return 0x8e7f72;
      },
      sleeve: 0x8e7f72, cuff: [0xe9dcc0, 0xc62c33], legs: JEANS, collar: true,
    },
    { id: 'batik', label: 'Kemeja batik', shirt: batik, sleeve: batik, long: true, cuff: [0, 0xe0b56a], legs: BLACK, collar: false, neck: 0xe0b56a },
    { id: 'merahPutih', label: 'Jersey merah putih', shirt: ({ n }) => (n.y > -0.2 && n.z < 0.5 ? 0xd92a35 : n.z > 0.5 && n.y > 0 ? 0xd92a35 : 0xf6f2e8), sleeve: 0xd92a35, cuff: [0, 0xf6f2e8], legs: 0xf6f2e8, shin: 'skin', neck: 0xf6f2e8 },
    { id: 'kemeja', label: 'Kemeja biru', shirt: ({ p }) => (p.z > 0 && Math.abs(p.x) < 0.012 ? 0x5e88b8 : 0x79a4d0), sleeve: 0x79a4d0, long: true, cuff: [0, 0x5e88b8], legs: KHAKI, collar: true, collarColor: [0x79a4d0, 0x79a4d0] },
    { id: 'sweter', label: 'Sweter belang', shirt: ({ row }) => (Math.floor(row / 4) % 2 ? 0x2c6e8f : 0xf4ead2), sleeve: ({ row }) => (Math.floor(row / 4) % 2 ? 0x2c6e8f : 0xf4ead2), long: true, cuff: [0, 0x2c6e8f], legs: JEANS, neck: 0x2c6e8f },
    { id: 'kausHitam', label: 'Kaus hitam', shirt: () => 0x222026, sleeve: 0x222026, cuff: [0, 0x34323a], legs: KHAKI, shin: 'skin', neck: 0x34323a },
  ],
};

const NECK_ITEMS = [
  { id: 'none', label: 'Tanpa kalung' },
  { id: 'pearl', label: 'Kalung mutiara' },
  { id: 'gold', label: 'Kalung emas' },
  { id: 'scarf', label: 'Syal' },
  { id: 'tie', label: 'Dasi' },
  { id: 'bow', label: 'Dasi kupu-kupu' },
];

const STITCH = { w: 0.022, h: 0.0195, depth: 0.016 };
const HAIR = 0x17130f;

const NUMERIC = ['y', 'lean', 'roll', 'twist', 'hp', 'hy', 'hr', 'lf', 'la', 'le', 'rf', 'ra', 're', 'lx', 'ly', 'lz', 'rx', 'ry', 'rz', 'cake', 'lookWeight', 'reach'];

const smooth = (a, b, t) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

function base(o, m, t) {
  o.y = m.hipY + Math.sin(t * 1.9) * 0.002;
  o.lean = 0;
  o.roll = 0;
  o.twist = 0;
  o.hp = 0;
  o.hy = 0;
  o.hr = 0;
  o.lf = 0.04;
  o.la = 0.14;
  o.le = 0.16;
  o.rf = 0.04;
  o.ra = 0.14;
  o.re = 0.16;
  o.lx = -m.footX;
  o.ly = 0;
  o.lz = 0;
  o.rx = m.footX;
  o.ry = 0;
  o.rz = 0;
  o.cake = 0;
  o.lookWeight = 1;
  o.reach = 0;
}

const POSES = {
  idle: { fn: base },
  walk: {
    fn(o, m, t, ctx) {
      base(o, m, t);
      const A = ctx.stride;
      const foot = (phase, key) => {
        const p = phase % 1;
        if (p < 0.5) {
          o[`${key}z`] = A * (1 - p * 4);
          o[`${key}y`] = 0;
        } else {
          const u = (p - 0.5) * 2;
          o[`${key}z`] = A * (-1 + 2 * u * u * (3 - 2 * u));
          o[`${key}y`] = Math.sin(u * Math.PI) * 0.038;
        }
      };
      foot(ctx.gait, 'l');
      foot(ctx.gait + 0.5, 'r');
      const swing = Math.cos(ctx.gait * Math.PI * 2);
      o.y += Math.sin(ctx.gait * Math.PI * 4) * 0.005 - 0.006;
      o.roll = swing * 0.018;
      o.twist = swing * 0.05;
      o.lf = -swing * 0.42;
      o.rf = swing * 0.42;
      o.le = 0.32;
      o.re = 0.32;
      o.lookWeight = 0.4;
    },
  },
  wave: {
    duration: 2.4,
    fn(o, m, t) {
      base(o, m, t);
      const up = smooth(0, 0.3, t) * (1 - smooth(2.05, 2.4, t));
      o.rf = 0.2 * up + 0.04;
      o.ra = 0.14 + 2.3 * up;
      o.re = 0.16 + (0.5 + Math.sin(t * 10) * 0.32) * up;
      o.hr = -0.1 * up;
      o.roll = -0.012 * up;
    },
  },
  thumbs: {
    duration: 3.4,
    fn(o, m, t) {
      base(o, m, t);
      const up = smooth(0, 0.35, t) * (1 - smooth(3, 3.4, t));
      const pump = Math.sin(t * 6) * 0.06 * up;
      o.lf = 0.04 + 0.42 * up;
      o.rf = 0.04 + 0.42 * up;
      o.la = 0.14 + 0.2 * up;
      o.ra = 0.14 + 0.2 * up;
      o.le = 0.16 + (1.3 + pump) * up;
      o.re = 0.16 + (1.3 - pump) * up;
      o.hr = 0.09 * up;
      o.hp = 0.04 * up;
    },
  },
  cake: {
    duration: 7,
    fn(o, m, t) {
      base(o, m, t);
      const up = smooth(0, 0.4, t) * (1 - smooth(6.5, 7, t));
      o.lf = 0.04 + 0.62 * up;
      o.rf = 0.04 + 0.62 * up;
      o.la = 0.14 + 0.1 * up;
      o.ra = 0.14 + 0.1 * up;
      o.le = 0.16 + 0.84 * up;
      o.re = 0.16 + 0.84 * up;
      o.hp = -0.2 * up;
      o.cake = up;
    },
  },
  dance: {
    duration: 4.2,
    fn(o, m, t) {
      base(o, m, t);
      const beat = Math.sin(t * 6.4);
      o.y += Math.abs(beat) * 0.016 - 0.012;
      o.roll = beat * 0.055;
      o.twist = beat * 0.18;
      o.hr = -beat * 0.09;
      o.lf = 0.3;
      o.rf = 0.3;
      o.la = 1.1 + beat * 0.7;
      o.ra = 1.1 - beat * 0.7;
      o.le = 0.8;
      o.re = 0.8;
      o.lookWeight = 0.5;
    },
  },
  // Duduk di sofa seperti boneka: paha rata di atas bantal, lutut di tepi, kaki menggantung
  // dan sesekali berayun pelan. ctx.seatY adalah tinggi permukaan bantal.
  sofa: {
    fn(o, m, t, ctx) {
      base(o, m, t);
      // Pinggul = permukaan bantal + tebal paha (0.058) + jarak sendi paha ke pinggul (0.015).
      o.y = (ctx.seatY ?? 0.3) + 0.073;
      o.lean = -0.16;
      o.hp = 0.06;
      const sway = Math.sin(t * 1.7) * 0.018;
      o.lx = -m.footX - 0.012;
      o.rx = m.footX + 0.012;
      o.ly = o.y - 0.26;
      o.ry = o.y - 0.26;
      o.lz = 0.23 + sway;
      o.rz = 0.23 - sway;
      o.lf = 0.55;
      o.rf = 0.55;
      o.la = 0.1;
      o.ra = 0.1;
      o.le = 0.55;
      o.re = 0.55;
    },
  },
  clap: {
    fn(o, m, t) {
      base(o, m, t);
      const clap = Math.abs(Math.sin(t * 7));
      o.lf = 0.95;
      o.rf = 0.95;
      o.la = 0.12 - clap * 0.22;
      o.ra = 0.12 - clap * 0.22;
      o.le = 0.85;
      o.re = 0.85;
      o.y += Math.abs(Math.sin(t * 3.5)) * 0.008;
      o.hp = 0.08;
    },
  },
  umbrella: {
    fn(o, m, t) {
      base(o, m, t);
      o.rf = 0.62;
      o.ra = 0.22;
      o.re = 1.25;
      o.hp = 0.06 + Math.sin(t * 1.4) * 0.02;
    },
  },
  point: {
    duration: 2.4,
    fn(o, m, t) {
      base(o, m, t);
      const up = smooth(0, 0.25, t) * (1 - smooth(2, 2.4, t));
      o.rf = 0.04 + 1.05 * up + Math.sin(t * 9) * 0.05 * up;
      o.ra = 0.14 - 0.08 * up;
      o.re = 0.16 - 0.06 * up;
      o.hp = -0.22 * up;
    },
  },
  shakeHand: {
    duration: 4.2,
    fn(o, m, t) {
      base(o, m, t);
      const down = smooth(0, 0.5, t) * (1 - smooth(3.7, 4.2, t));
      // Berlutut satu kaki, badan sedikit condong, tangan kiri menyambut kaki anjing.
      o.y = m.hipY * (1 - 0.56 * down);
      // Badan tetap tegak supaya kepala berada di atas kepala anjing, tidak bertabrakan.
      o.lean = 0.1 * down;
      o.hp = -0.42 * down;
      o.lz = 0.1 * down;
      o.rz = -0.17 * down;
      o.rf = 0.04 + 0.1 * down;
      o.lookWeight = 1 - down;
      o.reach = down;
    },
  },
  pat: {
    fn(o, m, t) {
      base(o, m, t);
      const down = smooth(0, 0.5, t);
      o.y = m.hipY * (1 - 0.36 * down);
      o.lean = 0.14 * down;
      o.hp = -0.46 * down;
      o.lz = 0.1 * down;
      o.rz = -0.15 * down;
      o.lf = 0.04 + 0.2 * down;
      o.le = 0.16 + 0.5 * down;
      o.lookWeight = 0;
      o.reach = down;
    },
  },
};

export class Person {
  constructor(data, quality) {
    this.data = data;
    this.id = data.id;
    this.name = data.name;
    this.isDog = false;
    this.idlePose = 'idle';
    this.favourites = ['idle', 'idle', 'idle', 'wave', data.signature, 'dance'];
    this.quality = quality;
    this.root = new THREE.Group();
    this.root.scale.setScalar(data.height);
    this.position = this.root.position;
    this.yaw = 0;
    this.speed = 0;
    this.stepping = 0;
    this.radius = data.height * 0.17;
    this.walkSpeed = 0.74;
    this.runSpeed = 1.25;
    this.stride = 0.072;
    this.gait = 0;
    this.m = { hipY: 0.425, footX: 0.07, footH: 0.04 };

    this.poseName = 'idle';
    this.poseTime = Math.random() * 5;
    this.prevName = 'idle';
    this.prevTime = 0;
    this.blend = 1;
    this.a = {};
    this.b = {};
    this.o = {};
    NUMERIC.forEach((k) => {
      this.a[k] = 0;
      this.b[k] = 0;
      this.o[k] = 0;
    });
    this.ctx = { gait: 0, stride: this.stride };

    this.lookPoint = null;
    this.lookOverride = null;
    /** Sasaran tangan: objek yang dikejar, lengan (0 kiri, 1 kanan), tinggi tambahan, dan ayunan. */
    this.reach = null;
    this.lookYaw = new Spring(20, 7);
    this.lookPitch = new Spring(20, 7);
    this.eyeYaw = new Spring(170, 22);
    this.eyePitch = new Spring(170, 22);
    this.blinkTimer = 2 + Math.random() * 3;
    this.blinkT = 1;
    this.brain = { mode: 'rest', timer: 4 + Math.random() * 4, target: new THREE.Vector3(), then: null, faceYaw: 0, manual: false };

    this.#build();
  }

  setPose(name) {
    if (this.poseName === name) {
      if (POSES[name].duration) this.poseTime = 0;
      return;
    }
    this.prevName = this.poseName;
    this.prevTime = this.poseTime;
    this.poseName = name;
    this.poseTime = 0;
    this.blend = 0;
  }

  express() {}

  /** Payung rajut belang-belang untuk permainan Hujan. */
  setUmbrella(on) {
    if (on && !this.umbrella) {
      const group = joint(this.torso, 0.1, 0.62, 0.12);
      const colors = [0xd9403b, 0xf5c518, 0x1d8a7e, 0xf0aeb4];
      const canopy = new Loft([
        { p: [0, 0.06, 0], rx: 0.36 },
        { p: [0, 0.16, 0], rx: 0.24 },
        { p: [0, 0.24, 0], rx: 0.04 },
      ], { capStart: 0, capEnd: 0.8, side: [1, 0, 0], bump: (s, a) => Math.abs(Math.sin(a * 4)) * 0.06 * (1 - s) });
      piece(group, canopy, ({ a }) => colors[Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4], this.quality, { w: 0.03, h: 0.026, depth: 0.016 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x5e3218, roughness: 0.6 }));
      pole.position.y = -0.04;
      group.add(pole);
      this.umbrella = group;
    }
    if (this.umbrella) this.umbrella.visible = on;
  }

  /** Helm astronaut untuk dunia bulan. */
  setHelmet(on) {
    if (on && !this.helmet) this.helmet = buildHelmet(this.head, 0.27, new THREE.Vector3(0, 0.02, 0.01));
    if (this.helmet) this.helmet.visible = on;
  }

  get poseFinished() {
    const duration = POSES[this.poseName].duration;
    return duration ? this.poseTime >= duration : false;
  }

  headWorld(target) {
    return this.head.getWorldPosition(target);
  }

  chestWorld(target) {
    return this.torso.getWorldPosition(target);
  }

  #part(parent, loft, paint, extra = {}) {
    const group = new THREE.Group();
    group.add(coreMesh(loft, { paint, darken: 0.62, inset: 0.004, rows: 24, sides: 16 }));
    group.add(knit(loft, { ...STITCH, stitch: 'v', paint, quality: this.quality, variance: 0.04, ...extra }));
    parent.add(group);
    return group;
  }

  #build() {
    const d = this.data;
    const isMama = d.hair === 'long';
    const body = joint(this.root);
    const hips = joint(body, 0, this.m.hipY, 0);
    const torso = joint(hips);
    this.body = body;
    this.hips = hips;
    this.torso = torso;

    const skin = () => d.skin;
    const top = TOP;

    // Leher dan kepala
    this.#part(torso, new Loft([
      { p: [0, top - 0.02, 0], rx: 0.048 },
      { p: [0, top + 0.05, 0], rx: 0.044 },
    ].concat([{ p: [0, top + 0.08, 0.002], rx: 0.044 }]), { capStart: 0, capEnd: 0 }), skin, { w: 0.02, h: 0.02, depth: 0.012 });

    const headR = [0.175, 0.178, 0.165];
    const head = joint(torso, 0, top + 0.215, 0.008);
    this.head = head;
    const faceBlush = ({ p, rand }) => {
      if (p.z > headR[2] * 0.42 && p.y < -0.018 && p.y > -0.064 && Math.abs(p.x) > 0.082 && Math.abs(p.x) < 0.128 && rand() > 0.2) return isMama ? 0xdc8c84 : 0xdb9a84;
      return d.skin;
    };
    const headLoft = new Loft([
      { p: [0, 0, -headR[2] * 0.5], rx: headR[0] * 0.88, ry: headR[1] * 0.88 },
      { p: [0, 0, 0], rx: headR[0], ry: headR[1] },
      { p: [0, -0.008, headR[2] * 0.5], rx: headR[0] * 0.88, ry: headR[1] * 0.88 },
    ], { capStart: 0.9, capEnd: 0.8 });
    this.#part(head, headLoft, faceBlush);

    // Wajah
    // Permukaan depan kepala ada sedikit di depan jari-jari karena bentuknya lonjong.
    const faceZ = headR[2] * 0.5 + 0.8 * headR[0] * 0.88;
    const eyeZ = faceZ - 0.024;
    this.eyes = [-1, 1].map((sign) => createEye(head, sign * 0.066, 0.016, eyeZ, 0.027));
    const nose = knitBall(0.022, { color: d.skin, w: 0.016, h: 0.014, depth: 0.009, quality: this.quality, darken: 0.82 });
    nose.position.set(0, -0.022, faceZ + 0.006);
    head.add(nose);
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.03, 0.0052, 6, 18, Math.PI * 0.9),
      new THREE.MeshStandardMaterial({ color: 0x6e2430, roughness: 0.85 }),
    );
    smile.rotation.z = Math.PI + Math.PI * 0.05;
    smile.position.set(0, -0.056, faceZ - 0.014);
    smile.rotation.x = 0.2;
    head.add(smile);
    const browMaterial = new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.9 });
    [-1, 1].forEach((sign) => {
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.03, 3, 6), browMaterial);
      brow.rotation.z = Math.PI / 2 + sign * 0.14;
      brow.position.set(sign * 0.066, 0.064, eyeZ + 0.002);
      head.add(brow);
    });
    [-1, 1].forEach((sign) => {
      const ear = knitBall(0.03, { color: d.skin, w: 0.018, h: 0.016, depth: 0.01, quality: this.quality, darken: 0.75 });
      ear.position.set(sign * headR[0] * 1.0, -0.006, 0);
      head.add(ear);
    });

    this.#buildHair(head, headR, faceZ, isMama);

    if (!isMama) {
      // Kumis
      const mustache = new Loft([
        { p: [-0.038, 0, 0], rx: 0.006, ry: 0.006 },
        { p: [0, 0.002, 0], rx: 0.011, ry: 0.011 },
        { p: [0.038, 0, 0], rx: 0.006, ry: 0.006 },
      ], { side: [0, 1, 0], capStart: 0.7, capEnd: 0.7 });
      const lip = new THREE.Group();
      lip.position.set(0, -0.04, faceZ - 0.002);
      lip.add(coreMesh(mustache, { paint: () => HAIR, darken: 1, rows: 16, sides: 8, castShadow: false, inset: 0 }));
      head.add(lip);
    }

    // Lengan
    this.arms = [-1, 1].map((side) => {
      const shoulder = joint(torso, side * 0.14, top * 0.82, 0);
      shoulder.rotation.order = 'ZXY';
      const a = 0.14;
      const b = 0.13;
      this.#part(shoulder, new Loft([
        { p: [0, -a * 0.6, 0], rx: 0.036 },
        { p: [0, -a, 0], rx: 0.036 },
        { p: [0, -a - 0.008, 0], rx: 0.035 },
      ], { capStart: 0, capEnd: 0.6 }), skin, { w: 0.02, h: 0.02, depth: 0.012, flip: true });
      const elbow = joint(shoulder, 0, -a, 0);
      this.#part(elbow, new Loft([
        { p: [0, 0.01, 0], rx: 0.034 },
        { p: [0, -b * 0.5, 0], rx: 0.032 },
        { p: [0, -b, 0], rx: 0.03 },
      ], { capStart: 0.6, capEnd: 0.4 }), skin, { w: 0.02, h: 0.02, depth: 0.012, flip: true });
      const hand = knitBall(0.04, { color: d.skin, w: 0.018, h: 0.016, depth: 0.011, quality: this.quality, darken: 0.8 });
      hand.position.set(0, -b - 0.022, 0);
      elbow.add(hand);
      // Jempol
      const thumb = new Loft([
        { p: [0, 0, 0.018], rx: 0.015 },
        { p: [0, 0, 0.042], rx: 0.015 },
        { p: [0, 0, 0.066], rx: 0.013 },
      ], { capStart: 0.3, capEnd: 0.8 });
      const thumbGroup = joint(elbow, 0, -b - 0.022, 0);
      this.#part(thumbGroup, thumb, skin, { w: 0.014, h: 0.012, depth: 0.008 });
      if (side === 1 && isMama) {
        const watch = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.006, 8, 22), new THREE.MeshStandardMaterial({ color: 0xc9c6bf, metalness: 0.85, roughness: 0.3 }));
        watch.rotation.x = Math.PI / 2;
        watch.position.y = -b * 0.86;
        elbow.add(watch);
      }
      return { shoulder, elbow, side };
    });

    // Kaki
    this.legs = [-1, 1].map((side) => {
      const a = 0.19;
      const b = 0.19;
      const hip = joint(hips, side * 0.067, -0.015, 0);
      hip.rotation.order = 'ZXY';
      const knee = joint(hip, 0, -a, 0);
      const ankle = joint(knee, 0, -b, 0);
      this.#part(ankle, new Loft([
        { p: [0, -0.016, -0.03], rx: 0.044, ry: 0.024 },
        { p: [0, -0.016, 0.016], rx: 0.046, ry: 0.026 },
        { p: [0, -0.018, 0.058], rx: 0.04, ry: 0.022 },
      ], { capStart: 0.8, capEnd: 0.8 }), () => d.shoes, { w: 0.02, h: 0.018, depth: 0.012 });
      return { hip, knee, ankle, a, b, bend: 1, side };
    });

    this.wardrobe = new PersonWardrobe(this, d);
    this.wardrobe.wear('outfit', OUTFITS[d.id][0].id);
    this.cake = isMama ? null : this.#buildCake(torso);
  }

  #buildHair(head, headR, faceZ, isMama) {
    // Topi rambut: bola yang lebih besar dari kepala, berporos di ubun-ubun dan dimiringkan
    // sehingga batas rambut berada di dahi dan menutup seluruh kepala bagian belakang.
    // Kepala lebih lonjong ke arah depan-belakang, jadi rambut juga dibuat lonjong dan digeser ke belakang.
    const R = headR[0] * 1.08;
    const D = R * 1.26;
    const crown = new THREE.Group();
    crown.position.set(0, 0.012, -0.026);
    crown.rotation.x = -0.42;
    head.add(crown);
    const cap = new Loft(
      [
        { p: [0, R * 0.42, 0], rx: R * 0.88, ry: D * 0.88 },
        { p: [0, R * 0.18, 0], rx: R * 1.0, ry: D * 1.0 },
        { p: [0, -R * 0.1, 0], rx: R * 1.02, ry: D * 1.02 },
      ],
      { capStart: 0.72, capEnd: 0, side: [1, 0, 0] },
    );
    const hairColor = ({ rand }) => (rand() > 0.82 ? 0x2a241d : HAIR);
    crown.add(coreMesh(cap, { paint: () => HAIR, darken: 0.9, rows: 26, sides: 20, inset: 0.002 }));
    crown.add(
      knit(cap, isMama
        ? { stitch: 'tuft', w: 0.034, h: 0.03, depth: 0.012, flip: true, paint: hairColor, quality: this.quality, seed: 41, variance: 0.1 }
        : { stitch: 'tuft', w: 0.024, h: 0.02, depth: 0.014, droop: 0.1, flip: true, paint: hairColor, quality: this.quality, seed: 41, variance: 0.1 }),
    );

    // Tengkuk: menutup belakang kepala bagian bawah sampai ke leher.
    const nape = new Loft(
      [
        { p: [0, 0.05, -0.098], rx: 0.15, ry: 0.125 },
        { p: [0, -0.055, -0.098], rx: 0.168, ry: 0.134 },
        { p: [0, -0.125, -0.092], rx: 0.13, ry: 0.102 },
      ],
      { capStart: 0.2, capEnd: 0.5, side: [1, 0, 0] },
    );
    head.add(coreMesh(nape, { paint: () => HAIR, darken: 0.9, rows: 18, sides: 16, inset: 0.002 }));
    head.add(knit(nape, { stitch: 'tuft', w: 0.024, h: 0.021, depth: 0.014, droop: 0.1, flip: true, paint: hairColor, quality: this.quality, seed: 61, variance: 0.1 }));

    if (isMama) {
      // Rambut panjang di belakang dan di kedua sisi wajah, dengan belahan tengah.
      const longHair = (stations, seed) => {
        const loft = new Loft(stations, { capStart: 0.5, capEnd: 0.8 });
        head.add(coreMesh(loft, { paint: () => HAIR, darken: 0.85, rows: 16, sides: 12 }));
        head.add(knit(loft, { stitch: 'tuft', w: 0.032, h: 0.04, depth: 0.013, flip: true, quality: this.quality, seed, variance: 0.1, paint: hairColor }));
      };
      longHair([
        { p: [0, 0.07, -0.16], rx: 0.175, ry: 0.085 },
        { p: [0, -0.15, -0.178], rx: 0.175, ry: 0.06 },
        { p: [0, -0.34, -0.135], rx: 0.135, ry: 0.03 },
      ], 43);
      [-1, 1].forEach((sign) => longHair([
        { p: [sign * 0.156, 0.09, 0.05], rx: 0.036, ry: 0.06 },
        { p: [sign * 0.176, -0.08, 0.03], rx: 0.04, ry: 0.058 },
        { p: [sign * 0.15, -0.25, -0.005], rx: 0.03, ry: 0.04 },
      ], 47 + sign));
      [-1, 1].forEach((sign) => {
        // Poni belah tengah, turun ke pelipis.
        const bang = new Loft([
          { p: [sign * 0.008, 0.135, faceZ - 0.05], rx: 0.03, ry: 0.012 },
          { p: [sign * 0.075, 0.102, faceZ - 0.046], rx: 0.036, ry: 0.014 },
          { p: [sign * 0.14, 0.04, faceZ - 0.09], rx: 0.024, ry: 0.016 },
        ], { capStart: 0.6, capEnd: 0.8, side: [0, 1, 0] });
        head.add(coreMesh(bang, { paint: () => HAIR, darken: 0.9, rows: 14, sides: 10 }));
        head.add(knit(bang, { stitch: 'bar', w: 0.024, h: 0.012, depth: 0.012, quality: this.quality, seed: 53 + sign, variance: 0.1, paint: hairColor }));
      });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.0065, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: 0x4a4347, roughness: 0.45 }));
      band.position.set(0, 0.03, 0.03);
      band.rotation.x = -0.3;
      head.add(band);
    } else {
      // Poni pendek agar dahi tertutup rapi.
      const bang = new Loft([
        { p: [-0.13, 0.08, faceZ - 0.075], rx: 0.03, ry: 0.016 },
        { p: [0, 0.122, faceZ - 0.04], rx: 0.04, ry: 0.02 },
        { p: [0.13, 0.08, faceZ - 0.075], rx: 0.03, ry: 0.016 },
      ], { capStart: 0.8, capEnd: 0.8, side: [0, 1, 0] });
      head.add(coreMesh(bang, { paint: () => HAIR, darken: 0.9, rows: 14, sides: 10 }));
      head.add(knit(bang, { stitch: 'tuft', w: 0.02, h: 0.02, depth: 0.016, droop: 0.2, quality: this.quality, seed: 59, variance: 0.1, paint: hairColor }));
    }
  }

  #buildCake(torso) {
    const group = joint(torso, 0, 0.13, 0.25);
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.125, 0.012, 4),
      new THREE.MeshStandardMaterial({ color: 0x3a2517, roughness: 0.8 }),
    );
    plate.rotation.y = Math.PI / 4;
    group.add(plate);
    const paint = ({ row }) => (row % 4 < 2 ? 0x4c2d1c : 0xc9b8a4);
    this.#part(group, new Loft([
      { p: [0, 0.008, 0], rx: 0.095 },
      { p: [0, 0.05, 0], rx: 0.095 },
      { p: [0, 0.09, 0], rx: 0.095 },
    ], { side: [1, 0, 0], capStart: 0.05, capEnd: 0.12 }), paint, { w: 0.022, h: 0.014, depth: 0.01 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.094, 0.096, 0.01, 22), new THREE.MeshStandardMaterial({ color: 0xf2e8cf, roughness: 0.9 }));
    top.position.y = 0.1;
    group.add(top);
    this.flames = [];
    const candleMaterial = new THREE.MeshStandardMaterial({ color: 0xf5c518, roughness: 0.6 });
    const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffb13d });
    [-0.034, 0, 0.034].forEach((x, i) => {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.042, 8), candleMaterial);
      candle.position.set(x, 0.126, i === 1 ? 0.016 : -0.006);
      group.add(candle);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 8), flameMaterial);
      flame.position.set(x, 0.158, i === 1 ? 0.016 : -0.006);
      group.add(flame);
      this.flames.push(flame);
    });
    group.visible = false;
    return group;
  }

  update(dt, time) {
    this.poseTime += dt;
    this.prevTime += dt;
    this.blend = Math.min(1, this.blend + dt / 0.45);
    this.gait = (this.gait + ((this.speed / this.data.height + this.stepping) * dt) / (this.stride * 4)) % 1;
    this.ctx.gait = this.gait;

    POSES[this.poseName].fn(this.b, this.m, this.poseTime, this.ctx);
    let o = this.b;
    if (this.blend < 1) {
      POSES[this.prevName].fn(this.a, this.m, this.prevTime, this.ctx);
      const u = this.blend * this.blend * (3 - 2 * this.blend);
      NUMERIC.forEach((k) => {
        this.o[k] = this.a[k] + (this.b[k] - this.a[k]) * u;
      });
      o = this.o;
    }
    this.#apply(o, dt, time);
  }

  #apply(o, dt, time) {
    this.root.rotation.y = this.yaw;
    this.body.rotation.z = o.roll;
    this.hips.position.y = o.y;
    this.hips.rotation.x = o.lean;
    this.torso.rotation.y = o.twist;

    // Kepala dan mata mengikuti sasaran
    const point = this.lookOverride ?? this.lookPoint;
    let wantYaw = 0;
    let wantPitch = 0;
    if (point) {
      this.head.getWorldPosition(v1);
      v2.subVectors(point, v1);
      const heading = Math.atan2(v2.x, v2.z) - this.yaw;
      const wrapped = Math.atan2(Math.sin(heading), Math.cos(heading));
      if (Math.abs(wrapped) < 2.2) wantYaw = THREE.MathUtils.clamp(wrapped, -0.8, 0.8) * o.lookWeight;
      wantPitch = THREE.MathUtils.clamp(Math.atan2(v2.y, Math.hypot(v2.x, v2.z)), -0.4, 0.3) * o.lookWeight;
    }
    const yaw = this.lookYaw.step(wantYaw, dt);
    const pitch = this.lookPitch.step(wantPitch, dt);
    this.head.rotation.set(-(o.hp + pitch) - 0, yaw + o.hy - o.twist, o.hr, 'YXZ');

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.5 + Math.random() * 4;
      this.blinkT = 0;
    }
    this.blinkT = Math.min(1, this.blinkT + dt / 0.16);
    const lid = Math.max(0.08, 1 - Math.sin(this.blinkT * Math.PI));
    let eyeX = 0;
    let eyeY = 0;
    if (point) {
      this.head.worldToLocal(v2.copy(point));
      eyeX = THREE.MathUtils.clamp(Math.atan2(v2.x, Math.max(v2.z, 0.05)), -0.6, 0.6);
      eyeY = THREE.MathUtils.clamp(Math.atan2(v2.y, Math.hypot(v2.x, v2.z)), -0.42, 0.42);
    }
    const ex = this.eyeYaw.step(eyeX, dt);
    const ey = this.eyePitch.step(eyeY, dt);
    this.eyes.forEach((eye) => {
      eye.scale.y = lid;
      eye.userData.iris.rotation.set(-ey, ex, 0, 'YXZ');
    });

    // Lengan
    const [left, right] = this.arms;
    left.shoulder.rotation.set(-o.lf, 0, -o.la);
    left.elbow.rotation.x = -o.le;
    right.shoulder.rotation.set(-o.rf, 0, o.ra);
    right.elbow.rotation.x = -o.re;

    // Kue
    if (this.cake) {
      this.cake.visible = o.cake > 0.02;
      this.cake.scale.setScalar(Math.max(o.cake, 0.01));
      this.flames.forEach((flame, i) => {
        flame.scale.set(0.9, 1.2 + Math.sin(time * 19 + i * 2) * 0.32, 0.9);
      });
    }

    // Kaki
    this.root.updateMatrixWorld(true);
    this.#reachOut(o.reach, time);
    this.#foot(this.legs[0], o.lx, o.ly, o.lz, o.lean);
    this.#foot(this.legs[1], o.rx, o.ry, o.rz, o.lean);
  }

  // Saat salaman, tangan kiri benar-benar mengikuti kaki anjing yang diangkat.
  #reachOut(weight, time) {
    if (weight < 0.01 || !this.reach) return;
    const { target, arm, lift, pat } = this.reach;
    const { shoulder, elbow } = this.arms[arm];
    const fromX = shoulder.rotation.x;
    const fromZ = shoulder.rotation.z;
    const fromElbow = elbow.rotation.x;
    target.getWorldPosition(v1);
    v1.y += lift + (pat ? Math.abs(Math.sin(time * 7)) * 0.05 : 0);
    this.torso.worldToLocal(v1);
    solveTwoBone({ hip: shoulder, knee: elbow, a: 0.14, b: 0.152, bend: -1 }, v1.x, v1.y, v1.z);
    shoulder.rotation.x = fromX + (shoulder.rotation.x - fromX) * weight;
    shoulder.rotation.z = fromZ + (shoulder.rotation.z - fromZ) * weight;
    elbow.rotation.x = fromElbow + (elbow.rotation.x - fromElbow) * weight;
  }

  #foot(leg, x, y, z, lean) {
    v1.set(x, y + this.m.footH, z);
    this.body.localToWorld(v1);
    this.hips.worldToLocal(v1);
    const phi2 = solveTwoBone(leg, v1.x, v1.y, v1.z);
    leg.ankle.rotation.x = phi2 - lean;
  }
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();

/** Lemari Mama dan Bapak. Pakaian dibuat saat pertama dipakai lalu disimpan. */
class PersonWardrobe {
  constructor(person, data) {
    this.person = person;
    this.data = data;
    this.outfits = OUTFITS[data.id];
    this.catalog = [
      { slot: 'outfit', title: 'Baju', items: this.outfits },
      { slot: 'neck', title: 'Leher', items: NECK_ITEMS },
      { slot: 'head', title: 'Kepala', items: HEADWEAR },
      { slot: 'face', title: 'Kacamata', items: EYEWEAR },
    ];
    this.state = { outfit: 'none', neck: 'none', head: 'none', face: 'none' };
    this.items = new Map();
  }

  wear(slot, id) {
    const previous = this.state[slot];
    if (previous !== 'none') this.#get(slot, previous).forEach((g) => (g.visible = false));
    this.state[slot] = id;
    if (id !== 'none') this.#get(slot, id).forEach((g) => (g.visible = true));
  }

  #get(slot, id) {
    const key = `${slot}:${id}`;
    if (!this.items.has(key)) {
      const person = this.person;
      let built;
      if (slot === 'outfit') built = this.#outfit(this.outfits.find((o) => o.id === id));
      else if (slot === 'neck') built = [this.#neck(id)];
      else if (slot === 'head') built = [buildHat(id, person.head, { hx: 0.175, hy: 0.178, hz: 0.165, quality: person.quality, fit: 1.2 })];
      else built = [buildGlasses(id, person.head, person.eyes, 0.027)];
      this.items.set(key, built);
    }
    return this.items.get(key);
  }

  #outfit(o) {
    const { person, data } = this;
    const q = person.quality;
    const groups = [];
    const paintOf = (value) => (typeof value === 'function' ? value : () => (value === 'skin' ? data.skin : value));
    const add = (parent, loft, paint, extra = {}) => {
      groups.push(piece(parent, loft, paint, q, { ...STITCH, variance: 0.04, ...extra }));
    };

    // Pinggul
    const legs = paintOf(o.legs);
    add(person.hips, new Loft([
      { p: [0, -0.05, 0], rx: 0.112, ry: 0.082 },
      { p: [0, 0, 0], rx: 0.12, ry: 0.088 },
      { p: [0, 0.05, 0], rx: 0.118, ry: 0.086 },
    ], { capStart: 0.5, capEnd: 0.1 }), o.skirt ? paintOf(o.skirt) : legs);

    // Atasan
    const flare = o.flare ?? 0.14;
    add(person.torso, new Loft([
      { p: [0, 0.02, 0], rx: flare, ry: flare * 0.76 },
      { p: [0, TOP * 0.5, 0], rx: 0.128, ry: 0.092 },
      { p: [0, TOP * 0.82, 0], rx: 0.122, ry: 0.088 },
      { p: [0, TOP, 0], rx: 0.085, ry: 0.07 },
    ], { capStart: 0.2, capEnd: 0.5 }), o.shirt);

    // Kerah
    if (o.collar) {
      const [a, b] = o.collarColor ?? [0xc62c33, 0xe9dcc0];
      add(person.torso, new Loft([
        { p: [0, TOP + 0.012, -0.004], rx: 0.07, ry: 0.066 },
        { p: [0, TOP + 0.03, -0.002], rx: 0.062, ry: 0.058 },
        { p: [0, TOP + 0.05, 0], rx: 0.056, ry: 0.054 },
      ], { capStart: 0, capEnd: 0 }), ({ row }) => (row < 2 ? a : b), { w: 0.02, h: 0.014, depth: 0.012 });
    } else {
      add(person.torso, new Loft([
        { p: [0, TOP + 0.002, 0], rx: 0.066, ry: 0.06 },
        { p: [0, TOP + 0.012, 0], rx: 0.058, ry: 0.054 },
        { p: [0, TOP + 0.02, 0], rx: 0.054, ry: 0.05 },
      ], { capStart: 0, capEnd: 0 }), paintOf(o.neck), { w: 0.018, h: 0.012, depth: 0.01 });
    }

    // Lengan baju
    const sleeve = paintOf(o.sleeve);
    const [cuffInner, cuffOuter] = o.cuff;
    const cuffed = (ctx) => {
      if (ctx.row >= ctx.rows - 2) return cuffOuter;
      if (cuffInner && ctx.row >= ctx.rows - 4) return cuffInner;
      return sleeve(ctx);
    };
    person.arms.forEach(({ shoulder, elbow }) => {
      const a = 0.14;
      const b = 0.13;
      if (o.long) {
        add(shoulder, new Loft([
          { p: [0, 0.01, 0], rx: 0.05 },
          { p: [0, -a * 0.5, 0], rx: 0.05 },
          { p: [0, -a, 0], rx: 0.044 },
        ], { capStart: 0.8, capEnd: 0.6 }), sleeve, { flip: true });
        add(elbow, new Loft([
          { p: [0, 0.008, 0], rx: 0.043 },
          { p: [0, -b * 0.5, 0], rx: 0.04 },
          { p: [0, -b * 0.92, 0], rx: 0.038 },
        ], { capStart: 0.6, capEnd: 0 }), cuffed, { flip: true });
      } else {
        add(shoulder, new Loft([
          { p: [0, 0.01, 0], rx: 0.05 },
          { p: [0, -a * 0.35, 0], rx: 0.052 },
          { p: [0, -a * 0.72, 0], rx: 0.05 },
        ], { capStart: 0.8, capEnd: 0 }), cuffed, { flip: true });
      }
    });

    // Celana atau rok
    const shin = paintOf(o.shin ?? o.legs);
    person.legs.forEach(({ hip, knee, a, b }) => {
      add(hip, new Loft([
        { p: [0, 0.01, 0], rx: 0.058 },
        { p: [0, -a * 0.5, 0], rx: 0.054 },
        { p: [0, -a, 0], rx: 0.048 },
      ], { capStart: 0.5, capEnd: 0.6 }), legs, { flip: true });
      add(knee, new Loft([
        { p: [0, 0.01, 0], rx: 0.048 },
        { p: [0, -b * 0.6, 0], rx: 0.046 },
        { p: [0, -b, 0], rx: 0.046 },
      ], { capStart: 0.5, capEnd: 0.3 }), shin, { flip: true });
    });
    if (o.skirt) {
      add(person.hips, new Loft([
        { p: [0, 0.03, 0], rx: 0.12, ry: 0.092 },
        { p: [0, -0.15, 0], rx: 0.146, ry: 0.122 },
        { p: [0, -0.33, 0], rx: 0.172, ry: 0.146 },
      ], { capStart: 0, capEnd: 0 }), paintOf(o.skirt), { flip: true });
    }
    return groups;
  }

  #neck(id) {
    const { person } = this;
    const group = new THREE.Group();
    person.torso.add(group);
    const q = person.quality;
    const front = new THREE.Vector3(0, TOP + 0.002, 0.082);
    const ringAt = (y, r, width = 0.016) => new Loft([
      { p: [0, y - width, 0], rx: r, ry: r * 0.9 },
      { p: [0, y, 0.002], rx: r + 0.006, ry: (r + 0.006) * 0.9 },
      { p: [0, y + width, 0.002], rx: r, ry: r * 0.9 },
    ], { capStart: 0, capEnd: 0 });

    if (id === 'pearl' || id === 'gold') {
      const material = id === 'pearl'
        ? new THREE.MeshPhysicalMaterial({ color: 0xf6efe4, roughness: 0.22, clearcoat: 1 })
        : new THREE.MeshPhysicalMaterial({ color: 0xe8b52c, roughness: 0.3, metalness: 0.85 });
      beadRing(group, new THREE.Vector3(0, TOP + 0.0, 0.006), new THREE.Vector3(0, 1, 0.22).normalize(), 0.078, id === 'pearl' ? 28 : 40, id === 'pearl' ? 0.0098 : 0.0062, material);
    } else if (id === 'scarf') {
      const paint = ({ row }) => (Math.floor(row / 3) % 2 ? 0xf0b429 : 0xc8452f);
      piece(group, ringAt(TOP + 0.03, 0.074, 0.03), paint, q, { w: 0.026, h: 0.02, depth: 0.022 });
      const tail = new THREE.Group();
      tail.position.set(0.045, TOP + 0.0, 0.082);
      group.add(tail);
      piece(tail, new Loft([
        { p: [0, 0, 0], rx: 0.034, ry: 0.012 },
        { p: [0, -0.08, 0.014], rx: 0.034, ry: 0.012 },
        { p: [0, -0.17, 0.024], rx: 0.034, ry: 0.012 },
      ], { capStart: 0.4, capEnd: 0.4, side: [1, 0, 0] }), paint, q, { w: 0.022, h: 0.02, depth: 0.014, flip: true });
    } else if (id === 'tie') {
      const paint = ({ row }) => (Math.floor(row / 4) % 2 ? 0x24508f : 0xc62c33);
      const tie = new THREE.Group();
      tie.position.copy(front);
      group.add(tie);
      piece(tie, new Loft([
        { p: [0, 0.008, 0], rx: 0.014, ry: 0.008 },
        { p: [0, -0.1, 0.012], rx: 0.028, ry: 0.008 },
        { p: [0, -0.2, 0.012], rx: 0.024, ry: 0.008 },
      ], { capStart: 0.4, capEnd: 1, side: [1, 0, 0] }), paint, q, { w: 0.02, h: 0.018, depth: 0.012, flip: true });
    } else if (id === 'bow') {
      const bow = new THREE.Group();
      bow.position.copy(front).add(new THREE.Vector3(0, 0.004, 0.006));
      group.add(bow);
      [-1, 1].forEach((sign) => {
        piece(bow, new Loft([
          { p: [sign * 0.006, 0, 0], rx: 0.014, ry: 0.014 },
          { p: [sign * 0.04, 0, 0], rx: 0.026, ry: 0.014 },
          { p: [sign * 0.068, 0, 0], rx: 0.036, ry: 0.014 },
        ], { capStart: 0.2, capEnd: 0.9, side: [0, 1, 0] }), () => 0xc62c33, q, { w: 0.018, h: 0.016, depth: 0.012 });
      });
      bow.add(knitBall(0.018, { color: 0x9e1f28, w: 0.012, h: 0.011, depth: 0.008, quality: q }));
    }
    return group;
  }
}
