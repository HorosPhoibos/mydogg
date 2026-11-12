// Permainan keluarga: petak umpet, peragaan busana, joget disko, dan hujan di taman.
// Setiap permainan berjalan di mode layar 'game' (lihat SCREEN di main.js) dan selalu
// dibereskan lewat stop(): tokoh dilepas, lampu dan musik dikembalikan, benda tambahan dibuang.

import * as THREE from 'three';
import { Loft } from './yarn/loft.js';
import { plush, createBurst } from './world/common.js';
import { OUTFITS, NECKWEAR, HEADWEAR, EYEWEAR, BACKWEAR } from './dog/wardrobe.js';

export const GAMES = [
  { id: 'hide', label: 'Petak umpet', about: 'Anjing-anjing bersembunyi. Temukan dan ketuk mereka secepat mungkin.' },
  { id: 'show', label: 'Peragaan busana', about: 'Satu per satu berlenggak-lenggok dengan baju acak, Mama dan Bapak bertepuk tangan.' },
  { id: 'disco', label: 'Joget disko', about: 'Lampu warna-warni, bola disko, dan semua berjoget.' },
  { id: 'rain', label: 'Hujan di taman', about: 'Berteduh di bawah payung, lalu mengibaskan badan dan melihat pelangi.' },
  { id: 'party', label: 'Pesta ulang tahun', about: 'Topi pesta, kue berlilin, konfeti, dan lagu ulang tahun.' },
];

const HIDE_RECORD_KEY = 'mydogg-petak-umpet';
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

