// Titik masuk: menyiapkan panggung, kamera, interaksi, dan putaran gambar.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { createRoom, THEMES } from './world/room.js';
import { loadRoomEnvironment } from './world/baked.js';
import { createBall } from './world/ball.js';
import { Squad } from './dog/squad.js';
import { coreMaterial, setFuzz, setYarnQuality } from './yarn/material.js';
import { knitBall } from './yarn/loft.js';
import { sounds, createVoiceRepeater, setMuted, createMusic } from './audio.js';
import { createUI } from './ui.js';
import { createFx } from './world/fx.js';
import { createBubbles } from './bubbles.js';
import { composePhoto } from './photo.js';
import { EGGS, EGG_COUNT } from './eggs.js';
import { createGames, GAMES } from './games.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const stage = document.getElementById('stage');
const ROOM_TARGET_Y = 0.42;
const PARK_FOLLOW_DISTANCE = 8.5;
const CLOSE_DISTANCE = { dog: 2.05, person: 4.3 };
const PET_DISTANCE = 1.85;
const PETS_TO_FULL = 5;

function pickQuality() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (coarse || cores <= 4) return 'medium';
  return 'high';
}

function start() {
  const quality = pickQuality();
  setYarnQuality(quality);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studioEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = studioEnv;
  pmrem.dispose();
  // Rumah memakai panorama ruangan hasil render Blender, supaya pantulannya cocok dengan isi rumah.
  let roomEnv = null;
  const pickEnvironment = () => (scene.environment = themeId === 'room' && roomEnv ? roomEnv : studioEnv);
  loadRoomEnvironment(renderer, (env) => {
    roomEnv = env;
    pickEnvironment();
  });

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 120);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = 1.42;
  controls.minDistance = 1.2;
  controls.maxDistance = 24;
  controls.target.set(0, ROOM_TARGET_Y, 0);
  camera.position.set(0, 3.2, 7.2);

  // Cahaya. Bayangan mengikuti kamera supaya tetap tajam di taman yang luas.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 1);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  const KEY_OFFSET = new THREE.Vector3(-2.4, 4.6, 3.2);
  key.position.copy(KEY_OFFSET);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 16;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffffff, 1);
  rim.position.set(3, 2.4, -3.6);
  scene.add(rim);

  const setShadowArea = (half) => {
    const cam = key.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half * 0.9;
    cam.bottom = -half * 0.9;
    cam.updateProjectionMatrix();
  };

  // Isi panggung
  const room = createRoom({ quality });
  scene.add(room.group);
  const ball = createBall(quality);
  scene.add(ball.mesh);
  const squad = new Squad(scene, quality, ball, sounds);
  const fx = createFx(scene);
  const bubbles = createBubbles(camera, stage);
  const music = createMusic();
  squad.say = bubbles.say;

  let active = squad.byId('kitty');
  squad.active = active;
  let closeUp = false;
  let themeId = 'room';
  let worldData = null;
  let world = THEMES.room.world;
  let ui = null;

  const goalTarget = new THREE.Vector3(0, ROOM_TARGET_Y, 0);
  let goalDistance = 7;
  let zooming = true;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const viewInset = { right: 0, bottom: 0 };

  /**
   * Mode layar. Tepat satu yang aktif, dan tertulis di <html data-screen="...">:
   *   free   bermain bebas
   *   pet    mode Elus satu anjing (data di `pet`)
   *   photo  Foto keluarga: berkumpul, hitung mundur, jepret (data di `shot`)
   *   party  Pesta ulang tahun (data di `party`)
   *   game   Permainan dari menu Main; jenisnya tertulis di <html data-game="..."> (lihat games.js)
   * Perpindahan selalu lewat setScreen, dan keluar lewat exitScreen, supaya kamera, tokoh,
   * musik, dan tampilan dari mode sebelumnya pasti dibereskan.
   */
  const SCREEN = Object.freeze({ FREE: 'free', PET: 'pet', PHOTO: 'photo', PARTY: 'party', GAME: 'game' });
  const SCREEN_NAME = { pet: 'mode Elus', photo: 'Foto keluarga', party: 'pestanya', game: 'permainannya' };
  let screen = SCREEN.FREE;

  function setScreen(next, detail) {
    screen = next;
    document.documentElement.dataset.screen = next;
    ui.setScreen(next, detail);
  }

  /** Kembali ke bermain bebas dari mode apa pun. */
  function exitScreen() {
    if (screen === SCREEN.PET) leavePet();
    else if (screen === SCREEN.PHOTO) endPhoto();
    else if (screen === SCREEN.PARTY) endParty();
    else if (screen === SCREEN.GAME) games.stop();
  }

  /** Mode Elus boleh ditinggal kapan saja; foto dan pesta harus selesai dulu, dan pengguna diberi tahu. */
  function canStart() {
    if (screen === SCREEN.PET) leavePet();
    if (screen === SCREEN.FREE) return true;
    ui.say(`Tunggu ${SCREEN_NAME[screen]} selesai dulu.`, 2400);
    return false;
  }

  // Mode Elus: kamera menatap wajah anjing dari depan.
  let pet = null;

  function overviewDistance() {
    if (world.roomy) return PARK_FOLLOW_DISTANCE;
    const w = Math.max(stage.clientWidth - viewInset.right, 1);
    const h = Math.max(stage.clientHeight - viewInset.bottom, 1);
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const fitHeight = (world.halfZ * 2 * 0.82 + 1.5) / 2 / Math.tan(halfFov);
    // Di layar sempit diberi ruang lebih, supaya Mama di tepi selimut tidak terpotong.
    const fitWidth = (world.halfX * 2 + (w < h ? 1.6 : 0.5)) / 2 / (Math.tan(halfFov) * (w / h));
    return Math.min(Math.max(fitHeight, fitWidth) + world.halfZ * 0.6, 20.5);
  }

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Geser pusat gambar agar tokoh berada di tengah area yang tidak tertutup panel.
    camera.setViewOffset(w, h, viewInset.right / 2, viewInset.bottom / 2, w, h);
    camera.updateProjectionMatrix();
    if (!closeUp && !pet) goalDistance = overviewDistance();
    zooming = true;
  }
  new ResizeObserver(resize).observe(stage);

  controls.addEventListener('start', () => {
    zooming = false;
  });

  function setTheme(id) {
    exitScreen();
    themeId = id;
    world = THEMES[id].world;
    const { light } = THEMES[id];
    worldData = room.setTheme(id);
    squad.setTheme(id, worldData);
    fx.setTheme(id);
    hemi.color.set(light.hemiSky);
    hemi.groundColor.set(light.hemiGround);
    hemi.intensity = light.hemi;
    key.color.set(light.key);
    key.intensity = light.keyI;
    rim.color.set(light.rim);
    rim.intensity = light.rimI;
    scene.environmentIntensity = light.env;
    pickEnvironment();
    setFuzz(light.fuzz);
    setShadowArea(world.roomy ? 7 : 3.4);
    controls.maxDistance = world.roomy ? 34 : 24;
    document.documentElement.dataset.theme = id;
    if (!closeUp) {
      goalTarget.set(0, ROOM_TARGET_Y, 0);
      goalDistance = overviewDistance();
    }
    zooming = true;
  }

  function updateCamera(dt) {
    const cinema = screen === SCREEN.GAME ? games.camera : null;
    // Layar tegak (HP) lebih sempit, jadi kamera permainan mundur supaya semuanya tetap masuk.
    const cinemaDistance = cinema ? cinema.distance / Math.min(1, camera.aspect * 1.35) : 0;
    if (cinema?.view) {
      // Pertunjukan: kamera menghadap panggung dari depan, seperti penonton.
      const { azimuth, elevation } = cinema.view;
      tmp.set(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
      tmp.multiplyScalar(cinemaDistance).add(cinema.target);
      const k = 1 - Math.exp(-2.6 * dt);
      controls.target.lerp(cinema.target, k);
      camera.position.lerp(tmp, k);
      controls.update();
      return;
    }
    if (cinema) {
      // Kamera mengikuti permainan, sudut putarnya tetap bisa diubah pengguna.
      goalTarget.copy(cinema.target);
      goalDistance = cinemaDistance;
      zooming = true;
    }
    if (shot) {
      goalTarget.set(shot.x, 0.68, shot.z);
      const d = Math.max(5.6, 1.85 / (0.231 * camera.aspect));
      tmp.set(shot.x, 1.3, shot.z + d);
      const k = 1 - Math.exp(-3 * dt);
      controls.target.lerp(goalTarget, k);
      camera.position.lerp(tmp, k);
      controls.update();
      return;
    }
    if (pet) {
      pet.dog.headWorld(goalTarget);
      goalTarget.y -= 0.01;
      // Layar HP sempit, jadi kamera mundur supaya seluruh kepala tetap masuk.
      const distance = PET_DISTANCE / Math.min(1, camera.aspect * 1.25);
      tmp.set(Math.sin(pet.yaw) * distance, 0.2, Math.cos(pet.yaw) * distance).add(goalTarget);
      const k = 1 - Math.exp(-3.8 * dt);
      controls.target.lerp(goalTarget, k);
      camera.position.lerp(tmp, k);
      controls.update();
      return;
    }
    if (cinema) {
      // Sasaran sudah diatur permainan.
    } else if (closeUp || world.roomy) {
      active.chestWorld(goalTarget);
      goalTarget.y += !closeUp ? 0.12 : active.isDog ? 0.06 : 0.42;
    } else {
      goalTarget.set(0, ROOM_TARGET_Y, 0);
    }
    const before = tmp.copy(controls.target);
    const k = 1 - Math.exp(-3.4 * dt);
    controls.target.lerp(goalTarget, k);
    camera.position.add(tmp2.subVectors(controls.target, before));
    if (zooming) {
      tmp.subVectors(camera.position, controls.target);
      const length = tmp.length();
      const next = length + (goalDistance - length) * k;
      camera.position.copy(controls.target).addScaledVector(tmp.normalize(), next);
      if (Math.abs(next - goalDistance) < 0.005) zooming = false;
    }
    controls.update();
  }

  function updateShadowCenter() {
    if (world.roomy) {
      // Dibulatkan agar tepi bayangan tidak bergetar saat kamera bergerak.
      tmp.copy(controls.target);
      tmp.x = Math.round(tmp.x * 4) / 4;
      tmp.z = Math.round(tmp.z * 4) / 4;
      tmp.y = 0;
    } else {
      tmp.set(0, 0, 0);
    }
    key.target.position.copy(tmp);
    key.position.copy(tmp).add(KEY_OFFSET);
  }

  // Interaksi di kanvas
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const facePlane = new THREE.Plane();
  const lookPoint = new THREE.Vector3(0, 1.2, 6);
  const lookGoal = new THREE.Vector3(0, 1.2, 6);
  const petLook = new THREE.Vector3();
  const floorHit = new THREE.Vector3();
  let press = null;

  const actorMeshes = new Map();
  squad.actors.forEach((actor) => {
    const list = [];
    actor.root.traverse((o) => {
      if (o.isMesh && !o.isInstancedMesh && o.material === coreMaterial) list.push(o);
    });
    if (actor.isDog) list.push(actor.rig.nose);
    actorMeshes.set(actor, list);
  });

  function aim(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  /** Tokoh terdekat di bawah kursor. `only` menyaring tokoh mana yang boleh terkena. */
  function actorUnderPointer(only = null) {
    let best = null;
    let bestDistance = Infinity;
    for (const [actor, meshes] of actorMeshes) {
      if (!actor.root.visible || (only && !only(actor))) continue;
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (hit && hit.distance < bestDistance) {
        best = actor;
        bestDistance = hit.distance;
      }
    }
    return best;
  }

  // Hidung kecil di layar, jadi diberi area sentuh lebih longgar dari bentuk aslinya.
  function isOnNose(dog, event) {
    const rect = renderer.domElement.getBoundingClientRect();
    dog.rig.nose.getWorldPosition(tmp);
    const distance = tmp.distanceTo(camera.position);
    const worldRadius = dog.breed.size.snout[0] * 0.5 * dog.scale;
    const pixels = (worldRadius * (rect.height / 2)) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance);
    tmp.project(camera);
    const sx = rect.left + ((tmp.x + 1) / 2) * rect.width;
    const sy = rect.top + ((1 - tmp.y) / 2) * rect.height;
    // Setelah pencetan pertama kepalanya bergerak bereaksi, jadi areanya dilonggarkan.
    const slack = dog.nosePresses > 0 ? 2.4 : 1.25;
    return Math.hypot(event.clientX - sx, event.clientY - sy) < Math.max(pixels * slack, pet ? 22 : 9);
  }

  function boopNose(dog) {
    const count = dog.boop();
    const pitch = dog.breed.voice;
    if (dog.isAngry && count >= 3) {
      sounds.angry(pitch);
      bubbles.say(dog, 'GRRR! GUK GUK!', 3);
      ui.say(`${dog.name} marah! Jangan pencet hidungnya lagi.`, 3400);
      if (pet) ui.setPetHearts(0);
      if (pet) pet.strokes = 0;
    } else if (count === 1) {
      sounds.boop();
      bubbles.say(dog, 'Eh?!', 1.2);
      ui.say('Boop!', 1400);
    } else {
      sounds.boop();
      sounds.growl(pitch, 0.5);
      bubbles.say(dog, 'Hei, geli tau!', 1.8);
      ui.say(`${dog.name} mulai kesal. Sekali lagi, dia marah.`, 2600);
    }
  }

  function strokeDog(dog, x, y) {
    if (dog.isAngry) {
      sounds.growl(dog.breed.voice, 0.4);
      ui.say(`${dog.name} masih marah. Tunggu sebentar.`, 1800);
      return;
    }
    dog.express('happy');
    dog.tickle();
    ui.heart(x, y);
    if (Math.random() < 0.18) bubbles.say(dog, pick(['Enaaak...', 'Lagi dong', 'Di situ, di situ!']), 1.8);
    if (!pet) return;
    pet.strokes += 1;
    if (pet.strokes % 3 === 1) sounds.whimper(dog.breed.voice);
    const hearts = Math.min(PETS_TO_FULL, Math.floor(pet.strokes / 3));
    ui.setPetHearts(hearts);
    if (hearts >= PETS_TO_FULL) {
      pet.strokes = 0;
      ui.setPetHearts(0);
      ui.say(`${dog.name} senang sekali, sampai guling-guling!`, 3000);
      dog.setPose('roll');
    }
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (event) => {
    aim(event);
    if (pet) {
      // Bidang tegak di depan wajah anjing: mata dan kepala mengikuti kursor di bidang ini.
      pet.dog.headWorld(tmp);
      camera.getWorldDirection(tmp2);
      facePlane.setFromNormalAndCoplanarPoint(tmp2, tmp);
      if (raycaster.ray.intersectPlane(facePlane, petLook)) {
        // Sedikit maju ke arah kamera supaya pandangannya terasa menatap kursor.
        petLook.addScaledVector(tmp2, -0.6);
        pet.dog.lookOverride = petLook;
      }
    } else if (raycaster.ray.intersectPlane(floorPlane, floorHit)) {
      lookGoal.set(floorHit.x, 0.45, floorHit.z);
    } else {
      lookGoal.set(0, 1.2, 6);
    }
    if (press) {
      press.moved += Math.abs(event.movementX) + Math.abs(event.movementY);
      if (press.actor?.isDog && press.moved > 22) {
        press.moved = 0;
        press.strokes++;
        strokeDog(press.actor, event.clientX, event.clientY);
      }
    }
  });

  canvas.addEventListener('pointerdown', (event) => {
    aim(event);
    // Saat petak umpet, ketukan hanya mencari anjing, jadi Mama dan Bapak tidak menghalangi.
    const actor = actorUnderPointer(screen === SCREEN.GAME && games.id === 'hide' ? (a) => a.isDog : null);
    // Saat foto dan pesta tokoh sedang ditata, jadi ketukan di kanvas diabaikan (kamera tetap bisa diputar).
    if (screen === SCREEN.PHOTO || screen === SCREEN.PARTY) {
      press = null;
      return;
    }
    // Tokoh yang disentuh langsung diam, supaya enak dielus atau diajak main.
    if (actor && screen === SCREEN.FREE) squad.hold(actor);
    // Saat mengelus, kamera tidak ikut berputar.
    if (actor?.isDog || pet) controls.enableRotate = false;
    press = { actor, moved: 0, strokes: 0, x: event.clientX, y: event.clientY, time: performance.now() };
  });

  window.addEventListener('pointerup', (event) => {
    controls.enableRotate = true;
    if (!press) return;
    const { actor, strokes, x, y, time } = press;
    const travelled = Math.hypot(event.clientX - x, event.clientY - y);
    press = null;
    if (event.target !== canvas || travelled > 8 || performance.now() - time > 500 || strokes) return;

    if (screen === SCREEN.GAME) {
      if (actor) games.onActorTap(actor);
      return;
    }
    if (actor) {
      // Ketuk berulang-ulang dengan cepat membuka rahasia tokoh.
      const now = performance.now();
      tapStreak = tapStreak.actor === actor && now - tapStreak.time < 650 ? { actor, count: tapStreak.count + 1, time: now } : { actor, count: 1, time: now };
      if (secretTap(actor, tapStreak.count)) return;
      if (actor.isDog && (actor === active || pet) && isOnNose(actor, event)) {
        boopNose(actor);
        return;
      }
      if (pet) {
        if (actor === pet.dog) strokeDog(actor, event.clientX, event.clientY);
        return;
      }
      selectActor(actor);
      if (actor.isDog) {
        actor.express('bark');
        sounds.bark(actor.breed.voice);
      } else {
        squad.command(actor, 'wave');
        sounds.hello();
      }
      return;
    }
    if (pet) return;
    aim(event);
    // Benda di dunia yang bisa diketuk: TV, lampu, pohon, roket, dan lainnya.
    const thing = room.pick(raycaster);
    if (thing) {
      thing.item.onTap(worldApi, thing.point);
      discover(thing.item.id);
      return;
    }
    if (raycaster.ray.intersectPlane(floorPlane, floorHit) && Math.abs(floorHit.x) < world.halfX && Math.abs(floorHit.z) < world.halfZ) {
      squad.walkTo(active, floorHit.x, floorHit.z);
    }
  });

  // Tombol panah dan WASD menggerakkan tokoh terpilih, arahnya mengikuti sudut kamera.
  const held = new Set();
  const KEYS = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
  window.addEventListener('keydown', (event) => {
    const dir = KEYS[event.key];
    if (!dir || event.target.closest?.('input, textarea, dialog')) return;
    event.preventDefault();
    held.add(dir);
  });
  window.addEventListener('keyup', (event) => {
    const dir = KEYS[event.key];
    if (dir) held.delete(dir);
  });
  window.addEventListener('blur', () => held.clear());

  function updateSteer() {
    const forward = (held.has('u') ? 1 : 0) - (held.has('d') ? 1 : 0);
    const side = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0);
    if (!forward && !side) {
      squad.steer.x = 0;
      squad.steer.z = 0;
      return;
    }
    camera.getWorldDirection(tmp);
    tmp.y = 0;
    tmp.normalize();
    // Kanan kamera = arah pandang diputar 90 derajat.
    const x = tmp.x * forward - tmp.z * side;
    const z = tmp.z * forward + tmp.x * side;
    const length = Math.hypot(x, z) || 1;
    squad.steer.x = x / length;
    squad.steer.z = z / length;
  }

  // Rahasia: ketuk anjing 5 kali cepat, atau Mama dan Bapak 3 kali cepat.
  let tapStreak = { actor: null, count: 0, time: 0 };
  function secretTap(actor, count) {
    if (screen !== SCREEN.FREE) return false;
    if (actor.isDog && count === 5) {
      // Kitty dan Gemoy satu tim: kalau temannya bebas, mereka lari-larian berdua.
      if (!squad.teamZoomies(actor)) squad.zoomies(actor);
      sounds.whimper(actor.breed.voice);
      discover('zoomies');
      return true;
    }
    if (actor.id === 'mama' && count === 3) {
      squad.command(actor, 'wave');
      squad.callDogs(actor);
      bubbles.say(actor, 'Mama sayang kalian semua!', 3.5);
      for (let i = 0; i < 12; i++) setTimeout(() => ui.heart(innerWidth * (0.2 + Math.random() * 0.6), innerHeight * (0.3 + Math.random() * 0.4)), i * 90);
      discover('mama');
      return true;
    }
    if (actor.id === 'bapak' && count === 3) {
      squad.command(actor, 'cake');
      squad.callDogs(actor);
      bubbles.say(actor, 'Kejutan! Siapa mau kue?', 3.5);
      fx.celebrate(4);
      discover('bapak');
      return true;
    }
    return false;
  }

  // Penghitung kejutan, disimpan di browser supaya tidak hilang saat halaman dibuka lagi.
  const found = new Set();
  try {
    JSON.parse(localStorage.getItem('mydogg-kejutan') ?? '[]').forEach((id) => EGGS[id] && found.add(id));
  } catch {
    // Penyimpanan diblokir, penghitung tetap jalan untuk kunjungan ini saja.
  }
  function discover(id) {
    if (!EGGS[id] || found.has(id)) return;
    found.add(id);
    try {
      localStorage.setItem('mydogg-kejutan', JSON.stringify([...found]));
    } catch {
      // Abaikan: penghitung tetap jalan tanpa disimpan.
    }
    ui.setFound(found.size, EGG_COUNT);
    if (found.size === EGG_COUNT) {
      fx.celebrate(8);
      sounds.birthday();
      ui.say('Hebat! Semua kejutan sudah ketemu!', 6000);
    } else {
      ui.say(`Kejutan baru: ${EGGS[id]} (${found.size} dari ${EGG_COUNT})`, 3200);
    }
  }

  const worldApi = {
    sounds,
    say: (text, hold) => ui.say(text, hold),
    playWith: (toy) => {
      if (!active.isDog) {
        ui.say('Pilih salah satu anjing dulu, lalu ketuk mainannya.', 2600);
        return;
      }
      squad.playWith(active, toy);
    },
    feedAtBowl: (x, z) => squad.feedAtBowl(x, z),
  };

  // Camilan
  let treat = null;
  let treatTimer = 0;
  const treatMesh = knitBall(0.042, { color: 0xc98a4b, w: 0.024, h: 0.02, depth: 0.012, quality: 'low', ry: 0.022 });
  treatMesh.visible = false;
  scene.add(treatMesh);

  let activeTalker = active;
  const repeater = createVoiceRepeater({
    onStatus: (status) => {
      activeTalker.talking = status === 'speaking';
      ui.voiceStatus(status, activeTalker);
    },
    onMouth: (amount) => {
      activeTalker.mouth = amount;
    },
  });

  function selectActor(actor) {
    if (screen === SCREEN.PET) leavePet();
    active = actor;
    squad.active = actor;
    document.documentElement.dataset.active = actor.id;
    squad.hold(actor);
    ui.showActor(actor);
    if (closeUp) setCloseUp(true);
  }

  function setCloseUp(value) {
    closeUp = value;
    zooming = true;
    goalDistance = value ? CLOSE_DISTANCE[active.isDog ? 'dog' : 'person'] : overviewDistance();
  }

  function unlockCamera(on) {
    controls.enabled = !on;
    controls.minDistance = on ? 0.5 : 1.2;
    controls.minPolarAngle = on ? 0.2 : 0.5;
    controls.maxPolarAngle = on ? Math.PI / 2 + 0.3 : 1.42;
    controls.maxDistance = on ? 40 : world.roomy ? 34 : 24;
  }

  function enterPet() {
    if (!active.isDog || screen === SCREEN.PET || !canStart()) return;
    const yaw = squad.enterPet(active, camera.position);
    pet = { dog: active, yaw, strokes: 0 };
    // Di mode ini yang paling bergerak adalah matanya, kepalanya hanya ikut sedikit.
    active.headFollow = 0.3;
    active.lookOverride = petLook.set(active.position.x + Math.sin(yaw) * 3, 0.6, active.position.z + Math.cos(yaw) * 3);
    unlockCamera(true);
    // Selama mode ini hanya ada dia dan kamu, supaya wajahnya tidak tertutup yang lain.
    squad.actors.forEach((other) => (other.root.visible = other === active));
    if (ball.mesh.visible) ball.mesh.visible = false;
    setScreen(SCREEN.PET, active);
  }

  function leavePet() {
    if (screen !== SCREEN.PET) return;
    pet.dog.headFollow = 1;
    pet = null;
    squad.leavePet();
    squad.actors.forEach((other) => (other.root.visible = true));
    unlockCamera(false);
    goalDistance = closeUp ? CLOSE_DISTANCE[active.isDog ? 'dog' : 'person'] : overviewDistance();
    zooming = true;
    setScreen(SCREEN.FREE);
  }

  // Foto keluarga: semua berkumpul, hitung mundur, lalu jepret.
  const PHOTO_POSES = { kitty: 'sploot', jenges: 'sit', gemoy: 'sploot', pompom: 'sit', mama: 'thumbs', bapak: 'cake' };
  const PHOTO_SPOTS = { kitty: [-1.2, 0.38], jenges: [-0.42, 0.5], gemoy: [0.4, 0.66], pompom: [1.2, 0.3], mama: [-0.52, -0.46], bapak: [0.5, -0.5] };
  let shot = null;
  let captureNow = false;

  const stagePoint = () => worldData.stage;

  function takePhoto() {
    if (!canStart()) return;
    const { x, z } = stagePoint();
    setScreen(SCREEN.PHOTO);
    unlockCamera(true);
    shot = { x, z, phase: 'gather', t: 0, count: 0 };
    squad.arrange(squad.actors.map((actor) => ({
      actor,
      x: x + PHOTO_SPOTS[actor.id][0],
      z: z + PHOTO_SPOTS[actor.id][1],
      yaw: 0,
      pose: PHOTO_POSES[actor.id],
    })));
  }

  function updateShot(dt) {
    shot.t += dt;
    if (shot.phase === 'gather' && (squad.allPlaced || shot.t > 6.5)) {
      squad.snapToSpots();
      squad.actors.forEach((actor) => (actor.lookOverride = camera.position));
      shot.phase = 'count';
      shot.t = 0;
      shot.count = 0;
      squad.strikePoses();
    } else if (shot.phase === 'count') {
      const left = 3 - Math.floor(shot.t);
      if (left !== shot.count && left > 0) {
        shot.count = left;
        ui.countdown(left);
        sounds.tick();
      }
      if (shot.t >= 3) {
        ui.countdown('');
        shot.phase = 'done';
        captureNow = true;
      }
    }
  }

  function capture() {
    captureNow = false;
    const picture = composePhoto(renderer.domElement, 'Keluarga MYDOGG');
    sounds.shutter();
    ui.flash();
    setTimeout(() => ui.showPhoto(picture), 420);
  }

  function endPhoto() {
    if (screen !== SCREEN.PHOTO) return;
    shot = null;
    captureNow = false;
    ui.countdown('');
    squad.release();
    unlockCamera(false);
    setScreen(SCREEN.FREE);
    goalDistance = closeUp ? CLOSE_DISTANCE[active.isDog ? 'dog' : 'person'] : overviewDistance();
    zooming = true;
  }

  // Pesta: semua pakai topi pesta, Bapak membawa kue, konfeti turun, lagu ulang tahun berbunyi.
  const PARTY_SPOTS = {
    bapak: [0, -0.5, 0, 'cake'], mama: [-1, -0.35, 0.3, 'dance'],
    kitty: [-1.15, 0.5, 0.3, 'beg'], jenges: [-0.38, 0.62, 0.1, 'bow'], gemoy: [0.42, 0.72, -0.1, 'beg'], pompom: [1.15, 0.42, -0.3, 'beg'],
  };
  let party = null;

  function startParty() {
    if (!canStart()) return;
    const { x, z } = stagePoint();
    party = { t: 0, length: 0, posed: false, hats: new Map() };
    squad.actors.forEach((actor) => {
      party.hats.set(actor, actor.wardrobe.state.head);
      actor.wardrobe.wear('head', 'party');
    });
    setScreen(SCREEN.PARTY);
    squad.arrange(squad.actors.map((actor) => {
      const [dx, dz, yaw, pose] = PARTY_SPOTS[actor.id];
      return { actor, x: x + dx, z: z + dz, yaw, pose, loop: actor.id === 'mama' };
    }));
  }

  function updateParty(dt) {
    party.t += dt;
    if (!party.posed && (squad.allPlaced || party.t > 4)) {
      party.posed = true;
      squad.snapToSpots();
      squad.strikePoses();
      music.pause(true);
      party.length = party.t + sounds.birthday() + 1;
      fx.celebrate(party.length - party.t);
      bubbles.say(squad.byId('mama'), 'Hore, tiup lilinnya!', 4);
      bubbles.say(squad.byId('bapak'), 'Ayo makan kue!', 4);
      bubbles.say(squad.byId('jenges'), 'Guk guk guk!', 3);
    }
    if (party.posed && party.t > party.length) endParty();
  }

  /** Mengakhiri pesta: topi dikembalikan, musik latar lanjut, semua bebas lagi. */
  function endParty() {
    if (screen !== SCREEN.PARTY) return;
    party.hats.forEach((hat, actor) => actor.wardrobe.wear('head', hat));
    party = null;
    fx.stopCelebrate();
    sounds.stopSong();
    squad.release();
    music.pause(false);
    setScreen(SCREEN.FREE);
    ui.showActor(active);
  }

  // Permainan dari menu Main
  const games = createGames({
    squad, sounds, bubbles, fx, scene, music,
    get ui() {
      return ui;
    },
    lights: { hemi, key, rim },
    world: () => worldData,
    bounds: () => world,
    onEnd: () => {
      squad.release();
      delete document.documentElement.dataset.game;
      setScreen(SCREEN.FREE);
      goalDistance = closeUp ? CLOSE_DISTANCE[active.isDog ? 'dog' : 'person'] : overviewDistance();
      zooming = true;
      ui.showActor(active);
    },
  });

  function play(id) {
    if (id === 'party') {
      startParty();
      return;
    }
    if (!GAMES.some((g) => g.id === id) || !canStart()) return;
    // Hujan hanya di taman.
    if (id === 'rain' && themeId !== 'garden') {
      setTheme('garden');
      ui.syncTheme('garden');
    }
    document.documentElement.dataset.game = id;
    setScreen(SCREEN.GAME, GAMES.find((g) => g.id === id));
    games.start(id);
  }

  const app = {
    squad,
    games: GAMES,
    play,
    stopGame: () => games.stop(),
    chorus: () => {
      squad.dogs.forEach((dog, i) => {
        setTimeout(() => {
          sounds.howl(dog.breed.voice);
          dog.express('happy');
          bubbles.say(dog, 'Auuuu~', 2);
        }, i * 380);
      });
      discover('chorus');
    },
    takePhoto,
    endPhoto,
    party: startParty,
    setMusic: (value) => music.set(value),
    setSound: (value) => setMuted(!value),
    setChat: (value) => bubbles.setEnabled(value),
    enter: () => {
      music.set(document.getElementById('music').checked);
      // Masuk dari jauh lalu mendekat, dan semua menyapa.
      tmp.subVectors(camera.position, controls.target).multiplyScalar(1.5);
      camera.position.copy(controls.target).add(tmp);
      zooming = true;
      squad.dogs.forEach((dog, i) => {
        setTimeout(() => {
          dog.express('bark');
          sounds.bark(dog.breed.voice);
          bubbles.say(dog, 'Guk!', 1.6);
        }, 650 + i * 280);
      });
      squad.people.forEach((person) => {
        squad.command(person, 'wave');
        person.brain.timer = 5;
      });
      setTimeout(() => {
        bubbles.say(squad.byId('mama'), 'Halo, sini masuk!', 3);
        ui.say('Ketuk lantai untuk mengajak jalan. Ketuk TV atau mainan, dan coba suruh anjing naik sofa.', 6500);
      }, 1900);
    },
    themes: THEMES,
    get active() {
      return active;
    },
    select: (id) => selectActor(squad.byId(id)),
    command: (poseId) => {
      if (poseId === 'sofa') {
        const result = squad.climbSofa(active);
        if (result === 'none') ui.say('Sofanya ada di Rumah.', 2400);
        if (result === 'full') ui.say('Sofanya sudah penuh.', 2400);
        return;
      }
      squad.command(active, poseId);
      if (poseId === 'jump') sounds.whimper(active.breed.voice);
    },
    express: (name) => active.express(name),
    wear: (slot, id) => active.wardrobe.wear(slot, id),
    applyLook: (key) => squad.applyLook(key),
    setTheme: (id) => {
      setTheme(id);
      const tips = {
        room: 'Ketuk TV untuk ganti saluran, ketuk mainan supaya anjing datang bermain.',
        garden: 'Taman ini luas. Ketuk rumput untuk mengajak jalan, atau pakai tombol panah.',
        night: 'Selamat datang di bulan! Di sini gravitasinya rendah, coba Lompat putar.',
      };
      ui.say(tips[id], 5500);
    },
    setRoaming: (value) => {
      squad.autoRoam = value;
    },
    setCloseUp,
    enterPet,
    leavePet,
    bark: () => {
      active.express('bark');
      sounds.bark(active.breed.voice);
    },
    throwBall: () => {
      const spread = world.roomy ? 3.2 : 1;
      const center = world.roomy ? active.position : { x: 0, z: 0 };
      const x = THREE.MathUtils.clamp(center.x + (Math.random() - 0.5) * (4.8 - 1.4) * spread, -world.walkX, world.walkX);
      const z = THREE.MathUtils.clamp(center.z + (Math.random() - 0.2) * (3.4 - 1.2) * 0.8 * spread, -world.walkZ, world.walkZ);
      squad.throwBall(x, z);
      sounds.squeak();
    },
    feed: () => {
      const dog = active;
      const spot = squad.feed(dog);
      treat = dog;
      treatTimer = 1.4;
      treatMesh.position.copy(spot);
      treatMesh.position.y = 0.03;
      treatMesh.visible = true;
      sounds.crunch();
    },
    talk: () => {
      activeTalker = active;
      squad.command(active, 'sit');
      repeater.start(active.breed.voice);
    },
    personAction: (id) => {
      const person = active;
      if (id === 'call') {
        squad.command(person, 'wave');
        squad.callDogs(person);
        sounds.hello();
        bubbles.say(person, 'Sini, semua!');
        ui.say(`${person.name} memanggil. Semua anjing datang!`);
      } else if (id === 'sofa') {
        const result = squad.climbSofa(person);
        if (result === 'none') ui.say('Sofanya ada di Rumah.', 2400);
        if (result === 'full') ui.say('Sofanya sudah penuh.', 2400);
      } else if (id === 'pet') {
        squad.petNearest(person);
      } else if (id === 'walk') {
        squad.command(person, 'walk');
      } else {
        squad.command(person, id);
        if (id === 'cake') squad.callDogs(person);
        sounds.hello();
      }
    },
    order: (dogId, action) => {
      const dogs = dogId === 'all' ? squad.dogs : [squad.byId(dogId)];
      squad.order(active, dogs, action);
      sounds.hello();
      const who = dogId === 'all' ? 'Semua anjing' : dogs[0].name;
      const shout = { come: 'Sini!', sit: 'Duduk!', shake: 'Salam dulu!', bark: 'Gonggong!' }[action];
      bubbles.say(active, dogId === 'all' ? `${shout}` : `${dogs[0].name}, ${shout.toLowerCase()}`, 2.2);
      const text = { come: 'datang', sit: 'duduk', shake: 'salaman', bark: 'menggonggong' }[action];
      ui.say(`${who} ${text} di depan ${active.name}.`);
    },
    setPanelInset: (right, bottom) => {
      viewInset.right = right;
      viewInset.bottom = bottom;
      resize();
    },
  };

  ui = createUI(app);
  // Status yang bisa dibaca dari luar (tes otomatis, alat bantu, agen) tanpa membuka kode.
  document.documentElement.dataset.screen = SCREEN.FREE;
  document.documentElement.dataset.active = active.id;
  const skipIntro = location.search.includes('debug');
  setTheme(themeId);
  ui.showActor(active);
  resize();
  camera.position.set(0, 3, 6.4).normalize().multiplyScalar(goalDistance).add(controls.target);
  controls.update();
  key.target.updateMatrixWorld();

  // Foto kecil Mama dan Bapak di tombol diambil dari boneka rajutnya sendiri, bukan foto asli.
  function snapshot(person) {
    const source = renderer.domElement;
    if (!source.width || !source.height) return false;
    const portrait = new THREE.PerspectiveCamera(20 / Math.min(1, camera.aspect), camera.aspect, 0.1, 10);
    person.update(0.016, 0);
    person.root.updateMatrixWorld(true);
    person.headWorld(tmp);
    const away = 1.5 * (person.data.height / 1.25);
    portrait.position.set(tmp.x + Math.sin(person.yaw) * away, tmp.y + 0.05, tmp.z + Math.cos(person.yaw) * away);
    portrait.lookAt(tmp);
    const others = squad.actors.filter((a) => a !== person);
    others.forEach((a) => (a.root.visible = false));
    room.group.visible = false;
    renderer.render(scene, portrait);
    const size = Math.min(source.width, source.height);
    const crop = document.createElement('canvas');
    crop.width = crop.height = 160;
    crop.getContext('2d').drawImage(source, (source.width - size) / 2, (source.height - size) / 2, size, size, 0, 0, 160, 160);
    others.forEach((a) => (a.root.visible = true));
    room.group.visible = true;
    ui.setAvatar(person.id, crop.toDataURL('image/png'));
    return true;
  }
  // Kalau layar belum punya ukuran (misalnya dibuka di tab latar belakang), coba lagi saat sudah tampil.
  let avatarsReady = squad.people.every(snapshot);

  if (reducedMotion) squad.autoRoam = false;
  ui.syncRoaming(squad.autoRoam);
  ui.setFound(found.size, EGG_COUNT);
  if (skipIntro) ui.skipIntro();
  else ui.ready();

  // Pemeriksaan performa: buka situs dengan ?debug
  // Untuk pengujian dan agen: buka situs dengan ?debug. state() memberi gambaran lengkap yang mudah dibaca.
  if (location.search.includes('debug')) {
    window.mydogg = {
      app, renderer, camera, controls, squad, scene, room,
      get pet() {
        return pet;
      },
      state: () => ({
        screen,
        game: games.id,
        theme: themeId,
        active: active.id,
        closeUp,
        found: found.size,
        actors: squad.actors.map((a) => ({
          id: a.id,
          mode: a.brain.mode,
          pose: a.poseName,
          seat: Boolean(a.brain.seat),
          queued: Boolean(a.brain.queued),
          at: [+a.position.x.toFixed(2), +a.position.y.toFixed(2), +a.position.z.toFixed(2)],
        })),
      }),
    };
  }

  // Turunkan resolusi kalau perangkat kewalahan, supaya gerak tetap halus.
  let frameSum = 0;
  let frameCount = 0;
  function watchPerformance(dt) {
    frameSum += dt;
    frameCount++;
    if (frameCount < 90) return;
    const average = frameSum / frameCount;
    frameSum = 0;
    frameCount = 0;
    if (average > 1 / 42 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
  }

  const clock = new THREE.Clock();
  let time = 0;

  /** Satu langkah dunia. Putaran animasi memanggilnya setiap gambar; tes bisa memanggilnya langsung. */
  function frame(raw) {
    const dt = Math.min(raw, 1 / 20);
    time += dt;

    if (screen === SCREEN.PHOTO && shot) updateShot(dt);
    if (screen === SCREEN.PARTY) updateParty(dt);
    games.update(dt);
    lookPoint.lerp(lookGoal, 1 - Math.exp(-6 * dt));
    updateSteer();
    squad.update(dt, time, lookPoint);
    ball.update(dt);
    ui.syncPose(active.poseName);

    if (treat) {
      treatTimer -= dt;
      treatMesh.scale.setScalar(Math.max(0.01, Math.min(1, treatTimer * 2)));
      if (treatTimer <= 0) {
        treat.express('happy');
        treat = null;
        treatMesh.visible = false;
        treatMesh.scale.setScalar(1);
      }
    }

    updateCamera(dt);
    room.update(time, camera.position, controls.target);
    updateShadowCenter();
    if (!avatarsReady) avatarsReady = squad.people.every(snapshot);
    fx.update(dt, time, active, controls.target, screen === SCREEN.FREE);
    renderer.render(scene, camera);
    // Jepret menunggu sampai layar benar-benar tampil (misalnya setelah kembali dari aplikasi lain).
    if (captureNow && renderer.domElement.width && renderer.domElement.height) capture();
    bubbles.update(dt, squad.actors);
  }

  // Satu error tidak boleh menghentikan putaran animasi, karena situs akan membeku selamanya.
  let lastError = '';
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    watchPerformance(raw);
    try {
      frame(raw);
    } catch (error) {
      if (String(error) !== lastError) console.error(error);
      lastError = String(error);
    }
  });

  // Mode debug: majukan waktu secara pasti, tanpa bergantung pada kecepatan layar.
  if (window.mydogg) {
    window.mydogg.step = (seconds = 1, fps = 30) => {
      for (let i = 0; i < Math.round(seconds * fps); i++) frame(1 / fps);
      return window.mydogg.state();
    };
  }
}

// Tunda sedikit supaya layar pembuka sempat tampil sebelum boneka dirajut.
setTimeout(() => {
  try {
    start();
  } catch (error) {
    console.error(error);
    document.getElementById('intro')?.remove();
    document.getElementById('no-webgl').hidden = false;
  }
}, 40);
