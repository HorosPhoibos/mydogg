// Bentuk boneka rajut: tulang punggung dengan penampang elips, seperti menyusun putaran amigurumi.
// Dari satu Loft bisa dibuat isian (core) dan barisan jahitan yang mengikuti permukaannya.

import * as THREE from 'three';
import { stitchGeometry } from './stitches.js';
import { yarnMaterial, coreMaterial } from './material.js';

const PROFILE_STEPS = 72;
const v = (a) => new THREE.Vector3(a[0], a[1], a[2]);

function catmull1(a, b, c, d, u) {
  return (
    0.5 *
    (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u)
  );
}

export class Loft {
  /**
   * @param {Array<{p:number[], rx:number, ry?:number}>} stations titik tulang punggung
   * @param {object} [options]
   * @param {number} [options.capStart] panjang tutup depan relatif jari-jari (0 = terbuka)
   * @param {number} [options.capEnd]   panjang tutup belakang relatif jari-jari
   * @param {number[]} [options.side]   arah sumbu rx; tegak lurus tulang punggung
   * @param {number} [options.square]   1 = elips, makin besar makin kotak
   * @param {(s:number, a:number)=>number} [options.bump] tonjolan permukaan, s∈[0,1], a = sudut
   */
  constructor(stations, options = {}) {
    this.options = options;
    this.square = options.square ?? 1;
    this.bump = options.bump ?? null;
    this.side = v(options.side ?? [1, 0, 0]);
    this.profile = this.#buildProfile(stations);
  }

  #buildProfile(stations) {
    const { capStart = 1, capEnd = 1 } = this.options;
    const last = stations.length - 1;
    const spine = [];
    for (let i = 0; i <= PROFILE_STEPS; i++) {
      const f = (i / PROFILE_STEPS) * last;
      const k = Math.min(Math.floor(f), last - 1);
      const u = f - k;
      const a = stations[Math.max(k - 1, 0)];
      const b = stations[k];
      const c = stations[k + 1];
      const d = stations[Math.min(k + 2, last)];
      const ry = (s) => s.ry ?? s.rx;
      spine.push({
        c: new THREE.Vector3(
          catmull1(a.p[0], b.p[0], c.p[0], d.p[0], u),
          catmull1(a.p[1], b.p[1], c.p[1], d.p[1], u),
          catmull1(a.p[2], b.p[2], c.p[2], d.p[2], u),
        ),
        rx: Math.max(catmull1(a.rx, b.rx, c.rx, d.rx, u), 0.0005),
        ry: Math.max(catmull1(ry(a), ry(b), ry(c), ry(d), u), 0.0005),
      });
    }

    const tangentAt = (i) =>
      new THREE.Vector3()
        .subVectors(spine[Math.min(i + 1, PROFILE_STEPS)].c, spine[Math.max(i - 1, 0)].c)
        .normalize();
    spine.forEach((s, i) => (s.t = tangentAt(i)));

    const cap = (end, length, direction) => {
      const samples = [];
      const reach = length * Math.min(end.rx, end.ry);
      for (let i = 1; i <= 12; i++) {
        const theta = (i / 12) * (Math.PI / 2);
        samples.push({
          c: end.c.clone().addScaledVector(end.t, direction * reach * Math.sin(theta)),
          rx: Math.max(end.rx * Math.cos(theta), 0.0005),
          ry: Math.max(end.ry * Math.cos(theta), 0.0005),
          t: end.t,
        });
      }
      return samples;
    };

    const start = capStart > 0 ? cap(spine[0], capStart, -1).reverse() : [];
    const end = capEnd > 0 ? cap(spine[PROFILE_STEPS], capEnd, 1) : [];
    const profile = [...start, ...spine, ...end];

