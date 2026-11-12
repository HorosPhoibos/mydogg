// Material benang: tiga helai terpilin berisi serat halus, bulu yang mencuat, kilau kain (sheen)
// di tepi, dan gelap di sela jahitan. Detail benang berasal dari tekstur hasil bake Blender
// (blender/bake_yarn.py → light/yarn_detail.jpg):
//   R = tinggi permukaan, G = oklusi di sela serat, B = variasi terang per serat.
// Satu material dipakai bersama agar perpindahan shader tetap minimal.

import * as THREE from 'three';

// Tekstur netral sementara (rata, tanpa oklusi) sampai yarn_detail.jpg selesai dimuat.
const neutral = new THREE.DataTexture(new Uint8Array([128, 204, 128, 255]), 1, 1);
neutral.needsUpdate = true;

const sharedUniforms = {
  uFuzz: { value: 0.34 },
  uFuzzScale: { value: 1 },
  uYarnTex: { value: neutral },
  // Berapa ubin tekstur per satu panjang benang di stitches.js (satu ubin = 0.7 satuan).
  uYarnScale: { value: 2.0 },
  uYarnBump: { value: 0.75 },
};

new THREE.TextureLoader().load('light/yarn_detail.jpg', (texture) => {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  sharedUniforms.uYarnTex.value = texture;
});

const VERTEX_HEAD = /* glsl */ `
  attribute vec3 aYarn;
  varying vec3 vYarn;
  varying float vSeed;
`;

const VERTEX_BODY = /* glsl */ `
  vYarn = aYarn;
  vSeed = fract(float(gl_InstanceID) * 0.61803398);
`;

const FRAGMENT_HEAD = /* glsl */ `
  uniform float uFuzz;
  uniform float uFuzzScale;
  uniform sampler2D uYarnTex;
  uniform float uYarnScale;
  uniform float uYarnBump;
  varying vec3 vYarn;
  varying float vSeed;
`;

const FRAGMENT_COLOR = /* glsl */ `
  vec2 yarnUv = vec2(vYarn.x * uYarnScale + vSeed * 3.7, vYarn.y + vSeed * 0.31);
  vec4 yarnTex = texture2D(uYarnTex, yarnUv);
  // Seberapa terlihat detail serat: memudar kalau satu piksel layar mencakup banyak serat.
  vec2 yarnTexel = fwidth(yarnUv) * vec2(256.0, 512.0);
  float yarnDetail = clamp(1.6 - max(yarnTexel.x, yarnTexel.y) * 0.12, 0.0, 1.0);
  float yarnH = yarnTex.r;
  // Oklusi dinormalkan ke rata-ratanya (~0.8), jadi warna rata-rata benang tidak berubah.
  float yarnShade = clamp(mix(1.0, yarnTex.g / 0.8, 0.85), 0.35, 1.2) * (0.82 + 0.36 * yarnTex.b);
  diffuseColor.rgb *= mix(1.0, yarnShade, mix(0.45, 1.0, yarnDetail)) * vYarn.z;
`;

const FRAGMENT_NORMAL = /* glsl */ `
  if (yarnDetail > 0.01) {
    vec3 sx = dFdx(-vViewPosition);
    vec3 sy = dFdy(-vViewPosition);
    vec3 r1 = cross(sy, normal);
    vec3 r2 = cross(normal, sx);
    float det = dot(sx, r1);
    float hx = dFdx(yarnH);
    float hy = dFdy(yarnH);
    vec3 grad = sign(det) * (hx * r1 + hy * r2) * uYarnBump * yarnDetail;
    normal = normalize(abs(det) * normal - grad);
  }
`;

const FRAGMENT_EMISSIVE = /* glsl */ `
  // Bulu halus di tepi benang menangkap cahaya, lebih kuat di serat yang mencuat.
  float yarnRim = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  totalEmissiveRadiance += diffuseColor.rgb * yarnRim * yarnRim * uFuzz * uFuzzScale * (0.7 + 0.6 * yarnH);
`;

// Kilau kain mengikuti warna benang (wol merah berkilau kemerahan, bukan putih).
const LIGHTS_PHYSICAL = THREE.ShaderChunk.lights_physical_fragment.replace(
  'material.sheenColor = sheenColor;',
  'material.sheenColor = sheenColor * mix(vec3(1.0), min(diffuseColor.rgb * 2.2, vec3(1.0)), 0.7);',
);

export const yarnMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  roughness: 0.92,
  metalness: 0,
  envMapIntensity: 0.5,
  sheen: 1,
  sheenRoughness: 0.42,
  sheenColor: new THREE.Color(0.55, 0.55, 0.55),
});

yarnMaterial.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, sharedUniforms);
  shader.vertexShader = (VERTEX_HEAD + shader.vertexShader).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>\n${VERTEX_BODY}`,
  );
  shader.fragmentShader = (FRAGMENT_HEAD + shader.fragmentShader)
    .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_COLOR}`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${FRAGMENT_EMISSIVE}`)
    .replace('#include <lights_physical_fragment>', LIGHTS_PHYSICAL);
};

// Isian di bawah jahitan: warnanya lebih gelap supaya sela benang terbaca dalam.
export const coreMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 1,
  metalness: 0,
  envMapIntensity: 0.2,
  side: THREE.DoubleSide,
});

export function setFuzz(value) {
  sharedUniforms.uFuzz.value = value;
}

/**
 * Kualitas benang. 'high': kilau kain penuh. Selain itu kilau kain dimatikan supaya HP tetap lancar,
 * dan bulu tepi sedikit dikuatkan untuk menggantikannya. Panggil sebelum dunia dibangun.
 */
export function setYarnQuality(quality) {
  const full = quality === 'high';
  yarnMaterial.sheen = full ? 1 : 0;
  sharedUniforms.uFuzzScale.value = full ? 0.6 : 1;
}
