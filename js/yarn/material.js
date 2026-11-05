// Material benang: serat terpilin tiga, sedikit berbulu di tepi, dan gelap di sela jahitan.
// Satu material dipakai bersama agar perpindahan shader tetap minimal.

import * as THREE from 'three';

const sharedUniforms = { uFuzz: { value: 0.34 } };

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
  varying vec3 vYarn;
  varying float vSeed;

  float plyPhase() {
    return vYarn.x * 15.0 + vYarn.y * 18.8496 + vSeed * 6.2831;
  }
  float plyHeight(float phase) {
    return abs(sin(phase));
  }
`;

const FRAGMENT_COLOR = /* glsl */ `
  float yarnPhase = plyPhase();
  float yarnDetail = clamp(1.4 - fwidth(yarnPhase) * 0.55, 0.0, 1.0);
  float yarnH = plyHeight(yarnPhase);
  diffuseColor.rgb *= mix(1.0, 0.8 + 0.28 * yarnH, yarnDetail) * vYarn.z;
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
    vec3 grad = sign(det) * (hx * r1 + hy * r2) * 0.9 * yarnDetail;
    normal = normalize(abs(det) * normal - grad);
  }
`;

const FRAGMENT_EMISSIVE = /* glsl */ `
  float yarnRim = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  totalEmissiveRadiance += diffuseColor.rgb * yarnRim * yarnRim * uFuzz;
`;

export const yarnMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.92,
  metalness: 0,
  envMapIntensity: 0.5,
});

yarnMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uFuzz = sharedUniforms.uFuzz;
  shader.vertexShader = (VERTEX_HEAD + shader.vertexShader).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>\n${VERTEX_BODY}`,
  );
  shader.fragmentShader = (FRAGMENT_HEAD + shader.fragmentShader)
    .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_COLOR}`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${FRAGMENT_EMISSIVE}`);
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