    for (const s of profile) {
      s.b = this.side.clone().addScaledVector(s.t, -this.side.dot(s.t)).normalize();
      s.n = new THREE.Vector3().crossVectors(s.t, s.b).normalize();
    }
    return profile;
  }

  /** Titik permukaan pada s∈[0,1] sepanjang profil dan sudut a. */
  surface(s, a, target = new THREE.Vector3(), inset = 0) {
    const f = THREE.MathUtils.clamp(s, 0, 1) * (this.profile.length - 1);
    const i = Math.min(Math.floor(f), this.profile.length - 2);
    const u = f - i;
    const p0 = this.profile[i];
    const p1 = this.profile[i + 1];

    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const e = 1 / this.square;
    const shapeX = Math.sign(ca) * Math.pow(Math.abs(ca), e);
    const shapeY = Math.sign(sa) * Math.pow(Math.abs(sa), e);
    const bump = this.bump ? 1 + this.bump(s, a) : 1;

    const rx = Math.max((p0.rx + (p1.rx - p0.rx) * u) * bump - inset, 0.0003);
    const ry = Math.max((p0.ry + (p1.ry - p0.ry) * u) * bump - inset, 0.0003);
    const lerp = (key, axis) => p0[key][axis] + (p1[key][axis] - p0[key][axis]) * u;

    const bx = rx * shapeX;
    const by = ry * shapeY;
    return target.set(
      lerp('c', 'x') + lerp('b', 'x') * bx + lerp('n', 'x') * by,
      lerp('c', 'y') + lerp('b', 'y') * bx + lerp('n', 'y') * by,
      lerp('c', 'z') + lerp('b', 'z') * bx + lerp('n', 'z') * by,
    );
  }

  normalAt(s, a, target, dtds, dtda) {
    const ds = 0.004;
    const da = 0.03;
    const p0 = this.surface(s - ds, a, tmpA);
    const p1 = this.surface(s + ds, a, tmpB);
    dtds.subVectors(p1, p0);
    const q0 = this.surface(s, a - da, tmpA);
    const q1 = this.surface(s, a + da, tmpB);
    dtda.subVectors(q1, q0);
    target.crossVectors(dtda, dtds);
    if (target.lengthSq() < 1e-14) {
      // Tepat di ujung tutup: pakai arah tulang punggung.
      const i = Math.round(s * (this.profile.length - 1));
      target.copy(this.profile[i].t).multiplyScalar(s < 0.5 ? -1 : 1);
    }
    target.normalize();
    dtda.normalize();
    dtds.normalize();
    return target;
  }

  /** Panjang permukaan kumulatif, dipakai untuk menjaga jarak antarbaris tetap sama. */
  meridian() {
    const steps = 160;
    const table = new Float32Array(steps + 1);
    const prev = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => this.surface(0, a));
    let length = 0;
    const now = new THREE.Vector3();
    for (let i = 1; i <= steps; i++) {
      let sum = 0;
      prev.forEach((point, k) => {
        this.surface(i / steps, (k / 4) * Math.PI * 2, now);
        sum += now.distanceTo(point);
        point.copy(now);
      });
      length += sum / 4;
      table[i] = length;
    }
    return { table, length, steps };
  }
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

const white = new THREE.Color(0xffffff);
const colorCache = new Map();
function toColor(value) {
  if (value instanceof THREE.Color) return value;
  if (!colorCache.has(value)) colorCache.set(value, new THREE.Color(value));
  return colorCache.get(value);
}

// Sedikit acak warna per jahitan supaya tampak seperti wol asli, bukan warna rata.
const tint = new THREE.Color();
function setStitchColor(mesh, index, value, rand, variance = 0.05) {
  tint.copy(toColor(value));
  const shade = 1 + (rand() - 0.5) * variance * 2;
  tint.multiplyScalar(shade);
  mesh.setColorAt(index, tint);
}

