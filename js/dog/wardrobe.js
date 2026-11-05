// Baju dan aksesori ikut dirajut dengan mesin yang sama, jadi semuanya satu bahan.
// Tiap barang dibuat saat pertama dipakai, lalu disimpan untuk anjing itu.

import * as THREE from 'three';
import { Loft, knitBall } from '../yarn/loft.js';
import { HEADWEAR, EYEWEAR, piece, buildHat, buildGlasses, beadRing } from './accessories.js';

export const OUTFITS = [
  { id: 'none', label: 'Tanpa baju' },
  { id: 'jersey', label: 'Jersey hijau' },
  { id: 'tee', label: 'Kaus merah' },
  { id: 'tank', label: 'Kaus biru' },
  { id: 'dressPink', label: 'Gaun pink' },
  { id: 'dressTeal', label: 'Gaun toska' },
  { id: 'dots', label: 'Gaun polkadot' },
  { id: 'stripes', label: 'Sweter belang' },
  { id: 'hoodie', label: 'Hoodie kuning' },
  { id: 'tuxedo', label: 'Jas hitam' },
  { id: 'batik', label: 'Batik' },
  { id: 'merahPutih', label: 'Merah putih' },
  { id: 'raincoat', label: 'Jas hujan' },
];

export const NECKWEAR = [
  { id: 'none', label: 'Tanpa kalung' },
  { id: 'charm', label: 'Lonceng ungu' },
  { id: 'koala', label: 'Pita koala' },
  { id: 'bow', label: 'Dasi kupu-kupu' },
  { id: 'scarf', label: 'Syal' },
  { id: 'bandana', label: 'Bandana' },
  { id: 'pearl', label: 'Kalung mutiara' },
  { id: 'gold', label: 'Rantai emas' },
  { id: 'tag', label: 'Kalung tulang' },
];

export const BACKWEAR = [
  { id: 'none', label: 'Tanpa apa-apa' },
  { id: 'cape', label: 'Jubah merah' },
  { id: 'wings', label: 'Sayap' },
  { id: 'pack', label: 'Tas ransel' },
];

export { HEADWEAR, EYEWEAR };

const CATALOG = [
  { slot: 'outfit', title: 'Baju', items: OUTFITS },
  { slot: 'neck', title: 'Leher', items: NECKWEAR },
  { slot: 'head', title: 'Kepala', items: HEADWEAR },
  { slot: 'face', title: 'Kacamata', items: EYEWEAR },
  { slot: 'back', title: 'Punggung', items: BACKWEAR },
];

const batikPaint = ({ row, col }) => {
  const a = (row + col) % 6;
  const b = (row - col + 600) % 6;
  if (a === 0 || b === 0) return 0xe0b56a;
  return (row + col * 2) % 9 === 0 ? 0xf1e0ba : 0x5c3218;
};

const SWEATER_STYLES = {
  jersey: { main: 0x1a8a44, trim: 0xd9352c, hem: 0xf4f0e4, crest: 0xd9352c },
  tee: { main: 0xd92a35, trim: 0xf6efe0, hem: 0xb31e2a },
  tank: { main: 0x2348c4, trim: 0x8ea8f0, hem: 0x1a3798 },
  dressPink: { main: 0xf0aeb4, trim: 0x1d8a7e, hem: 0x1d8a7e, ruffle: 0x1d8a7e },
  dressTeal: { main: 0x1d9184, trim: 0xf5c518, hem: 0xf5c518, ruffle: 0xf5c518 },
  dots: { main: 0x7ec3e6, trim: 0xf8f4ea, hem: 0xf8f4ea, ruffle: 0xf8f4ea, paint: ({ row, col }) => (row % 6 < 2 && (col + (row % 12 < 6 ? 3 : 0)) % 6 < 2 ? 0xf8f4ea : null) },
  stripes: { main: 0xf4ead2, trim: 0x2c6e8f, hem: 0x2c6e8f, stripe: 0x2c6e8f },
  hoodie: { main: 0xf0be22, trim: 0xd29f12, hem: 0xd29f12, hood: 0xf0be22 },
  tuxedo: { main: 0x1b1a20, trim: 0x1b1a20, hem: 0x101014, paint: ({ n }) => (n.y < -0.35 ? 0xf6f2e8 : null) },
  batik: { main: 0x5c3218, trim: 0xe0b56a, hem: 0xe0b56a, paint: batikPaint },
  merahPutih: { main: 0xd92a35, trim: 0xf6f2e8, hem: 0xf6f2e8, paint: ({ n }) => (n.y < 0.02 ? 0xf6f2e8 : null) },
  raincoat: { main: 0xf7d21c, trim: 0x2c6e8f, hem: 0x2c6e8f, hood: 0xf7d21c, paint: ({ col, n }) => (n.y > 0.85 && col % 7 === 0 ? 0xe2bc10 : null) },
};