function readRecord() {
  try {
    return Number(localStorage.getItem(HIDE_RECORD_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveRecord(seconds) {
  try {
    localStorage.setItem(HIDE_RECORD_KEY, String(seconds));
  } catch {
    // Penyimpanan diblokir: rekor tidak disimpan, permainan tetap jalan.
  }
}

/**
 * @param {object} env
 *   squad, sounds, bubbles, ui (getter), fx, scene, lights {hemi, key, rim}, music,
 *   world() data dunia aktif, bounds() ukuran dunia, onEnd() dipanggil saat permainan selesai.
 */
export function createGames(env) {
  const { squad, sounds, bubbles, fx, scene } = env;
  // ui dibuat setelah modul ini, jadi selalu diambil lewat env saat dipakai.
  const ui = {
    gameBar: (text) => env.ui.gameBar(text),
    blink: (fn) => env.ui.blink(fn),
  };
  // view berisi sudut tetap untuk pertunjukan; null berarti pengguna bebas memutar kamera.
  const FRONT = { azimuth: 0, elevation: 0.3 };
  const cam = { target: new THREE.Vector3(), distance: 9, view: null };
  const burst = createBurst(scene, 120);
  let game = null;
  let timers = [];
  let cleanups = [];

  /** Jalankan fn setelah beberapa detik waktu permainan. Semua dibatalkan saat stop(). */
  const after = (seconds, fn) => {
    if (game) timers.push({ at: game.t + seconds, fn });
  };
  const onStop = (fn) => cleanups.push(fn);

  function stage() {
    return env.world().stage;
  }

  // ---------- Lampu: diredupkan lalu dikembalikan persis seperti semula ----------
  function dimLights(factor) {
    const { hemi, key, rim } = env.lights;
    const saved = [hemi.intensity, key.intensity, rim.intensity, scene.environmentIntensity];
    hemi.intensity *= factor;
    key.intensity *= factor;
    rim.intensity *= factor;
    scene.environmentIntensity *= factor;
    onStop(() => {
      [hemi.intensity, key.intensity, rim.intensity, scene.environmentIntensity] = saved;
    });
  }

  function addToScene(object) {
    scene.add(object);
    onStop(() => scene.remove(object));
    return object;
  }

  // ---------- Petak umpet ----------
  function hideSpots() {
    const data = env.world();
    const { walkX, walkZ } = env.bounds();
    const obstacles = data.obstacles ?? [];
    const candidates = [
      ...obstacles.filter((o) => o.r >= 0.24).map((o) => ({ x: o.x, z: o.z - (o.r + 0.45) })),
      ...(data.hideSpots ?? []),
    ].filter((s) => Math.abs(s.x) < walkX && Math.abs(s.z) < walkZ && obstacles.every((o) => Math.hypot(o.x - s.x, o.z - s.z) > o.r + 0.3));
    const chosen = [];
    for (const spot of shuffle(candidates)) {
      if (chosen.every((c) => Math.hypot(c.x - spot.x, c.z - spot.z) > 1.3)) chosen.push(spot);
      if (chosen.length === squad.dogs.length) break;
    }
    // Cadangan kalau dunia ini kurang tempat sembunyi.
    while (chosen.length < squad.dogs.length) {
      chosen.push({ x: (Math.random() * 2 - 1) * walkX * 0.8, z: -walkZ * (0.3 + Math.random() * 0.5) });
    }
    return chosen;
  }

  function startHide() {
    const s = stage();
    game.found = new Set();
    game.phase = 'hiding';
    game.nextHint = 14;
    ui.gameBar('Tutup mata dulu... anjing-anjing sedang bersembunyi.');
    bubbles.say(squad.byId('mama'), 'Satu... dua... tiga...', 2.5);
    sounds.tick();
    ui.blink(() => {
      if (!game) return;
      const { walkX, walkZ } = env.bounds();
      const spots = hideSpots();
      squad.arrange([
        ...squad.dogs.map((dog, i) => ({ actor: dog, x: spots[i].x, z: spots[i].z, yaw: Math.random() * Math.PI * 2, pose: pick(['sploot', 'sleep', 'sit']) })),
        // Mama dan Bapak menunggu di pinggir depan supaya tidak menutupi tempat sembunyi.
        { actor: squad.byId('mama'), x: -walkX * 0.82, z: walkZ * 0.72, yaw: Math.PI * 0.75, pose: 'idle' },
        { actor: squad.byId('bapak'), x: walkX * 0.82, z: walkZ * 0.72, yaw: -Math.PI * 0.75, pose: 'idle' },
      ]);
      squad.snapToSpots();
      squad.strikePoses();
      game.phase = 'seek';
      game.started = game.t;
      cam.target.set(s.x, 0.4, s.z - 0.6);
      cam.distance = walkX > 6 ? 16 : 11.5;
      bubbles.say(squad.byId('bapak'), 'Siap? Cari mereka!', 2.5);
    });
  }

  function updateHide() {
    if (game.phase !== 'seek') return;
    const elapsed = Math.floor(game.t - game.started);
    ui.gameBar(`Cari anjing yang bersembunyi! Ketemu ${game.found.size} dari ${squad.dogs.length} · ${elapsed} detik`);
    if (game.t - game.started > game.nextHint) {
      game.nextHint += 12;
      const hiding = squad.dogs.filter((dog) => !game.found.has(dog));
      const dog = pick(hiding);
      dog.express('bark');
      sounds.bark(dog.breed.voice);
      bubbles.say(dog, 'Guk! Di sini!', 2);
    }
  }

  function foundDog(dog) {
    game.found.add(dog);
    squad.perform(dog, 'jump', { hold: 4 });
    dog.express('happy');
    sounds.bark(dog.breed.voice);
    bubbles.say(dog, 'Yah, ketahuan!', 2);
    if (game.found.size < squad.dogs.length) return;

    const seconds = Math.max(1, Math.round(game.t - game.started));
    const record = readRecord();
    const isRecord = !record || seconds < record;
    if (isRecord) saveRecord(seconds);
    game.phase = 'done';
    ui.gameBar(isRecord ? `Ketemu semua dalam ${seconds} detik. Rekor baru!` : `Ketemu semua dalam ${seconds} detik. Rekor: ${record} detik.`);
    fx.celebrate(4);
    sounds.applause(2.5);
    squad.perform(squad.byId('mama'), 'thumbs', { hold: 5 });
    squad.perform(squad.byId('bapak'), 'wave', { hold: 5 });
    bubbles.say(squad.byId('mama'), isRecord ? 'Hebat, rekor baru!' : 'Pinter, ketemu semua!', 3);
    after(5, stop);
  }

  // ---------- Peragaan busana ----------
  const pickOf = (items, chance) => (Math.random() < chance ? pick(items.filter((i) => i.id !== 'none')).id : 'none');

  function dressUp(dog) {
    const look = {
      outfit: pick(OUTFITS.filter((o) => o.id !== 'none')).id,
      neck: pickOf(NECKWEAR, 0.6),
      head: pickOf(HEADWEAR, 0.6),
      face: pickOf(EYEWEAR, 0.35),
      back: pickOf(BACKWEAR, 0.3),
    };
    dog.wardrobe.apply(look);
    return OUTFITS.find((o) => o.id === look.outfit).label;
  }

  function startShow() {
    const s = stage();
    const spot = addToScene(new THREE.SpotLight(0xfff1d6, 40, 12, 0.34, 0.6, 1.2));
    spot.position.set(s.x, 3.6, s.z + 2.4);
    addToScene(spot.target);
    game.spot = spot;
    dimLights(0.6);
    ui.gameBar('Peragaan busana dimulai!');
    squad.arrange([
      // Penonton di kiri dan kanan, cukup jauh supaya tidak menutupi kamera.
      { actor: squad.byId('mama'), x: s.x - 2.3, z: s.z + 0.2, yaw: Math.PI / 2 - 0.35, pose: 'clap' },
      { actor: squad.byId('bapak'), x: s.x + 2.3, z: s.z + 0.2, yaw: -Math.PI / 2 + 0.35, pose: 'clap' },
      // Barisan tunggu di belakang panggung.
      ...squad.dogs.map((dog, i) => ({ actor: dog, x: s.x - 0.95 + i * 0.63, z: s.z - 1.0, yaw: 0, pose: 'sit' })),
    ]);
    game.phase = 'gather';
    game.turn = -1;
  }

  function walkRunway(i) {
    const s = stage();
    const dog = squad.dogs[i];
    if (!dog) {
      finaleShow();
      return;
    }
    game.turn = i;
    const label = dressUp(dog);
    ui.gameBar(`${dog.name} memakai ${label.toLowerCase()}`);
    bubbles.say(dog, pick(['Lihat gayaku!', 'Cantik kan?', 'Ini baju baru!', 'Model papan atas!']), 2.4);
    squad.moveTo(dog, s.x, s.z + 1.3, {
      speed: dog.walkSpeed * 1.05,
      then: () => squad.faceTo(dog, 0, () => {
        squad.perform(dog, pick(['beg', 'bow', 'shake']), { hold: 3 });
        dog.express('happy');
        sounds.applause(1.6);
        bubbles.say(squad.byId(i % 2 ? 'bapak' : 'mama'), pick(['Keren!', 'Wah, cantik!', 'Bravo!', 'Gaya banget!']), 2);
        after(2.8, () => {
          squad.moveTo(dog, s.x - 1.2 + i * 0.8, s.z + 2.2, {
            then: () => squad.faceTo(dog, 0, () => squad.perform(dog, 'sit', { hold: 1e9 })),
          });
          after(1.2, () => walkRunway(i + 1));
        });
      }),
    });
  }

  function finaleShow() {
    game.turn = -1;
    game.phase = 'finale';
    ui.gameBar('Tadaa! Semua tampil memukau.');
    squad.dogs.forEach((dog) => {
      dog.express('happy');
      bubbles.say(dog, 'Tadaa!', 2);
    });
    squad.perform(squad.byId('mama'), 'thumbs', { hold: 5 });
    squad.perform(squad.byId('bapak'), 'thumbs', { hold: 5 });
    sounds.applause(3);
    fx.celebrate(4);
    after(5, stop);
  }

  function updateShow(dt) {
    if (game.phase === 'gather' && (squad.allPlaced || game.t > 5)) {
      squad.snapToSpots();
      squad.strikePoses();
      squad.byId('mama').brain.loop = true;
      squad.byId('bapak').brain.loop = true;
      game.phase = 'walk';
      walkRunway(0);
    }
    const dog = squad.dogs[game.turn];
    const s = stage();
    if (dog) {
      dog.chestWorld(cam.target);
      cam.target.y += 0.15;
      cam.distance = 5.4;
    } else {
      cam.target.set(s.x, 0.6, s.z + 1.6);
      cam.distance = 7;
    }
    game.spot.target.position.lerp(cam.target, 1 - Math.exp(-6 * dt));
  }

  // ---------- Joget disko ----------
  function buildDiscoBall() {
    const group = new THREE.Group();
    const ball = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32, 2),
      new THREE.MeshStandardMaterial({ color: 0xe6e8f0, metalness: 0.95, roughness: 0.18, flatShading: true }),
    );
    group.add(ball);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    cord.position.y = 1;
    group.add(cord);
    return group;
  }

  function startDisco() {
    const s = stage();
    const ball = addToScene(buildDiscoBall());
    ball.position.set(s.x, 2.05, s.z - 0.4);
    game.ball = ball;
    dimLights(0.16);
    game.spots = [0xff4fa3, 0x3fd0ff, 0xffd23f].map((color, i) => {
      const light = addToScene(new THREE.SpotLight(color, 90, 12, 0.42, 0.45, 1.2));
      light.position.set(s.x + Math.cos(i * 2.1) * 2.4, 3.4, s.z + Math.sin(i * 2.1) * 2.4);
      addToScene(light.target);
      return light;
    });
    env.music.pause(true);
    onStop(() => env.music.pause(false));
    const stopBeat = sounds.disco(15);
    onStop(stopBeat);
    const dancers = {
      mama: [-1.3, -0.5, 'dance'], bapak: [1.3, -0.5, 'dance'],
      kitty: [-1.15, 0.45, 'beg'], jenges: [-0.38, 0.8, 'bow'], gemoy: [0.38, 0.8, 'beg'], pompom: [1.15, 0.45, 'jump'],
    };
    squad.arrange(squad.actors.map((actor) => {
      const [dx, dz, pose] = dancers[actor.id];
      return { actor, x: s.x + dx, z: s.z + dz, yaw: 0, pose, loop: true };
    }));
    game.phase = 'gather';
    ui.gameBar('Joget disko! Ayo semua goyang.');
    cam.target.set(s.x, 0.95, s.z);
    cam.distance = 7.8;
  }

  function updateDisco(dt) {
    const s = stage();
    if (game.phase === 'gather' && (squad.allPlaced || game.t > 4)) {
      squad.snapToSpots();
      squad.strikePoses();
      game.phase = 'dance';
      game.danceStart = game.t;
      bubbles.say(squad.byId('jenges'), 'Ayo joget!', 2);
      after(13, () => {
        fx.celebrate(3);
        sounds.applause(2);
        ui.gameBar('Seru banget! Joget selesai.');
        after(3, stop);
      });
    }
    game.ball.rotation.y += dt * 1.6;
    game.spots.forEach((light, i) => {
      const a = game.t * (0.9 + i * 0.3) + i * 2.1;
      light.target.position.set(s.x + Math.cos(a) * 1.8, 0, s.z + Math.sin(a * 1.3) * 1.4);
      light.intensity = 90 * (0.7 + 0.3 * Math.sin(game.t * 9 + i));
    });
  }

  // ---------- Hujan di taman ----------
  function buildRain() {
    const count = 700;
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.22, 4),
      new THREE.MeshBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.6 }),
      count,
    );
    mesh.frustumCulled = false;
    const drops = Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 16, y: Math.random() * 7, z: (Math.random() - 0.5) * 12 }));
    return { mesh, drops };
  }

  let rainbow = null;
  function buildRainbow() {
    const group = new THREE.Group();
    [0xd9403b, 0xf08a2c, 0xf5c518, 0x5f9e3d, 0x2c6eb8, 0x7c5cc4].forEach((color, i) => {
      const R = 3.4 - i * 0.3;
      const stations = [];
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI;
        stations.push({ p: [Math.cos(a) * R, Math.sin(a) * R, 0], rx: 0.1, ry: 0.15 });
      }
      plush(group, new Loft(stations, { side: [0, 0, 1], capStart: 0.3, capEnd: 0.3 }), () => color, { w: 0.09, h: 0.08, depth: 0.05, coreRows: 50 });
    });
    return group;
  }

  function startRain() {
    const s = stage();
    game.rain = buildRain();
    addToScene(game.rain.mesh);
    dimLights(0.5);
    document.documentElement.dataset.weather = 'rain';
    onStop(() => delete document.documentElement.dataset.weather);
    const stopRain = sounds.rain(12);
    onStop(stopRain);
    env.music.pause(true);
    onStop(() => env.music.pause(false));

    const mama = squad.byId('mama');
    const bapak = squad.byId('bapak');
    mama.setUmbrella(true);
    bapak.setUmbrella(true);
    onStop(() => {
      mama.setUmbrella(false);
      bapak.setUmbrella(false);
    });
    // Dua anjing berteduh di dekat Mama, dua di dekat Bapak.
    const shelter = [
      { actor: mama, x: s.x - 0.9, z: s.z - 0.2, yaw: 0, pose: 'umbrella' },
      { actor: bapak, x: s.x + 0.9, z: s.z - 0.2, yaw: 0, pose: 'umbrella' },
      ...squad.dogs.map((dog, i) => {
        const owner = i < 2 ? -0.9 : 0.9;
        const side = i % 2 ? 0.36 : -0.36;
        return { actor: dog, x: s.x + owner + side, z: s.z + 0.32, yaw: 0, pose: 'sit' };
      }),
    ];
    squad.arrange(shelter);
    game.phase = 'gather';
    ui.gameBar('Hujan turun! Semua berteduh.');
    bubbles.say(mama, 'Hujan! Sini neduh.', 2.5);
    cam.target.set(s.x, 0.7, s.z);
    cam.distance = 7.5;
  }

  function updateRain(dt) {
    const s = stage();
    if (game.phase === 'gather' && (squad.allPlaced || game.t > 5)) {
      squad.snapToSpots();
      squad.strikePoses();
      game.phase = 'pouring';
      bubbles.say(pick(squad.dogs), 'Brr, dingin!', 2);
      after(7, () => {
        game.phase = 'sunny';
        game.rain.mesh.visible = false;
        delete document.documentElement.dataset.weather;
        squad.byId('mama').setUmbrella(false);
        squad.byId('bapak').setUmbrella(false);
        squad.perform(squad.byId('mama'), 'wave', { hold: 4 });
        squad.perform(squad.byId('bapak'), 'thumbs', { hold: 4 });
        squad.dogs.forEach((dog, i) => {
          after(i * 0.25, () => {
            dog.express('shakeOff');
            const p = dog.position;
            burst.emit({ x: p.x, y: 0.4, z: p.z, amount: 14, colors: [0xd8ecff, 0x9fd0f0], speed: 1.3, up: 0.8, gravity: 5, life: 0.8, size: 0.035 });
          });
        });
        if (!rainbow) rainbow = buildRainbow();
        rainbow.position.set(s.x, 0, s.z - 6);
        rainbow.scale.setScalar(0.01);
        addToScene(rainbow);
        game.rainbowGrow = 0;
        ui.gameBar('Hujan reda... ada pelangi!');
        bubbles.say(squad.byId('mama'), 'Lihat, pelangi!', 3);
        after(8, stop);
      });
    }
    if (game.phase === 'pouring' || game.phase === 'gather') {
      const { mesh, drops } = game.rain;
      const m = new THREE.Matrix4();
      drops.forEach((drop, i) => {
        drop.y -= dt * 7;
        if (drop.y < 0) {
          drop.y = 6 + Math.random();
          drop.x = (Math.random() - 0.5) * 16;
          drop.z = (Math.random() - 0.5) * 12;
        }
        m.makeTranslation(s.x + drop.x, drop.y, s.z + drop.z);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (game.phase === 'sunny' && rainbow) {
      game.rainbowGrow = Math.min(1, game.rainbowGrow + dt * 0.7);
      const e = game.rainbowGrow;
      rainbow.scale.setScalar(Math.max(0.01, e * e * (3 - 2 * e)));
      cam.target.set(s.x, 1.2, s.z - 1.5);
      cam.distance = 10;
    }
  }

  // ---------- Siklus hidup ----------
  const STARTERS = { hide: startHide, show: startShow, disco: startDisco, rain: startRain };
  const UPDATERS = { hide: updateHide, show: updateShow, disco: updateDisco, rain: updateRain };

  function stop() {
    if (!game) return;
    game = null;
    timers = [];
    cleanups.splice(0).reverse().forEach((fn) => fn());
    ui.gameBar(null);
    env.onEnd();
  }

  return {
    get id() {
      return game?.id ?? null;
    },
    /** Sasaran kamera selama permainan, atau null kalau kamera bebas. */
    get camera() {
      return game ? cam : null;
    },
    start(id) {
      game = { id, t: 0, phase: 'start' };
      timers = [];
      const s = stage();
      cam.target.set(s.x, 0.6, s.z);
      cam.distance = 8;
      cam.view = id === 'hide' ? null : FRONT;
      STARTERS[id]();
    },
    stop,
    update(dt) {
      burst.update(dt);
      if (!game) return;
      game.t += dt;
      // Pengatur waktu dijalankan sesudah ditambah, karena fn bisa menambah pengatur waktu baru.
      const due = timers.filter((timer) => timer.at <= game.t);
      timers = timers.filter((timer) => timer.at > game.t);
      due.forEach((timer) => game && timer.fn());
      if (game) UPDATERS[game.id](dt);
    },
    /** Ketukan pada tokoh selama permainan. Mengembalikan true kalau ketukan dipakai permainan. */
    onActorTap(actor) {
      if (!game) return false;
      if (game.id === 'hide' && game.phase === 'seek' && actor.isDog && !game.found.has(actor)) {
        foundDog(actor);
      }
      return true;
    },
  };
}