export function seededRandom(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Buat isian mulus sebagai dasar jahitan.
 * Warna diturunkan dari cat yang sama lalu digelapkan.
 */
export function coreMesh(loft, { inset = 0.008, paint = () => white, darken = 0.5, rows = 44, sides = 22, castShadow = true } = {}) {
  const positions = [];
  const colors = [];
  const indices = [];
  const p = new THREE.Vector3();
  const dtds = new THREE.Vector3();
  const dtda = new THREE.Vector3();
  const n = new THREE.Vector3();
  const color = new THREE.Color();

  for (let r = 0; r <= rows; r++) {
    const s = r / rows;
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      loft.surface(s, a, p, inset);
      positions.push(p.x, p.y, p.z);
      loft.normalAt(s, a, n, dtds, dtda);
      color.copy(toColor(paint({ s, a, p, n, row: r, col: k, rand: Math.random }))).multiplyScalar(darken);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < sides; k++) {
      const a = r * (sides + 1) + k;
      const b = a + 1;
      const c = a + sides + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, coreMaterial);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Letakkan jahitan baris demi baris mengitari Loft.
 * @param {Loft} loft
 * @param {object} o
 * @param {string} o.stitch jenis jahitan
 * @param {number} o.w lebar jahitan
 * @param {number} o.h tinggi baris
 * @param {number} [o.depth] tebal jahitan keluar permukaan
 * @param {(ctx)=>any} o.paint warna per jahitan
 * @param {(ctx)=>boolean} [o.mask] false = lewati jahitan
 * @param {boolean} [o.scatter] putar acak (untuk keriting)
 * @param {number} [o.droop] seberapa jauh jahitan menjorok miring dari permukaan
 */
export function knit(loft, o) {
  const {
    stitch = 'v',
    w = 0.036,
    h = 0.03,
    depth = Math.min(w, h) * 0.95,
    paint = () => white,
    mask = null,
    scatter = false,
    droop = 0,
    flip = false,
    scale = 1,
    variance = 0.05,
    lift = 0,
    quality = 'high',
    seed = 11,
    from = 0,
    to = 1,
  } = o;
  const rand = seededRandom(seed);
  const { table, length, steps } = loft.meridian();
  const rowCount = Math.max(2, Math.round(length / h));

  const placements = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const along = new THREE.Vector3();
  const around = new THREE.Vector3();
  let tableIndex = 0;

  for (let row = 0; row < rowCount; row++) {
    const target = ((row + 0.5) / rowCount) * length;
    while (tableIndex < steps && table[tableIndex + 1] < target) tableIndex++;
    const span = table[tableIndex + 1] - table[tableIndex] || 1;
    const s = (tableIndex + (target - table[tableIndex]) / span) / steps;
    if (s < from || s > to) continue;

    // Keliling baris: disampel supaya penampang elips tetap rapat merata.
    const sides = 48;
    const arcs = new Float32Array(sides + 1);
    const prev = loft.surface(s, 0, new THREE.Vector3());
    const now = new THREE.Vector3();
    for (let k = 1; k <= sides; k++) {
      loft.surface(s, (k / sides) * Math.PI * 2, now);
      arcs[k] = arcs[k - 1] + now.distanceTo(prev);
      prev.copy(now);
    }
    const perimeter = arcs[sides];
    const count = Math.max(1, Math.round(perimeter / w));
    if (perimeter < w * 0.4) continue;

    const offset = (row % 2) * 0.5;
    let arcIndex = 0;
    for (let col = 0; col < count; col++) {
      const want = (((col + offset) % count) / count) * perimeter;
      arcIndex = 0;
      while (arcIndex < sides - 1 && arcs[arcIndex + 1] < want) arcIndex++;
      const local = (want - arcs[arcIndex]) / (arcs[arcIndex + 1] - arcs[arcIndex] || 1);
      const a = ((arcIndex + local) / sides) * Math.PI * 2;

      loft.surface(s, a, p);
      loft.normalAt(s, a, n, along, around);
      const ctx = { s, a, p, n, row, col, rows: rowCount, rand };
      if (mask && !mask(ctx)) continue;

      placements.push({
        p: p.clone(),
        n: n.clone(),
        x: around.clone(),
        y: along.clone(),
        color: paint(ctx),
        w: Math.min(perimeter / count, w * 1.5),
      });
    }
  }

  const geometry = stitchGeometry(stitch, quality);
  const mesh = new THREE.InstancedMesh(geometry, yarnMaterial, placements.length);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  const m = new THREE.Matrix4();
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const spin = new THREE.Quaternion();

  placements.forEach((item, i) => {
    // Dibalik lewat rotasi 180°, bukan cermin, agar sisi depan jahitan tetap benar.
    X.copy(item.x);
    if (flip) X.negate();
    Z.copy(item.n);
    Y.crossVectors(Z, X).normalize();

    if (droop) {
      // Miringkan jahitan ke luar: dasar menempel, ujung menjauh.
      Z.addScaledVector(Y, droop).normalize();
      Y.crossVectors(Z, X).normalize();
    }
    if (scatter) {
      spin.setFromAxisAngle(item.n, rand() * Math.PI * 2);
      X.applyQuaternion(spin);
      Y.applyQuaternion(spin);
    } else {
      const wobble = (rand() - 0.5) * 0.16;
      spin.setFromAxisAngle(item.n, wobble);
      X.applyQuaternion(spin);
      Y.applyQuaternion(spin);
    }

    const size = scale * (0.92 + rand() * 0.16);
    m.makeBasis(
      X.clone().multiplyScalar(item.w * 1.08 * size),
      Y.clone().multiplyScalar(h * 1.1 * size),
      Z.clone().multiplyScalar(depth * size),
    );
    m.setPosition(item.p.x + item.n.x * lift, item.p.y + item.n.y * lift, item.p.z + item.n.z * lift);
    mesh.setMatrixAt(i, m);
    setStitchColor(mesh, i, item.color, rand, variance);
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/**
 * Bidang rajut datar berbaris lurus. Dipakai untuk selimut dan permukaan besar.
 * paint menerima koordinat bidang (x, z) dalam satuan dunia.
 */
export function knitPlane({ width, depth, w, h, y = 0, paint, quality = 'low', thickness = 0.8, seed = 3, variance = 0.05 }) {
  const cols = Math.round(width / w);
  const rows = Math.round(depth / h);
  const mesh = new THREE.InstancedMesh(stitchGeometry('v', quality), yarnMaterial, cols * rows);
  mesh.receiveShadow = true;

  const rand = seededRandom(seed);
  const m = new THREE.Matrix4();
  const cell = [];
  let index = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -width / 2 + (c + 0.5 + (r % 2) * 0.5 - 0.25) * w;
      const z = depth / 2 - (r + 0.5) * h;
      m.makeBasis(
        new THREE.Vector3(w * 1.1, 0, 0),
        new THREE.Vector3(0, 0, -h * 1.12),
        new THREE.Vector3(0, Math.min(w, h) * thickness, 0),
      );
      m.setPosition(x, y, z);
      mesh.setMatrixAt(index, m);
      cell.push({ x, z, shade: 1 + (rand() - 0.5) * variance * 2 });
      index++;
    }
  }

  const repaint = (fn) => {
    cell.forEach((item, i) => {
      tint.copy(toColor(fn(item.x, item.z, i))).multiplyScalar(item.shade);
      mesh.setColorAt(i, tint);
    });
    mesh.instanceColor.needsUpdate = true;
  };
  repaint(paint);
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, repaint };
}

/** Bola kecil rajut siap pakai: isian + jahitan. */
export function knitBall(radius, { stitch = 'v', w = 0.03, h = 0.026, color = 0xffffff, darken = 0.55, ry = radius, scatter = false, droop = 0, paint = null, quality = 'high', depth } = {}) {
  const group = new THREE.Group();
  const loft = new Loft(
    [
      { p: [0, 0, -0.0001], rx: radius, ry },
      { p: [0, 0, 0], rx: radius, ry },
      { p: [0, 0, 0.0001], rx: radius, ry },
    ],
    { capStart: 1, capEnd: 1 },
  );
  const painter = paint ?? (() => color);
  group.add(coreMesh(loft, { paint: painter, darken }));
  group.add(knit(loft, { stitch, w, h, paint: painter, scatter, droop, quality, depth }));
  return group;
}