export class Wardrobe {
  constructor(rig, breed, quality) {
    this.rig = rig;
    this.breed = breed;
    this.quality = quality;
    this.items = new Map();
    this.catalog = CATALOG;
    this.state = { outfit: 'none', neck: 'none', head: 'none', face: 'none', back: 'none' };
    // Bulu keriting lebih tebal, jadi baju perlu sedikit lebih longgar.
    const fluffy = breed.stitches.body.stitch !== 'v';
    this.gap = breed.stitches.body.depth * (fluffy ? 1.05 : 0.72) + 0.008;
  }

  wear(slot, id) {
    const previous = this.state[slot];
    if (previous !== 'none') this.#get(slot, previous).visible = false;
    this.state[slot] = id;
    if (id !== 'none') this.#get(slot, id).visible = true;
  }

  apply(look) {
    Object.keys(this.state).forEach((slot) => this.wear(slot, look[slot] ?? 'none'));
  }

  #get(slot, id) {
    const key = `${slot}:${id}`;
    if (!this.items.has(key)) {
      const builders = {
        outfit: () => this.#buildOutfit(id),
        neck: () => this.#buildNeck(id),
        head: () => this.#buildHead(id),
        face: () => this.#buildFace(id),
        back: () => this.#buildBack(id),
      };
      this.items.set(key, builders[slot]());
    }
    return this.items.get(key);
  }

  #piece(parent, loft, paint, extra = {}) {
    return piece(parent, loft, paint, this.quality, { w: 0.03, h: 0.026, depth: 0.024, ...extra });
  }

  #buildOutfit(id) {
    const style = SWEATER_STYLES[id];
    const { size } = this.breed;
    const L = size.bodyLen;
    const g = this.gap;
    const holder = new THREE.Group();
    const chestGroup = new THREE.Group();
    const rumpGroup = new THREE.Group();
    this.rig.chest.add(chestGroup);
    this.rig.pelvis.add(rumpGroup);
    chestGroup.add(holder);

    const [cx, cy] = size.chest;
    const legR = size.legR * 1.5;
    const shoulder = new THREE.Vector3(cx * 0.68, -(cy * 0.46 - 0.012), L * 0.5);
    const armHole = ({ p }) => {
      const near = Math.hypot(Math.abs(p.x) - shoulder.x, p.z - shoulder.z);
      return !(near < legR + 0.012 && p.y < 0.02);
    };

    const paintChest = (ctx) => {
      const { row, rows, p } = ctx;
      if (row >= rows - 3) return style.trim;
      const custom = style.paint?.(ctx);
      if (custom) return custom;
      if (style.stripe && Math.floor(row / 4) % 2 === 1) return style.stripe;
      if (style.crest) {
        const onCrest = Math.hypot(p.z - L * 0.26, p.y - cy * 0.5) < 0.05 && p.y > 0;
        if (onCrest) return Math.hypot(p.z - L * 0.26, p.y - cy * 0.5) < 0.026 ? style.hem : style.crest;
      }
      return style.main;
    };

    const chestLoft = new Loft(
      [
        { p: [0, 0, -L * 0.06], rx: size.waist + g, ry: size.waist + g },
        { p: [0, 0, L * 0.2], rx: cx * 0.96 + g, ry: cy * 0.96 + g },
        { p: [0, 0.008, L * 0.44], rx: cx + g, ry: cy + g },
        { p: [0, 0.012, L * 0.52 + cy * 0.2], rx: cx * 0.86 + g, ry: cy * 0.86 + g },
      ],
      { capStart: 0, capEnd: 0 },
    );
    this.#piece(holder, chestLoft, paintChest, { mask: armHole });

    if (style.ruffle) {
      // Rumbai: pita bergelombang di leher dan di pinggir bawah.
      this.#ruffle(holder, [0, 0.012, L * 0.5 + cy * 0.22], cx * 0.86 + g, cy * 0.86 + g, style.ruffle, 1);
      this.#ruffle(rumpGroup, [0, 0.012, L * 0.26], size.rump[0] + g * 0.9, size.rump[1] + g * 0.9, style.ruffle, -1);
    }

    // Bagian belakang menyambung ke dada, menutup pinggang.
    const [rx, ry] = size.rump;
    const rumpLoft = new Loft(
      [
        { p: [0, 0.002, L * 0.26], rx: rx * 0.98 + g, ry: ry * 0.98 + g },
        { p: [0, 0.006, L * 0.42], rx: size.waist + g, ry: size.waist * 1.02 + g },
        { p: [0, 0.012, L * 0.56], rx: size.waist * 0.98 + g, ry: size.waist + g },
      ],
      { capStart: 0, capEnd: 0 },
    );
    this.#piece(rumpGroup, rumpLoft, (ctx) => {
      const { row } = ctx;
      if (row < 2) return style.hem;
      const custom = style.paint?.(ctx);
      if (custom) return custom;
      if (style.stripe && Math.floor(row / 4) % 2 === 1) return style.stripe;
      return style.main;
    });

    if (style.hood) {
      // Tudung terlipat di belakang leher.
      const hood = knitBall(cy * 0.62, { color: style.hood, w: 0.03, h: 0.026, depth: 0.024, quality: this.quality, ry: cy * 0.42 });
      hood.position.set(0, cy * 0.86 + g, L * 0.34);
      holder.add(hood);
    }

    return setVisibleGroup([chestGroup, rumpGroup]);
  }

  #ruffle(parent, center, rx, ry, color, direction) {
    const flare = 0.05;
    const loft = new Loft(
      [
        { p: center, rx: rx * 0.98, ry: ry * 0.98 },
        { p: [center[0], center[1], center[2] + direction * flare * 0.5], rx: rx + flare * 0.42, ry: ry + flare * 0.42 },
        { p: [center[0], center[1], center[2] + direction * flare], rx: rx + flare, ry: ry + flare },
      ],
      {
        capStart: 0,
        capEnd: 0,
        bump: (s, a) => Math.sin(a * 11) * 0.11 * s,
      },
    );
    this.#piece(parent, loft, () => color, { w: 0.026, h: 0.02, depth: 0.018, castShadow: false });
  }

  // Lingkaran mengitari leher; titik pusat di kerangka neck.
  #ringLoft(t, extra = 0, width = 0.022) {
    const { size } = this.breed;
    const { neckTip } = this.rig;
    const c = [0, neckTip[1] * t, neckTip[2] * t];
    const dir = new THREE.Vector3(0, neckTip[1], neckTip[2]).normalize();
    const r = size.neckR * 1.02 + this.gap * 0.7 + extra;
    return new Loft(
      [
        { p: [c[0], c[1] - dir.y * width, c[2] - dir.z * width], rx: r },
        { p: c, rx: r + 0.006 },
        { p: [c[0], c[1] + dir.y * width, c[2] + dir.z * width], rx: r },
      ],
      { capStart: 0, capEnd: 0 },
    );
  }

  #buildNeck(id) {
    const group = new THREE.Group();
    this.rig.neck.add(group);
    const { neckTip } = this.rig;
    const q = this.quality;
    // Pada anjing bersurai, kalung dipasang di atas surai agar tidak tertutup rumbai.
    const maneExtra = this.breed.mane ? 0.012 : 0;
    const collarAt = this.breed.mane ? 0.86 : 0.38;

    // Titik depan-bawah leher: tempat lonceng dan pita menggantung.
    const front = new THREE.Vector3(0, -neckTip[2], neckTip[1]).normalize();
    const ring = (t) => {
      const r = this.breed.size.neckR * 1.02 + this.gap * 0.7 + maneExtra + 0.006;
      return new THREE.Vector3(0, neckTip[1] * t, neckTip[2] * t).addScaledVector(front, r);
    };

    if (id === 'charm') {
      this.#piece(group, this.#ringLoft(collarAt, maneExtra, 0.016), () => 0x201c22, { stitch: 'bar', w: 0.024, h: 0.016, depth: 0.018 });
      const anchor = ring(collarAt);
      const charm = new THREE.Group();
      charm.position.copy(anchor);
      group.add(charm);

      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.0065, 8, 28), new THREE.MeshStandardMaterial({ color: 0x4a3323, roughness: 0.8 }));
      loop.position.set(0, -0.048, 0.008);
      charm.add(loop);

      const bell = knitBall(0.03, { color: 0x8b6bc9, w: 0.016, h: 0.014, depth: 0.012, quality: q, darken: 0.7 });
      bell.position.set(0, -0.11, 0.012);
      charm.add(bell);
      const slit = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), new THREE.MeshStandardMaterial({ color: 0x241a33 }));
      slit.position.set(0, -0.124, 0.038);
      charm.add(slit);
    } else if (id === 'koala') {
      const check = ({ row, col }) => ((Math.floor(row / 2) + Math.floor(col / 2)) % 2 ? 0xbfe6cf : 0x5fb48d);
      this.#piece(group, this.#ringLoft(collarAt, maneExtra, 0.034), check, { w: 0.022, h: 0.018, depth: 0.016 });
      const anchor = ring(collarAt);
      const paint = () => 0x9e968c;
      [-1, 1].forEach((sign) => {
        const ear = new THREE.Group();
        ear.position.copy(anchor).add(new THREE.Vector3(sign * 0.082, -0.018, 0.012));
        group.add(ear);
        const loft = new Loft(
          [
            { p: [0, 0, -0.004], rx: 0.062, ry: 0.062 },
            { p: [0, 0, 0], rx: 0.064, ry: 0.064 },
            { p: [0, 0, 0.004], rx: 0.062, ry: 0.062 },
          ],
          { capStart: 0.26, capEnd: 0.26 },
        );
        this.#piece(ear, loft, ({ p }) => (Math.hypot(p.x, p.y) < 0.03 && p.z > 0 ? 0xd9c7b4 : paint()), { w: 0.02, h: 0.017, depth: 0.014 });
      });
    } else if (id === 'bow') {
      this.#piece(group, this.#ringLoft(collarAt, maneExtra, 0.012), () => 0xb71f33, { stitch: 'bar', w: 0.02, h: 0.014, depth: 0.014 });
      const anchor = ring(collarAt);
      const paint = () => 0xd92d42;
      [-1, 1].forEach((sign) => {
        const wing = new Loft(
          [
            { p: [sign * 0.006, 0, 0], rx: 0.016, ry: 0.016 },
            { p: [sign * 0.044, 0, 0], rx: 0.03, ry: 0.016 },
            { p: [sign * 0.076, 0, 0], rx: 0.044, ry: 0.016 },
          ],
          { capStart: 0.2, capEnd: 0.9, side: [0, 1, 0] },
        );
        const piece = new THREE.Group();
        piece.position.copy(anchor);
        group.add(piece);
        this.#piece(piece, wing, paint, { w: 0.02, h: 0.017, depth: 0.014 });
      });
      const knot = knitBall(0.022, { color: 0xb71f33, w: 0.014, h: 0.012, depth: 0.01, quality: q });
      knot.position.copy(anchor);
      group.add(knot);
    } else if (id === 'scarf') {
      const paint = ({ row }) => (Math.floor(row / 3) % 2 ? 0xf0b429 : 0xc8452f);
      this.#piece(group, this.#ringLoft(collarAt, maneExtra + 0.012, 0.042), paint, { stitch: 'v', w: 0.03, h: 0.024, depth: 0.026 });
      const anchor = ring(collarAt);
      const tail = new THREE.Group();
      tail.position.copy(anchor).add(new THREE.Vector3(0.05, -0.006, 0.01));
      group.add(tail);
      this.#piece(
        tail,
        new Loft(
          [
            { p: [0, 0, 0], rx: 0.04, ry: 0.012 },
            { p: [0, -0.07, 0.006], rx: 0.04, ry: 0.012 },
            { p: [0, -0.15, 0.004], rx: 0.04, ry: 0.012 },
          ],
          { capStart: 0.5, capEnd: 0.5, side: [1, 0, 0] },
        ),
        ({ row }) => (Math.floor(row / 3) % 2 ? 0xf0b429 : 0xc8452f),
        { w: 0.024, h: 0.022, depth: 0.018, flip: true },
      );
    } else if (id === 'bandana') {
      const red = ({ row, col }) => ((row + col) % 7 === 0 ? 0xf6efe0 : 0xc8232c);
      this.#piece(group, this.#ringLoft(collarAt, maneExtra, 0.018), red, { w: 0.022, h: 0.016, depth: 0.014 });
      const anchor = ring(collarAt);
      const flap = new THREE.Group();
      flap.position.copy(anchor);
      group.add(flap);
      this.#piece(flap, new Loft(
        [
          { p: [0, 0.012, 0], rx: 0.09, ry: 0.012 },
          { p: [0, -0.05, 0.012], rx: 0.056, ry: 0.012 },
          { p: [0, -0.1, 0.018], rx: 0.014, ry: 0.012 },
        ],
        { capStart: 0.2, capEnd: 1, side: [1, 0, 0] },
      ), red, { w: 0.02, h: 0.018, depth: 0.012, flip: true });
    } else if (id === 'pearl' || id === 'gold') {
      const isPearl = id === 'pearl';
      const material = isPearl
        ? new THREE.MeshPhysicalMaterial({ color: 0xf6efe4, roughness: 0.22, clearcoat: 1 })
        : new THREE.MeshPhysicalMaterial({ color: 0xe8b52c, roughness: 0.3, metalness: 0.85 });
      const dir = new THREE.Vector3(0, neckTip[1], neckTip[2]).normalize();
      const center = new THREE.Vector3(0, neckTip[1] * collarAt, neckTip[2] * collarAt);
      const r = this.breed.size.neckR * 1.02 + this.gap * 0.7 + maneExtra + 0.012;
      beadRing(group, center, dir, r, isPearl ? 26 : 36, isPearl ? 0.0155 : 0.0115, material);
      if (!isPearl) {
        const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 22), material);
        medal.rotation.x = Math.PI / 2;
        medal.position.copy(ring(collarAt)).add(new THREE.Vector3(0, -0.05, 0.01));
        group.add(medal);
      }
    } else if (id === 'tag') {
      this.#piece(group, this.#ringLoft(collarAt, maneExtra, 0.016), () => 0x7a4a25, { stitch: 'bar', w: 0.024, h: 0.016, depth: 0.016 });
      const material = new THREE.MeshPhysicalMaterial({ color: 0xe8b52c, roughness: 0.3, metalness: 0.7 });
      const tag = new THREE.Group();
      tag.position.copy(ring(collarAt)).add(new THREE.Vector3(0, -0.048, 0.008));
      const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.045, 4, 8), material);
      bar.rotation.z = Math.PI / 2;
      tag.add(bar);
      [[-0.03, 0.01], [-0.03, -0.01], [0.03, 0.01], [0.03, -0.01]].forEach(([x, y]) => {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), material);
        knob.position.set(x, y, 0);
        tag.add(knob);
      });
      group.add(tag);
    }
    return group;
  }

  #buildHead(id) {
    const [hx, hy, hz] = this.breed.size.head;
    return buildHat(id, this.rig.head, { hx, hy, hz, quality: this.quality });
  }

  #buildFace(id) {
    return buildGlasses(id, this.rig.head, this.rig.eyes, this.breed.size.head[0] * 0.158);
  }

  #buildBack(id) {
    const group = new THREE.Group();
    this.rig.chest.add(group);
    const { size } = this.breed;
    const L = size.bodyLen;
    const [cx, cy] = size.chest;
    const top = cy + this.gap * 0.6;

    if (id === 'cape') {
      const paint = ({ s }) => (s > 0.86 ? 0xf0b92a : 0xc8232c);
      this.#piece(group, new Loft(
        [
          { p: [0, top * 1.0, L * 0.48], rx: cx * 0.74, ry: 0.012 },
          { p: [0, top * 1.06, L * 0.12], rx: cx * 1.02, ry: 0.012 },
          { p: [0, top * 0.98, -L * 0.28], rx: cx * 1.14, ry: 0.012 },
          { p: [0, top * 0.72, -L * 0.62], rx: cx * 1.2, ry: 0.012 },
        ],
        { capStart: 0.2, capEnd: 0.2, side: [1, 0, 0] },
      ), paint, { w: 0.03, h: 0.028, depth: 0.014, flip: true, coreRows: 34 });
    } else if (id === 'wings') {
      const paint = ({ row }) => (row % 5 === 0 ? 0xe9e2d4 : 0xf9f5ec);
      [-1, 1].forEach((sign) => {
        this.#piece(group, new Loft(
          [
            { p: [sign * cx * 0.3, top * 0.92, L * 0.34], rx: 0.05, ry: 0.016 },
            { p: [sign * (cx * 0.9), top * 1.25, L * 0.2], rx: 0.085, ry: 0.016 },
            { p: [sign * (cx * 1.65), top * 1.5, L * 0.06], rx: 0.08, ry: 0.015 },
            { p: [sign * (cx * 2.2), top * 1.58, -L * 0.02], rx: 0.04, ry: 0.012 },
          ],
          { capStart: 0.5, capEnd: 1, side: [0, 0.2, 1] },
        ), paint, { stitch: 'v', w: 0.03, h: 0.028, depth: 0.018 });
      });
    } else if (id === 'pack') {
      const paint = ({ p }) => (p.y > top + 0.056 ? 0xef6a3c : 0x2c6e8f);
      this.#piece(group, new Loft(
        [
          { p: [0, top + 0.03, L * 0.04], rx: cx * 0.62, ry: 0.056 },
          { p: [0, top + 0.036, L * 0.22], rx: cx * 0.66, ry: 0.06 },
          { p: [0, top + 0.03, L * 0.38], rx: cx * 0.58, ry: 0.052 },
        ],
        { capStart: 0.6, capEnd: 0.6, square: 2 },
      ), paint, { w: 0.028, h: 0.024, depth: 0.018 });
      const strap = new THREE.MeshStandardMaterial({ color: 0x214f68, roughness: 0.9 });
      [-1, 1].forEach((sign) => {
        const band = new THREE.Mesh(new THREE.TorusGeometry(cy * 1.02, 0.009, 6, 26, Math.PI * 0.8), strap);
        band.position.set(sign * cx * 0.3, 0, L * 0.4);
        band.rotation.y = Math.PI / 2;
        band.rotation.x = -0.1;
        group.add(band);
      });
    }
    return group;
  }
}

function setVisibleGroup(groups) {
  return {
    set visible(value) {
      groups.forEach((g) => (g.visible = value));
    },
  };
}
