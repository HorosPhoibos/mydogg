// Bentuk satu jahitan. Semua geometri berukuran kira-kira 1x1 dengan sumbu:
//   x = sepanjang baris, y = ke baris berikutnya, z = keluar dari permukaan.
// Tiap jahitan disusun dari potongan benang (tabung) agar siluetnya benar-benar berbulu benang.

import * as THREE from 'three';

function catmull(points, t) {
  const n = points.length - 1;
  const f = Math.min(t * n, n - 1e-4);
  const i = Math.floor(f);
  const a = points[Math.max(i - 1, 0)];
  const b = points[i];
  const c = points[i + 1];
  const d = points[Math.min(i + 2, n)];
  const u = f - i;
  const interp = (k) =>
    0.5 *
    (2 * b[k] +
      (c[k] - a[k]) * u +
      (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u * u +
      (3 * b[k] - a[k] - 3 * c[k] + d[k]) * u * u * u);
  return new THREE.Vector3(interp(0), interp(1), interp(2));
}

function pushTube(out, points, radiusAt, segments, radial) {
  const base = out.positions.length / 3;
  const samples = [];
  for (let i = 0; i <= segments; i++) samples.push(catmull(points, i / segments));

  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  const reference = new THREE.Vector3(0, 0, 1);

  samples.forEach((p, i) => {
    const prev = samples[Math.max(i - 1, 0)];
    const next = samples[Math.min(i + 1, segments)];
    tangent.subVectors(next, prev).normalize();
    side.crossVectors(tangent, reference);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    up.crossVectors(side, tangent).normalize();

    const t = i / segments;
    const radius = radiusAt(t);
    for (let k = 0; k < radial; k++) {
      const angle = (k / radial) * Math.PI * 2;
      const cx = Math.cos(angle);
      const cy = Math.sin(angle);
      const nx = side.x * cx + up.x * cy;
      const ny = side.y * cx + up.y * cy;
      const nz = side.z * cx + up.z * cy;
      const px = p.x + nx * radius;
      const py = p.y + ny * radius;
      const pz = p.z + nz * radius;
      out.positions.push(px, py, pz);
      out.normals.push(nx, ny, nz);
      // aYarn: (panjang benang, keliling benang, oklusi: makin dekat permukaan makin gelap)
      out.yarn.push(t * out.length, k / radial, THREE.MathUtils.clamp(0.42 + pz * 1.15, 0.42, 1));
    }
  });

  for (let i = 0; i < segments; i++) {
    for (let k = 0; k < radial; k++) {
      const a = base + i * radial + k;
      const b = base + i * radial + ((k + 1) % radial);
      const c = a + radial;
      const d = b + radial;
      out.indices.push(a, c, b, b, c, d);
    }
  }
}

function buildGeometry(strands, { segments, radial }) {
  const out = { positions: [], normals: [], yarn: [], indices: [], length: 1 };
  for (const strand of strands) {
    out.length = strand.length ?? 1;
    pushTube(out, strand.points, strand.radius, Math.round(segments * (strand.detail ?? 1)), radial);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(out.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(out.normals, 3));
  geometry.setAttribute('aYarn', new THREE.Float32BufferAttribute(out.yarn, 3));
  geometry.setIndex(out.indices);
  return geometry;
}

const round = (r) => (t) => r * (0.72 + 0.28 * Math.sin(Math.PI * t));
const taper = (r) => (t) => r * (1 - t * t * 0.85);

const SHAPES = {
  // Jahitan V: dua lengan yang bertemu di bawah, bentuk klasik kain rajut.
  v: [
    {
      radius: round(0.24),
      points: [[0.02, -0.62, 0.0], [-0.2, -0.22, 0.26], [-0.34, 0.22, 0.34], [-0.4, 0.62, 0.06]],
    },
    {
      radius: round(0.24),
      points: [[-0.02, -0.62, 0.0], [0.2, -0.22, 0.26], [0.34, 0.22, 0.34], [0.4, 0.62, 0.06]],
    },
  ],
  // Keriting: lilitan benang berputar, untuk bulu pudel.
  curl: [
    {
      length: 1.6,
      detail: 2,
      radius: round(0.2),
      points: [
        [0.05, -0.42, 0.0], [0.42, -0.2, 0.28], [0.34, 0.3, 0.46], [-0.12, 0.42, 0.56],
        [-0.42, 0.04, 0.46], [-0.14, -0.28, 0.5], [0.16, -0.02, 0.28],
      ],
    },
  ],
  // Lengkung panjang menggantung, untuk bulu putih yang lebat.
  loop: [
    {
      length: 1.5,
      detail: 1.6,
      radius: round(0.17),
      points: [[-0.3, 0.42, 0.0], [-0.34, -0.1, 0.34], [-0.1, -0.68, 0.44], [0.16, -0.66, 0.42], [0.34, -0.08, 0.32], [0.3, 0.42, 0.0]],
    },
  ],
  // Rumbai: beberapa helai meruncing, untuk surai dan ekor.
  tuft: [
    { length: 1.4, detail: 1.2, radius: taper(0.15), points: [[-0.2, 0.3, 0.0], [-0.24, -0.2, 0.3], [-0.3, -0.75, 0.42], [-0.36, -1.15, 0.3]] },
    { length: 1.4, detail: 1.2, radius: taper(0.17), points: [[0.0, 0.3, 0.0], [0.0, -0.28, 0.36], [0.03, -0.9, 0.52], [0.06, -1.35, 0.4]] },
    { length: 1.4, detail: 1.2, radius: taper(0.15), points: [[0.2, 0.3, 0.0], [0.24, -0.2, 0.28], [0.28, -0.72, 0.4], [0.32, -1.1, 0.28]] },
  ],
  // Bilah pendek: rib kerah, tali, dan benang gulungan bola.
  bar: [
    { radius: round(0.34), points: [[-0.62, 0, 0.02], [-0.25, 0, 0.26], [0.25, 0, 0.26], [0.62, 0, 0.02]] },
  ],
};

const DETAIL = {
  high: { segments: 5, radial: 5 },
  medium: { segments: 4, radial: 4 },
  low: { segments: 3, radial: 3 },
};

const cache = new Map();

export function stitchGeometry(type, quality) {
  const key = `${type}:${quality}`;
  if (!cache.has(key)) cache.set(key, buildGeometry(SHAPES[type], DETAIL[quality]));
  return cache.get(key);
}
