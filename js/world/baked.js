// Cahaya hasil bake Blender (blender/bake_room.py) untuk lantai dan dinding rumah.
// Tiap permukaan punya dua peta: cahaya matahari + langit + pantulan, dan cahaya lampu berdiri.
// Peta dicari dari posisi dunia, jadi jahitan rajut tidak perlu UV khusus.

import * as THREE from 'three';
import { yarnMaterial } from '../yarn/material.js';

// Harus sama dengan RANGE di bake_room.py: nilai = byte^2 * RANGE
const RANGE = 4.0;

// Ukuran ruangan, sama dengan HOUSE di house.js
const W = 10;
const D = 7.5;
const H = 2.4;

// u dan v dari posisi dunia, sama dengan UV bidang bake di Blender.
const UV = {
  floor: `vec2((p.x + ${W / 2}.0) / ${W}.0, (${D / 2} - p.z) / ${D})`,
  back: `vec2((p.x + ${W / 2}.0) / ${W}.0, p.y / ${H})`,
  left: `vec2((p.z + ${D / 2}) / ${D}, p.y / ${H})`,
};

/** Dipakai bersama semua permukaan rumah: lampu menyala atau tidak, dan kekuatan bake. */
export const bakeUniforms = {
  uBakeLamp: { value: 1 },
  uBakeMix: { value: 1 },
};

const loader = new THREE.TextureLoader();
const textures = new Map();

function load(name) {
  if (!textures.has(name)) {
    // Mulai dari putih netral supaya rumah tetap tampil selagi gambar dimuat.
    const texture = loader.load(`light/${name}.jpg`);
    texture.colorSpace = THREE.NoColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    textures.set(name, texture);
  }
  return textures.get(name);
}

const materials = new Map();

/** Salinan material benang yang membaca peta cahaya untuk permukaan tertentu. */
export function bakedYarn(surface) {
  if (materials.has(surface)) return materials.get(surface);
  const base = load(`${surface}_base`);
  const lamp = load(`${surface}_lamp`);
  // Salinan lengkap (termasuk kilau kain), lalu ditambah pembacaan peta cahaya.
  const material = yarnMaterial.clone();
  material.onBeforeCompile = (shader, renderer) => {
    yarnMaterial.onBeforeCompile(shader, renderer);
    shader.uniforms.uBakeBase = { value: base };
    shader.uniforms.uBakeLampMap = { value: lamp };
    shader.uniforms.uBakeLamp = bakeUniforms.uBakeLamp;
    shader.uniforms.uBakeMix = bakeUniforms.uBakeMix;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec2 vBakeUv;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 bakeP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          bakeP = instanceMatrix * bakeP;
        #endif
        bakeP = modelMatrix * bakeP;
        { vec3 p = bakeP.xyz; vBakeUv = ${UV[surface]}; }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform sampler2D uBakeBase;
        uniform sampler2D uBakeLampMap;
        uniform float uBakeLamp;
        uniform float uBakeMix;
        varying vec2 vBakeUv;
        vec3 bakeRead(sampler2D map) {
          vec3 c = texture2D(map, clamp(vBakeUv, 0.002, 0.998)).rgb;
          return c * c * ${RANGE.toFixed(1)};
        }
        void main() {`,
      )
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
        {
          // Sudut gelap, bayangan furnitur, dan pantulan hangat dari Blender mengatur cahaya lembut;
          // cahaya langsung website tetap ada supaya bayangan anjing tetap jatuh di lantai.
          vec3 bakeLight = mix(vec3(1.0), bakeRead(uBakeBase), uBakeMix);
          reflectedLight.indirectDiffuse *= bakeLight;
          reflectedLight.directDiffuse *= min(bakeLight, vec3(2.2));
          reflectedLight.indirectDiffuse += diffuseColor.rgb * bakeRead(uBakeLampMap) * uBakeLamp * 0.8 * uBakeMix;
        }`,
      );
  };
  material.customProgramCacheKey = () => `yarn-baked-${surface}`;
  materials.set(surface, material);
  return material;
}

/** Ganti material benang di dalam objek (lantai, karpet, dinding) dengan versi ber-bake. */
export function applyBake(object, surface) {
  const material = bakedYarn(surface);
  object.traverse((child) => {
    if (child.material === yarnMaterial) child.material = material;
  });
}

/** Panorama ruangan dari Blender untuk pantulan. Memanggil done(texture) setelah siap. */
export function loadRoomEnvironment(renderer, done) {
  loader.load('light/room_env.jpg', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(texture).texture;
    pmrem.dispose();
    texture.dispose();
    done(env);
  });
}
