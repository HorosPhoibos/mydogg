// Otak keluarga: siapa jalan ke mana, siapa mengejar bola, dan kapan pose berganti.

import * as THREE from 'three';
import { Dog } from './dog.js';
import { BREEDS, PHOTO_LOOKS } from './breeds.js';
import { Person, PEOPLE } from '../people/people.js';
import { THEMES } from '../world/room.js';

/**
 * Mode otak tokoh. Setiap tokoh selalu berada di tepat satu mode:
 *   REST     diam berpose sampai brain.timer habis, lalu memilih kegiatan berikutnya
 *   GO       berjalan ke brain.target, lalu menjalankan brain.then
 *   TURN     berbalik di tempat ke brain.faceYaw, lalu menjalankan brain.then
 *   HOP      melompat atau bergeser naik-turun sofa; tidak bisa dipotong, perintah baru diantre
 *   DRIVEN   dikendalikan tombol panah
 *   PATTING  Mama atau Bapak sedang mengelus brain.patDog
 *   EAT      makan camilan; diperlakukan seperti REST
 *   FOLLOW   mengejar brain.follow (teman yang sedang lari)
 * Penanda sementara (then, chasing, arrive, toSofa, barks, loop, patDog, follow, reserved) hanya berlaku
 * untuk satu aksi. Semuanya dibersihkan oleh #interrupt setiap kali aksi baru dimulai.
 */
export const MODE = Object.freeze({
  REST: 'rest',
  GO: 'go',
  TURN: 'turn',
  HOP: 'hop',
  DRIVEN: 'driven',
  PATTING: 'patting',
  EAT: 'eat',
  FOLLOW: 'follow',
});

const TURN_RATE = 3.4;
const v = new THREE.Vector3();
const { clamp, smoothstep } = THREE.MathUtils;

const angleTo = (from, x, z) => Math.atan2(x - from.x, z - from.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const dist2 = (p, x, z) => (p.x - x) ** 2 + (p.z - z) ** 2;

export class Squad {
  constructor(scene, quality, ball, audio) {
    this.ball = ball;
    this.audio = audio;
    this.autoRoam = true;
    // Jeda antar zoomies berdua, supaya terasa spontan, bukan terus-terusan.
    this.zoomieCooldown = 15;
    this.themeId = 'room';
    this.world = THEMES.room.world;
    this.obstacles = [];
    this.seats = [];
    this.dogs = BREEDS.map((breed) => new Dog(breed, quality));
    this.people = PEOPLE.map((data) => new Person(data, quality));
    this.actors = [...this.dogs, ...this.people];
    this.actors.forEach((actor) => scene.add(actor.root));
    this.dogs.forEach((dog) => dog.wardrobe.apply(PHOTO_LOOKS.foto2[dog.id]));

    this.chase = { active: false, timer: 0 };
    this.focus = null;
    this.active = null;
    this.steer = { x: 0, z: 0 };
    this.dogs.forEach((dog) => (dog.brain.timer = 5 + Math.random() * 4));
  }

  byId(id) {
    return this.actors.find((a) => a.id === id);
  }

  /** Pindah dunia. `data` berasal dari room.setTheme: rintangan, kursi, posisi awal, dan gravitasi. */
  setTheme(id, data) {
    this.themeId = id;
    this.world = THEMES[id].world;
    this.obstacles = data.obstacles ?? [];
    this.seats = data.seats ?? [];
    this.seats.forEach((seat) => (seat.occupant = null));
    this.ball.setLimits(this.world);
    this.ball.setGravity(data.lowGravity ? 1.7 : 5.2);
    this.ball.mesh.visible = false;
    this.chase.active = false;
    const lowGravity = Boolean(data.lowGravity);
    this.actors.forEach((actor) => {
      actor.ctx.float = lowGravity;
      actor.setHelmet(lowGravity);
    });
    this.#place(data.layout);
  }

  #place(layout) {
    this.actors.forEach((actor) => {
      const spot = layout[actor.id];
      Object.assign(actor.brain, { seat: null, reserved: null, queued: null, then: null, chasing: false, arrive: 0, toSofa: false, barks: 0, loop: false, patDog: null, follow: null });
      if (spot.seat !== undefined && this.seats[spot.seat]) {
        this.#seatNow(actor, this.seats[spot.seat]);
        actor.prevName = actor.poseName;
        actor.blend = 1;
        actor.brain.timer = 6 + Math.random() * 6;
        return;
      }
      actor.position.set(spot.x, 0, spot.z);
      actor.yaw = spot.yaw;
      actor.speed = 0;
      actor.stepping = 0;
      const pose = spot.pose === 'walk' ? actor.idlePose : spot.pose;
      actor.poseName = pose;
      actor.prevName = pose;
      actor.blend = 1;
      const brain = actor.brain;
      brain.mode = MODE.REST;
      brain.timer = (actor.isDog ? 1.5 : 4) + Math.random() * 4;
      brain.manual = false;
      brain.chasing = false;
      brain.then = null;
    });
  }

  applyLook(key) {
    const look = PHOTO_LOOKS[key];
    this.dogs.forEach((dog) => dog.wardrobe.apply(look[dog.id]));
  }

  /** Perintah dari tombol. Pose tertahan sebentar sebelum tokoh kembali berkeliaran. */
  command(actor, poseId) {
    if (this.#queueIfHopping(actor, () => this.command(actor, poseId))) return;
    this.#interrupt(actor);
    const brain = actor.brain;
    brain.manual = true;
    // Mama dan Bapak berdiri dulu dari sofa sebelum bergaya.
    if (!actor.isDog && brain.seat && poseId !== 'walk' && poseId !== 'sofa') {
      this.#leaveSofa(actor, () => this.command(actor, poseId));
      return;
    }
    if (poseId === 'walk') {
      this.#goSomewhere(actor);
      return;
    }
    actor.speed = 0;
    actor.stepping = 0;
    actor.setPose(poseId);
    brain.mode = MODE.REST;
    brain.timer = 9 + Math.random() * 5;
  }

  /** Tokoh yang dipilih atau disentuh langsung berhenti di tempat. */
  hold(actor) {
    if (this.locked || this.focus === actor) return;
    const b = actor.brain;
    if (b.chasing || b.mode === MODE.GO || b.mode === MODE.TURN || b.mode === MODE.DRIVEN || b.mode === MODE.FOLLOW) {
      this.#interrupt(actor);
      actor.speed = 0;
      this.#rest(actor, b.seat && !actor.isDog ? 'sofa' : actor.idlePose);
    }
  }

  /**
   * Naik atau duduk di sofa. Anjing melompat ke bantalan, Mama dan Bapak duduk.
   * Mengembalikan 'ok', 'none' (tidak ada sofa di dunia ini), atau 'full'.
   */
  climbSofa(actor) {
    if (!this.seats.length) return 'none';
    if (this.#queueIfHopping(actor, () => this.climbSofa(actor))) return 'ok';
    this.#interrupt(actor);
    const b = actor.brain;
    if (b.seat) {
      this.#rest(actor, actor.isDog ? 'sit' : 'sofa', 14);
      return 'ok';
    }
    const free = this.seats
      .filter((seat) => !seat.occupant)
      .sort((p, q) => dist2(actor.position, p.front.x, p.front.z) - dist2(actor.position, q.front.x, q.front.z));
    if (!free.length) return 'full';
    const seat = free[0];
    seat.occupant = actor;
    b.reserved = seat;
    b.manual = true;
    // Menuju sofa: dorongan dari badan sofa diabaikan supaya bisa sampai tepat di depannya.
    b.toSofa = true;
    this.#goTo(actor, seat.front.x, seat.front.z, actor.walkSpeed * 1.2, () => {
      b.toSofa = false;
      if (actor.isDog) {
        this.#turnTo(actor, Math.PI, () => {
          this.#hop(actor, { x: seat.x, y: seat.y, z: seat.z }, 0.3, () => {
            this.#turnTo(actor, seat.yaw, () => {
              this.#seatNow(actor, seat);
              this.say?.(actor, 'Empuk!', 1.6);
              b.timer = 14 + Math.random() * 8;
            });
          });
        });
      } else {
        this.#turnTo(actor, seat.yaw, () => {
          actor.ctx.seatY = (seat.y + 0.05) / actor.data.height;
          actor.setPose('sofa');
          this.#hop(actor, { x: seat.x, y: 0, z: seat.z + 0.14 }, 0, () => {
            this.#seatNow(actor, seat);
            b.timer = 14 + Math.random() * 8;
          });
        });
      }
    }, { keepSeat: true });
    return 'ok';
  }

  #seatNow(actor, seat) {
    const b = actor.brain;
    seat.occupant = actor;
    b.seat = seat;
    b.reserved = null;
    actor.yaw = seat.yaw;
    actor.speed = 0;
    if (actor.isDog) {
      actor.position.set(seat.x, seat.y, seat.z);
      this.#rest(actor, 'sit', 14);
    } else {
      actor.ctx.seatY = (seat.y + 0.05) / actor.data.height;
      actor.position.set(seat.x, 0, seat.z + 0.14);
      this.#rest(actor, 'sofa', 14);
    }
  }

  #leaveSofa(actor, then) {
    const b = actor.brain;
    const seat = b.seat;
    // Kursi baru dilepas saat lompatan dimulai, supaya kalau dipotong saat berbalik ia tetap duduk.
    const jump = () => {
      seat.occupant = null;
      b.seat = null;
      this.#hop(actor, { x: seat.front.x, y: 0, z: seat.front.z - 0.25 }, actor.isDog ? 0.22 : 0, then);
    };
    if (actor.isDog) {
      this.#turnTo(actor, seat.yaw, jump);
    } else {
      actor.setPose(actor.idlePose);
      jump();
    }
  }

  /** Membersihkan semua penanda sementara sebelum aksi baru. */
  #interrupt(actor) {
    const b = actor.brain;
    Object.assign(b, { then: null, chasing: false, arrive: 0, toSofa: false, barks: 0, loop: false, patDog: null, follow: null, followSpeed: 0 });
    actor.stepping = 0;
    // Sudah mendarat di sofa tetapi belum resmi duduk: jadikan duduk di kursi yang dipesan.
    if (actor.isDog && !b.seat && actor.position.y > 0.01) {
      if (b.reserved) {
        b.seat = b.reserved;
        b.seat.occupant = actor;
        b.reserved = null;
      } else {
        actor.position.y = 0;
      }
    }
    this.#unreserve(actor);
  }

  /** Lompatan tidak boleh dipotong. Kalau sedang melompat, aksi disimpan dan dijalankan setelah mendarat. */
  #queueIfHopping(actor, action) {
    if (actor.brain.mode !== MODE.HOP) return false;
    actor.brain.queued = action;
    return true;
  }

  #unreserve(actor) {
    const b = actor.brain;
    if (b.reserved) {
      if (b.reserved.occupant === actor) b.reserved.occupant = null;
      b.reserved = null;
    }
  }

  /** Lompat atau bergeser dari satu titik ke titik lain, melewati rintangan. */
  #hop(actor, to, arc, then) {
    const b = actor.brain;
    b.mode = MODE.HOP;
    b.hop = {
      fx: actor.position.x, fy: actor.position.y, fz: actor.position.z,
      tx: to.x, ty: to.y, tz: to.z,
      t: 0, dur: arc ? 0.6 : 0.75, arc,
    };
    b.then = then;
    actor.speed = 0;
    actor.stepping = 0;
    if (arc && actor.isDog) actor.setPose('leap');
  }

  /** Jalan ke titik yang dipilih pengguna di taman. */
  walkTo(actor, x, z) {
    if (this.#queueIfHopping(actor, () => this.walkTo(actor, x, z))) return;
    this.#interrupt(actor);
    const b = actor.brain;
    b.manual = true;
    this.#goTo(actor, x, z, actor.runSpeed * 0.8, () => this.#rest(actor, actor.idlePose, 8));
  }

  throwBall(x, z) {
    this.ball.throwTo(x, z);
    this.chase.active = true;
    this.chase.timer = 11;
    this.dogs.forEach((dog) => (dog.brain.chasing = false));
    const sorted = this.dogs.filter((dog) => !dog.brain.seat && dog.brain.mode !== MODE.HOP).sort((a, b) => dist2(a.position, x, z) - dist2(b.position, x, z));
    sorted.slice(0, 2).forEach((dog) => {
      this.#interrupt(dog);
      dog.brain.chasing = true;
      dog.brain.mode = MODE.GO;
      dog.brain.manual = false;
      dog.setPose('walk');
    });
  }

  feed(dog) {
    const ahead = 0.3 + dog.breed.size.bodyLen * 0.5 + dog.breed.size.snoutLen;
    const brain = dog.brain;
    if (brain.mode !== MODE.HOP) this.#interrupt(dog);
    this.say?.(dog, 'Nyam nyam!');
    if (brain.mode === MODE.HOP) {
      brain.queued = () => this.#rest(dog, 'eat', 1.8);
    } else {
      brain.mode = MODE.EAT;
      brain.timer = 1.8;
      dog.speed = 0;
      dog.setPose('eat');
    }
    return new THREE.Vector3(dog.position.x + Math.sin(dog.yaw) * ahead * 0.8, dog.position.y + 0.02, dog.position.z + Math.cos(dog.yaw) * ahead * 0.8);
  }

  /** Semua anjing berlari ke tokoh ini, duduk melingkar di depannya, dan menghadapnya. */
  callDogs(person) {
    this.#formation(person, this.dogs).forEach(({ dog, x, z }) => {
      this.#takeOver(dog, () => {
        dog.brain.manual = true;
        this.#goTo(dog, x, z, dog.runSpeed, () => {
          this.#turnTo(dog, angleTo(dog.position, person.position.x, person.position.z), () => {
            this.#rest(dog, 'sit', 7 + Math.random() * 3);
            dog.express('happy');
          });
        });
      });
    });
  }

  /** Jalankan aksi sekarang, atau antre kalau tokoh sedang melompat. */
  #takeOver(actor, action) {
    if (this.#queueIfHopping(actor, action)) return;
    this.#interrupt(actor);
    action();
  }

  /**
   * Perintah Mama atau Bapak ke satu anjing atau semuanya:
   * come = datang, sit = duduk, shake = salaman, bark = gonggong. Semua dilakukan di depan tokohnya.
   */
  order(person, dogs, action) {
    const pb = person.brain;
    // Berdiri dulu dari sofa, baru memberi perintah.
    if (pb.mode === MODE.HOP || pb.seat) {
      this.#takeOver(person, () => (pb.seat ? this.#leaveSofa(person, () => this.order(person, dogs, action)) : this.order(person, dogs, action)));
      return;
    }
    this.#interrupt(person);
    pb.manual = true;
    person.speed = 0;
    person.stepping = 0;
    pb.mode = MODE.REST;
    pb.timer = 8;
    person.setPose(action === 'come' ? 'wave' : action === 'shake' ? person.idlePose : 'point');

    // Anjing pertama yang salaman berdiri tepat di depan; yang lain duduk rapi di kiri-kanannya.
    const shaker = action === 'shake' ? dogs[0] : null;
    this.#formation(person, dogs, shaker).forEach(({ dog, x, z }) => {
      const i = dogs.indexOf(dog);
      if (dog === shaker) {
        // Saat salaman jaraknya diukur dari panjang badan, supaya kaki depan pas di tangan.
        const paws = (dog.breed.size.bodyLen * 0.45 + dog.m.fore * 0.68) * dog.scale;
        const close = paws + person.data.height * 0.2;
        x = clamp(person.position.x + Math.sin(person.yaw) * close, -this.world.walkX, this.world.walkX);
        z = clamp(person.position.z + Math.cos(person.yaw) * close, -this.world.walkZ, this.world.walkZ);
      }
      this.#takeOver(dog, () => this.#obey(person, dog, action, i, x, z));
    });
  }

  /**
   * Tempat duduk melingkar di depan tokoh untuk beberapa anjing sekaligus.
   * Jarak antar tempat dihitung dari lebar badan tiap anjing, urutan kiri-kanan mengikuti posisi
   * anjing saat ini (supaya jalurnya tidak saling silang), dan tempat yang kena furnitur digeser.
   * center: anjing yang harus mendapat tempat paling tengah (misalnya yang salaman).
   */
  #formation(person, dogs, center = null) {
    const yaw = person.yaw;
    const px = person.position.x;
    const pz = person.position.z;
    const side = (dog) => wrap(Math.atan2(dog.position.x - px, dog.position.z - pz) - yaw);
    // Urut dari kanan tokoh ke kiri (sudut kecil ke besar), sama dengan urutan sudut tempat.
    const order = dogs.filter((d) => d !== center).sort((a, b) => side(a) - side(b));
    if (center) order.splice(Math.floor(order.length / 2), 0, center);

    const GAP = 0.14;
    const widest = Math.max(...order.map((d) => d.radius));
    // Panjang busur yang dibutuhkan, lalu jari-jari dibesarkan kalau busurnya terlalu lebar.
    const chords = order.slice(1).map((d, i) => order[i].radius + d.radius + GAP);
    const arc = chords.reduce((a, b) => a + b, 0);
    const reach = Math.max(person.radius + widest + 0.28, arc / 2.3);

    const layout = (facing) => {
      let angle = facing - arc / reach / 2;
      const taken = [];
      let misses = 0;
      const spots = order.map((dog, i) => {
        if (i > 0) angle += chords[i - 1] / reach;
        const spot = this.#freeSpot(dog, px, pz, angle, reach, taken);
        misses += spot.miss;
        taken.push({ x: spot.x, z: spot.z, r: dog.radius });
        return { dog, x: spot.x, z: spot.z };
      });
      return { spots, misses };
    };
    // Utamakan di depan tokoh. Kalau di depannya dinding atau furnitur (misalnya berdiri di pojok
    // menghadap keluar), pindahkan lingkarannya ke sisi yang paling lapang, condong ke tengah ruangan.
    const toCenter = Math.atan2(-px, -pz);
    let best = null;
    for (const facing of [yaw, toCenter, yaw + Math.PI / 2, yaw - Math.PI / 2, yaw + Math.PI]) {
      const result = layout(facing);
      if (!best || result.misses < best.misses) best = result;
      if (best.misses === 0) break;
    }
    return best.spots;
  }

  /** Titik di busur sekitar (px, pz) yang tidak kena furnitur, dinding, atau tempat anjing lain. */
  #freeSpot(dog, px, pz, angle, reach, taken) {
    const { walkX, walkZ } = this.world;
    const r = dog.radius;
    const fits = (x, z) =>
      Math.abs(x) <= walkX && Math.abs(z) <= walkZ &&
      this.obstacles.every((o) => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + r * 0.8) ** 2) &&
      taken.every((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > (t.r + r + 0.06) ** 2);
    // Coba bergeser sedikit di sepanjang busur dan sedikit menjauh, dari yang paling dekat.
    for (const grow of [0, 0.25, 0.5, 0.8]) {
      for (const turn of [0, 0.18, -0.18, 0.36, -0.36, 0.6, -0.6]) {
        const a = angle + turn;
        const x = px + Math.sin(a) * (reach + grow);
        const z = pz + Math.cos(a) * (reach + grow);
        if (fits(x, z)) return { x, z, miss: grow > 0 || turn !== 0 ? 0.2 : 0 };
      }
    }
    return {
      x: clamp(px + Math.sin(angle) * reach, -walkX, walkX),
      z: clamp(pz + Math.cos(angle) * reach, -walkZ, walkZ),
      miss: 1,
    };
  }

  /** Satu anjing menjalankan perintah Mama atau Bapak di titik (x, z). */
  #obey(person, dog, action, i, x, z) {
    const b = dog.brain;
    const shakesHand = action === 'shake' && i === 0;
    b.manual = true;
    b.arrive = shakesHand ? 0.03 : 0;
    this.#goTo(dog, x, z, dog.runSpeed, () => {
      b.arrive = 0;
      this.#turnTo(dog, angleTo(dog.position, person.position.x, person.position.z), () => {
        if (action === 'shake') {
          this.#rest(dog, 'shake', 6);
          dog.express('happy');
          this.say?.(dog, `Salam, ${person.name}!`);
          // Mama atau Bapak menyambut kakinya, asal masih menunggu di tempat.
          if (shakesHand && person.brain.mode === MODE.REST && !person.brain.seat) {
            person.yaw = angleTo(person.position, dog.position.x, dog.position.z);
            person.reach = { target: dog.rig.legs[1].ankle, arm: 0, lift: 0.03, pat: false };
            person.setPose('shakeHand');
            person.brain.timer = 5;
          }
        } else if (action === 'bark') {
          this.#rest(dog, 'sit', 7);
          this.say?.(dog, 'Guk! Guk!', 2);
          b.barks = 3;
          b.barkTimer = 0.1 + i * 0.18;
        } else {
          this.#rest(dog, 'sit', 9 + Math.random() * 3);
          if (action === 'come') {
            dog.express('happy');
            this.say?.(dog, `Iya, ${person.name}!`);
          }
        }
      });
    });
  }

  /** Menata semua tokoh ke titik tertentu, untuk foto keluarga dan pesta. */
  arrange(spots) {
    this.locked = true;
    this.spots = spots;
    this.placed = 0;
    this.ball.mesh.visible = false;
    this.chase.active = false;
    spots.forEach((spot) => {
      const { actor } = spot;
      spot.done = false;
      this.#takeOver(actor, () => {
        actor.brain.manual = true;
        this.#goTo(actor, spot.x, spot.z, actor.runSpeed, () => {
          this.#turnTo(actor, spot.yaw, () => {
            spot.done = true;
            this.placed += 1;
            this.#rest(actor, actor.idlePose, 1e9);
          });
        });
      });
    });
  }

  get allPlaced() {
    return this.placed >= (this.spots?.length ?? 0);
  }

  /** Yang belum sampai langsung dipindahkan, supaya foto tidak menunggu lama. */
  snapToSpots() {
    this.spots.forEach((spot) => {
      if (spot.done) return;
      const { actor } = spot;
      this.#interrupt(actor);
      actor.brain.queued = null;
      if (actor.brain.seat) actor.brain.seat.occupant = null;
      actor.brain.seat = null;
      actor.position.set(spot.x, 0, spot.z);
      actor.yaw = spot.yaw;
      actor.speed = 0;
      this.#rest(actor, actor.idlePose, 1e9);
      spot.done = true;
    });
    this.placed = this.spots.length;
  }

  strikePoses() {
    this.spots.forEach(({ actor, pose, loop }) => {
      actor.setPose(pose);
      actor.brain.loop = Boolean(loop);
    });
  }

  release() {
    this.locked = false;
    this.spots = null;
    this.actors.forEach((actor) => {
      const b = actor.brain;
      if (b.mode !== MODE.HOP) this.#interrupt(actor);
      b.queued = null;
      b.mode = MODE.REST;
      b.manual = false;
      b.timer = 1 + Math.random() * 3;
      actor.lookOverride = null;
      if (actor.poseFinished || actor.poseName === 'beg' || actor.poseName === 'bow') actor.setPose(actor.idlePose);
    });
  }

  /** Kebut-kebutan: lari memutar dua kali dengan kencang, lalu ajak main. */
  zoomies(dog, { radius = 1.1, laps = 2, speed = 1.5, shout = 'Wuuusss!', onDone = null } = {}) {
    if (this.#queueIfHopping(dog, () => this.zoomies(dog, { radius, laps, speed, shout, onDone }))) return;
    this.#interrupt(dog);
    const b = dog.brain;
    b.manual = true;
    const { walkX, walkZ } = this.world;
    const margin = radius + 0.2;
    const cx = clamp(dog.position.x, -walkX + margin, walkX - margin);
    const cz = clamp(dog.position.z, -walkZ + margin, walkZ - margin);
    const points = Array.from({ length: laps * 8 + 1 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return { x: cx + Math.cos(a) * radius, z: cz + Math.sin(a) * radius };
    });
    const step = (i) => {
      if (i >= points.length) {
        b.arrive = 0;
        this.#rest(dog, 'bow', 6);
        dog.express('happy');
        onDone?.();
        return;
      }
      this.#goTo(dog, points[i].x, points[i].z, dog.runSpeed * speed, () => step(i + 1));
    };
    b.arrive = 0.35;
    step(0);
    if (shout) this.say?.(dog, shout, 2);
  }

  /** Untuk permainan: jalan ke titik lalu menjalankan `then`, mengikuti aturan antrean dan pembersihan. */
  moveTo(actor, x, z, { speed = actor.walkSpeed, then = null } = {}) {
    this.#takeOver(actor, () => {
      actor.brain.manual = true;
      this.#goTo(actor, x, z, speed, then);
    });
  }

  /** Untuk permainan: berbalik di tempat lalu menjalankan `then`. */
  faceTo(actor, yaw, then = null) {
    this.#takeOver(actor, () => this.#turnTo(actor, yaw, () => (then ? then() : this.#rest(actor, actor.idlePose))));
  }

  /** Untuk permainan: berpose dan diam selama `hold` detik. `loop` mengulang pose berdurasi. */
  perform(actor, pose, { hold = 8, loop = false } = {}) {
    this.#takeOver(actor, () => {
      this.#rest(actor, pose, hold);
      actor.brain.loop = loop;
    });
  }

  /** Anjing bermain sendiri: kejar-kejaran dengan teman terdekat. */
  #playChase(runner, chaser) {
    this.#interrupt(chaser);
    chaser.brain.mode = MODE.FOLLOW;
    chaser.brain.follow = runner;
    chaser.setPose('walk');
    this.say?.(chaser, 'Tunggu aku!', 1.8);
    this.zoomies(runner, {
      radius: 0.9,
      laps: 1,
      speed: 1.25,
      shout: 'Kejar aku!',
      onDone: () => {
        if (chaser.brain.mode === MODE.FOLLOW && chaser.brain.follow === runner) {
          chaser.brain.follow = null;
          this.#rest(chaser, 'bow', 5);
          chaser.express('happy');
        }
      },
    });
  }

  /** Kitty dan Gemoy satu tim: kalau salah satunya mulai iseng, yang lain ikut. */
  static ZOOMIE_TEAM = ['kitty', 'gemoy'];

  /** Pasangan zoomies untuk anjing ini, kalau ia anggota tim dan temannya sedang bebas. */
  zoomieBuddy(dog) {
    if (!Squad.ZOOMIE_TEAM.includes(dog.id)) return null;
    const buddy = this.dogs.find((d) => d !== dog && Squad.ZOOMIE_TEAM.includes(d.id));
    if (!buddy || buddy === this.focus || buddy.isAngry) return null;
    const busy = [MODE.HOP, MODE.EAT, MODE.PATTING, MODE.FOLLOW].includes(buddy.brain.mode) || buddy.brain.chasing;
    return busy ? null : buddy;
  }

  /**
   * Zoomies berdua: lari kencang ke mana-mana di seluruh dunia, satu dikejar satu mengejar,
   * di tengah jalan gantian, lalu rebahan berdua sambil terengah. Mengembalikan true kalau jadi.
   */
  teamZoomies(dog) {
    const buddy = this.zoomieBuddy(dog);
    if (!buddy || this.locked) return false;
    this.zoomieCooldown = 40;
    const { walkX, walkZ } = this.world;
    // Kecepatan disamakan dengan yang lebih lambat (Gemoy berkaki pendek), supaya bisa saling kejar.
    const speed = Math.min(dog.runSpeed, buddy.runSpeed) * 2.1;

    // Titik-titik jauh yang bebas furnitur, berselang-seling di seluruh ruangan.
    const route = (from, count) => {
      const points = [];
      let last = from;
      for (let k = 0; k < count; k++) {
        let pick = null;
        for (let attempt = 0; attempt < 30 && !pick; attempt++) {
          const x = (Math.random() * 2 - 1) * (walkX - 0.3);
          const z = (Math.random() * 2 - 1) * (walkZ - 0.3);
          const far = Math.hypot(x - last.x, z - last.z) > Math.min(walkX, walkZ) * 0.9;
          const clear = this.obstacles.every((o) => (o.x - x) ** 2 + (o.z - z) ** 2 > (o.r + 0.45) ** 2);
          if (far && clear) pick = { x, z };
        }
        if (pick) {
          points.push(pick);
          last = pick;
        }
      }
      return points;
    };

    const lead = (runner, chaser, points, then) => {
      this.#takeOver(chaser, () => {
        chaser.brain.manual = true;
        chaser.brain.mode = MODE.FOLLOW;
        chaser.brain.follow = runner;
        chaser.brain.followSpeed = speed * 1.04;
        chaser.setPose('walk');
      });
      this.#takeOver(runner, () => {
        runner.brain.manual = true;
        // Lewat saja di dekat tiap titik tanpa mengerem, seperti zoomies sungguhan.
        runner.brain.arrive = 0.7;
        const step = (i) => {
          if (i >= points.length) {
            runner.brain.arrive = 0;
            then();
            return;
          }
          this.#goTo(runner, points[i].x, points[i].z, speed, () => step(i + 1));
        };
        step(0);
      });
    };

    const first = route(dog.position, 3);
    const second = route(first[first.length - 1] ?? dog.position, 3);
    this.say?.(dog, Math.random() < 0.5 ? 'Kejar aku!' : 'Wuuusss!', 1.8);
    dog.express('happy');
    lead(dog, buddy, first, () => {
      // Gantian: yang tadi mengejar sekarang dikejar.
      this.say?.(buddy, 'Gantian! Hihi', 1.8);
      buddy.express('happy');
      lead(buddy, dog, second, () => {
        // Capek: rebahan berdua berdampingan.
        [buddy, dog].forEach((d) => {
          d.brain.follow = null;
          d.brain.followSpeed = 0;
        });
        const side = buddy.yaw + Math.PI / 2;
        const gap = buddy.radius + dog.radius + 0.08;
        const x = clamp(buddy.position.x + Math.sin(side) * gap, -walkX, walkX);
        const z = clamp(buddy.position.z + Math.cos(side) * gap, -walkZ, walkZ);
        this.#rest(buddy, 'sploot', 10);
        this.#takeOver(dog, () => {
          dog.brain.manual = true;
          this.#goTo(dog, x, z, dog.walkSpeed, () => {
            this.#turnTo(dog, buddy.yaw, () => {
              this.#rest(dog, 'sploot', 10);
              this.say?.(dog, 'Capek tapi seru!', 2);
              dog.express('happy');
              buddy.express('happy');
            });
          });
        });
      });
    });
    return true;
  }

  /** Anjing bermain sendiri: mendekati teman lalu mengendus, atau ikut tidur kalau temannya tidur. */
  #sniff(dog, buddy) {
    const side = buddy.yaw + (Math.random() < 0.5 ? 1 : -1) * Math.PI * 0.5;
    const reach = dog.radius + buddy.radius + 0.06;
    const x = clamp(buddy.position.x + Math.sin(side) * reach, -this.world.walkX, this.world.walkX);
    const z = clamp(buddy.position.z + Math.cos(side) * reach, -this.world.walkZ, this.world.walkZ);
    this.#takeOver(dog, () => {
      this.#goTo(dog, x, z, dog.walkSpeed, () => {
        this.#turnTo(dog, angleTo(dog.position, buddy.position.x, buddy.position.z), () => {
          if (buddy.poseName === 'sleep') {
            this.#rest(dog, 'sleep', 14 + Math.random() * 6);
            this.say?.(dog, 'Ikut bobo ah...', 2);
          } else {
            this.#rest(dog, 'sit', 6);
            dog.express('happy');
            buddy.express('tilt');
            this.say?.(dog, 'Endus endus...', 1.8);
          }
        });
      });
    });
  }

  /** Teman main terdekat yang sedang santai di lantai. */
  #buddyFor(dog) {
    const free = this.dogs.filter((d) => d !== dog && d !== this.active && d !== this.focus && !d.brain.seat && d.brain.mode === MODE.REST && !d.isAngry && dist2(d.position, dog.position.x, dog.position.z) < 49);
    free.sort((p, q) => dist2(p.position, dog.position.x, dog.position.z) - dist2(q.position, dog.position.x, dog.position.z));
    return free[0] ?? null;
  }

  /** Dua anjing terdekat datang makan di mangkuk. */
  feedAtBowl(x, z) {
    const hungry = this.dogs
      .filter((dog) => !dog.brain.seat && dog !== this.focus)
      .sort((p, q) => dist2(p.position, x, z) - dist2(q.position, x, z))
      .slice(0, 2);
    hungry.forEach((dog, i) => {
      const a = Math.PI * 0.5 + (i ? -0.9 : 0.9);
      const reach = dog.breed.size.bodyLen * 0.5 * dog.scale + 0.42;
      this.#takeOver(dog, () => {
        dog.brain.manual = true;
        this.#goTo(dog, x + Math.cos(a) * reach, z + Math.sin(a) * reach, dog.runSpeed, () => {
          this.#turnTo(dog, angleTo(dog.position, x, z), () => {
            this.#rest(dog, 'eat', 7);
            this.say?.(dog, 'Nyam nyam!', 1.8);
          });
        });
      });
    });
  }

  /** Anjing mendatangi mainan lalu mengajaknya bermain. */
  playWith(dog, toy) {
    if (this.#queueIfHopping(dog, () => this.playWith(dog, toy))) return;
    this.#interrupt(dog);
    const b = dog.brain;
    b.manual = true;
    const away = Math.atan2(dog.position.x - toy.x, dog.position.z - toy.z);
    const reach = dog.breed.size.bodyLen * 0.5 * dog.scale + 0.32;
    this.#goTo(dog, toy.x + Math.sin(away) * reach, toy.z + Math.cos(away) * reach, dog.runSpeed, () => {
      this.#turnTo(dog, angleTo(dog.position, toy.x, toy.z), () => {
        this.#rest(dog, 'bow', 7);
        dog.express('happy');
        this.audio.squeak();
        this.say?.(dog, `Ayo main ${toy.label}!`, 2);
      });
    });
  }

  /** Tokoh berjalan ke anjing terdekat lalu mengelusnya. */
  petNearest(person) {
    const dog = [...this.dogs].sort((a, b) => dist2(a.position, person.position.x, person.position.z) - dist2(b.position, person.position.x, person.position.z))[0];
    this.petDog(person, dog);
  }

  petDog(person, dog) {
    if (this.#queueIfHopping(person, () => this.petDog(person, dog))) return;
    this.#interrupt(person);
    const pb = person.brain;
    pb.manual = true;
    this.command(dog, 'sit');
    dog.brain.timer = 12;
    const angle = dog.yaw;
    const reach = (dog.breed.size.bodyLen * 0.5 + 0.1) * dog.scale + person.data.height * 0.22;
    const x = clamp(dog.position.x + Math.sin(angle) * reach, -this.world.walkX, this.world.walkX);
    const z = clamp(dog.position.z + Math.cos(angle) * reach, -this.world.walkZ, this.world.walkZ);
    pb.arrive = 0.05;
    this.#goTo(person, x, z, person.walkSpeed * 1.2, () => {
      pb.arrive = 0;
      this.#turnTo(person, angleTo(person.position, dog.position.x, dog.position.z), () => {
        person.reach = { target: dog.rig.head, arm: 1, lift: dog.breed.size.head[1] * dog.scale + 0.03, pat: true };
        person.setPose('pat');
        this.say?.(dog, 'Enaaak...');
        pb.mode = MODE.PATTING;
        pb.timer = 4.2;
        pb.patDog = dog;
        pb.patTick = 0;
      });
    });
  }

  /** Mode Elus: anjing menghadap kamera lalu duduk, tokoh lain berhenti di tempat. */
  enterPet(dog, cameraPosition) {
    this.focus = dog;
    const yaw = angleTo(dog.position, cameraPosition.x, cameraPosition.z);
    this.#takeOver(dog, () => {
      dog.brain.manual = true;
      this.#turnTo(dog, yaw, () => this.#rest(dog, 'sit', 1e9));
    });
    return yaw;
  }

  leavePet() {
    if (this.focus) {
      this.focus.brain.timer = 2 + Math.random() * 2;
      this.focus.lookOverride = null;
    }
    this.focus = null;
  }

  update(dt, time, lookPoint) {
    this.zoomieCooldown -= dt;
    if (this.chase.active) {
      this.chase.timer -= dt;
      if (this.chase.timer <= 0) this.#endChase();
    }
    this.#bumpBall();
    for (const actor of this.actors) {
      // Yang sedang melompat dibiarkan mendarat dulu, supaya tidak tertahan di udara.
      if (this.focus && actor !== this.focus && actor.brain.mode !== MODE.HOP) {
        this.#freeze(actor, dt);
      } else {
        this.#think(actor, dt);
      }
      actor.lookPoint = actor.brain.chasing && this.ball.mesh.visible ? this.ball.position : lookPoint;
      actor.update(dt, time);
    }
  }

  #freeze(actor, dt) {
    actor.speed = Math.max(0, actor.speed - dt * 3);
    if (actor.brain.mode !== MODE.REST) this.#interrupt(actor);
    actor.brain.queued = null;
    if (actor.poseName === 'walk' && actor.speed < 0.05) actor.setPose(actor.idlePose);
    actor.brain.mode = MODE.REST;
    actor.brain.timer = 2 + Math.random() * 3;
  }

  // Bola tidak boleh menembus badan: terpental ke samping saat tersenggol.
  #bumpBall() {
    const { ball } = this;
    if (!ball.mesh.visible || ball.position.y > 0.62) return;
    for (const actor of this.actors) {
      const minimum = actor.radius * 0.92;
      const ox = ball.position.x - actor.position.x;
      const oz = ball.position.z - actor.position.z;
      const d = Math.hypot(ox, oz) || 1e-3;
      if (d < minimum) {
        ball.position.x += (ox / d) * (minimum - d);
        ball.position.z += (oz / d) * (minimum - d);
        const into = (ball.velocity.x * ox + ball.velocity.z * oz) / d;
        if (into < 0) {
          ball.velocity.x -= (1.6 * into * ox) / d;
          ball.velocity.z -= (1.6 * into * oz) / d;
        }
      }
    }
  }

  #endChase() {
    this.chase.active = false;
    this.dogs.forEach((dog) => {
      if (dog.brain.chasing) {
        dog.brain.chasing = false;
        this.#rest(dog, 'sit');
      }
    });
  }

  #think(actor, dt) {
    const brain = actor.brain;

    if (brain.mode === MODE.HOP) {
      const h = brain.hop;
      h.t += dt;
      const u = Math.min(1, h.t / h.dur);
      const e = u * u * (3 - 2 * u);
      actor.position.set(h.fx + (h.tx - h.fx) * e, h.fy + (h.ty - h.fy) * e + Math.sin(u * Math.PI) * h.arc, h.fz + (h.tz - h.fz) * e);
      if (u >= 1) {
        brain.mode = MODE.REST;
        if (actor.poseName === 'leap') actor.setPose(actor.idlePose);
        const then = brain.then;
        brain.then = null;
        if (then) then();
        else this.#rest(actor, actor.idlePose);
        // Perintah yang datang selama melompat dijalankan setelah benar-benar mendarat.
        if (brain.queued && brain.mode !== MODE.HOP) {
          const queued = brain.queued;
          brain.queued = null;
          this.#interrupt(actor);
          queued();
        }
      }
      return;
    }

    // Dikendalikan tombol panah
    if (!this.locked && actor === this.active && actor !== this.focus && (this.steer.x || this.steer.z) && brain.seat) {
      this.#leaveSofa(actor, () => this.#rest(actor, actor.idlePose, 7));
      return;
    }
    if (!this.locked && actor === this.active && actor !== this.focus && (this.steer.x || this.steer.z)) {
      brain.chasing = false;
      brain.then = null;
      brain.manual = true;
      brain.mode = MODE.DRIVEN;
      if (actor.poseName !== 'walk') actor.setPose('walk');
      this.#stepToward(actor, this.steer.x, this.steer.z, actor.runSpeed, dt, Infinity, 0);
      return;
    }
    if (brain.mode === MODE.DRIVEN) this.#rest(actor, actor.idlePose, 7);

    if (brain.chasing) {
      this.#chaseBall(actor, dt);
      return;
    }
    if (brain.mode === MODE.TURN) {
      const delta = wrap(brain.faceYaw - actor.yaw);
      actor.yaw += clamp(delta, -TURN_RATE * 0.7 * dt, TURN_RATE * 0.7 * dt);
      actor.stepping = 0.26;
      actor.speed = Math.max(0, actor.speed - dt * 2.6);
      if (Math.abs(delta) < 0.04) {
        actor.stepping = 0;
        const then = brain.then;
        brain.then = null;
        then?.();
      }
      return;
    }
    if (brain.mode === MODE.GO) {
      const arrived = this.#walk(actor, brain.target.x, brain.target.z, brain.topSpeed, brain.arrive || 0.14, dt);
      brain.timer -= dt;
      // Sudah dekat tapi tidak maju lagi (terhalang teman): anggap sampai, jangan dorong-dorongan.
      brain.checkTimer -= dt;
      let blocked = false;
      if (brain.checkTimer <= 0) {
        const left = Math.hypot(brain.target.x - actor.position.x, brain.target.z - actor.position.z);
        blocked = !brain.arrive && left < actor.radius + 0.45 && brain.checkLeft - left < 0.04;
        brain.checkLeft = left;
        brain.checkTimer = 0.5;
      }
      if (arrived || blocked || brain.timer <= 0) {
        actor.speed = 0;
        const then = brain.then;
        brain.then = null;
        if (then) then();
        else this.#rest(actor, this.#pickRestPose(actor));
      }
      return;
    }
    if (brain.mode === MODE.FOLLOW) {
      const leader = brain.follow;
      if (!leader || leader.brain.mode !== MODE.GO) {
        brain.follow = null;
        this.#rest(actor, actor.idlePose, 4);
        return;
      }
      this.#walk(actor, leader.position.x, leader.position.z, brain.followSpeed || actor.runSpeed * 1.15, leader.radius + actor.radius + 0.1, dt);
      return;
    }
    if (brain.mode === MODE.PATTING) {
      brain.timer -= dt;
      brain.patTick -= dt;
      if (brain.patTick <= 0) {
        brain.patTick = 0.9;
        brain.patDog.express('happy');
        brain.patDog.tickle?.();
      }
      if (brain.timer <= 0) {
        brain.patDog = null;
        this.#rest(actor, actor.idlePose, 5 + Math.random() * 4);
      }
      return;
    }

    actor.speed = Math.max(0, actor.speed - dt * 3);
    brain.timer -= dt;
    if (brain.barks > 0) {
      brain.barkTimer -= dt;
      if (brain.barkTimer <= 0) {
        brain.barks -= 1;
        brain.barkTimer = 0.62;
        actor.express('bark');
        this.audio.bark(actor.breed.voice);
      }
    }
    if (actor.poseFinished && brain.loop) {
      actor.poseTime = 0;
    } else if (actor.poseFinished) {
      const wasAngry = actor.isAngry;
      actor.setPose(actor.idlePose);
      if (wasAngry) actor.express('sulk');
      if (brain.timer < 1e8 && actor !== this.active) brain.timer = Math.min(brain.timer, 5 + Math.random() * 4);
    }
    // Tokoh yang sedang dipilih tidak pergi sendiri, tapi juga tidak bengong:
    // ia berganti gaya kesukaannya di tempat sampai disuruh sesuatu.
    if (brain.timer <= 0 && actor === this.active && !this.locked) {
      brain.manual = false;
      if (!this.autoRoam || brain.mode !== MODE.REST) {
        brain.timer = 4;
      } else if (this.zoomieCooldown <= 0 && Math.random() < 0.3 && this.teamZoomies(actor)) {
        brain.manual = false;
      } else if (brain.seat) {
        this.#rest(actor, actor.isDog ? this.#pickSofaPose() : 'sofa', 7 + Math.random() * 5);
      } else {
        const list = actor.favourites.filter((p) => p !== 'walk' && p !== 'sleep');
        this.#rest(actor, list[Math.floor(Math.random() * list.length)] ?? actor.idlePose, 6 + Math.random() * 5);
      }
      return;
    }
    if (brain.timer <= 0 && !this.locked) {
      brain.manual = false;
      if (brain.mode === MODE.EAT) brain.mode = MODE.REST;
      if (!this.autoRoam) {
        brain.timer = 4;
      } else if (actor.isDog && this.zoomieCooldown <= 0 && Math.random() < 0.35 && this.teamZoomies(actor)) {
        // Kitty dan Gemoy tiba-tiba iseng lari-larian berdua.
        brain.manual = false;
      } else if (brain.seat && Math.random() < 0.45) {
        // Kadang betah duduk di sofa lebih lama.
        this.#rest(actor, actor.isDog ? this.#pickSofaPose() : 'sofa', 10 + Math.random() * 8);
      } else if (actor.isDog && !brain.seat && Math.random() < 0.4 && this.#buddyFor(actor)) {
        // Main dengan teman: kejar-kejaran atau mengendus.
        const buddy = this.#buddyFor(actor);
        if (Math.random() < 0.5) this.#playChase(actor, buddy);
        else this.#sniff(actor, buddy);
        brain.manual = false;
      } else if (!brain.seat && this.seats.length && Math.random() < 0.3 && this.climbSofa(actor) === 'ok') {
        brain.manual = false;
      } else if (actor.isDog || this.world.roomy) {
        this.#goSomewhere(actor);
      } else {
        // Di ruangan sempit, Mama dan Bapak cukup bergaya di tempat.
        this.#rest(actor, this.#pickRestPose(actor), 9 + Math.random() * 8);
      }
    }
  }

  #pickSofaPose() {
    const list = ['sit', 'sit', 'sploot', 'sleep'];
    return list[Math.floor(Math.random() * list.length)];
  }

  #pickRestPose(actor) {
    const list = actor.favourites.filter((p) => p !== 'walk');
    return list[Math.floor(Math.random() * list.length)];
  }

  #rest(actor, pose, hold) {
    actor.setPose(pose);
    actor.stepping = 0;
    actor.brain.mode = MODE.REST;
    // Istirahat cukup lama supaya tidak terus-terusan mondar-mandir.
    actor.brain.timer = hold ?? (pose === 'sleep' ? 16 : 9) + Math.random() * 7;
  }

  #goTo(actor, x, z, speed, then = null, { keepSeat = false } = {}) {
    const b = actor.brain;
    // Yang sedang duduk di sofa turun dulu, baru berjalan.
    if (b.seat) {
      this.#leaveSofa(actor, () => this.#goTo(actor, x, z, speed, then, { keepSeat }));
      return;
    }
    if (!keepSeat) {
      this.#unreserve(actor);
      b.toSofa = false;
    }
    b.target.set(x, 0, z);
    b.topSpeed = speed;
    b.then = then;
    b.mode = MODE.GO;
    b.timer = Math.hypot(x - actor.position.x, z - actor.position.z) / speed * 2 + 4;
    b.checkTimer = 0.5;
    b.checkLeft = Infinity;
    actor.stepping = 0;
    actor.setPose('walk');
  }

  #turnTo(actor, yaw, then) {
    const b = actor.brain;
    b.faceYaw = yaw;
    b.then = then;
    b.mode = MODE.TURN;
    actor.setPose('walk');
  }

  #goSomewhere(actor) {
    const { walkX, walkZ, roomy } = this.world;
    const others = this.actors.filter((d) => d !== actor);
    // Di taman tetap agak dekat dengan tokoh yang sedang dipilih, supaya tidak hilang dari layar.
    const center = roomy && this.active && actor !== this.active && Math.random() < 0.65 ? this.active.position : null;
    let x = actor.position.x;
    let z = actor.position.z;
    for (let attempt = 0; attempt < 14; attempt++) {
      const px = center ? center.x + (Math.random() * 2 - 1) * 4.5 : (Math.random() * 2 - 1) * walkX;
      const pz = center ? center.z + (Math.random() * 2 - 1) * 3.5 : (Math.random() * 2 - 1) * walkZ;
      if (Math.abs(px) > walkX || Math.abs(pz) > walkZ) continue;
      const clearOfOthers = others.every((d) => dist2(d.position, px, pz) > 0.6);
      const clearOfProps = this.obstacles.every((o) => (o.x - px) ** 2 + (o.z - pz) ** 2 > (o.r + 0.3) ** 2);
      const farEnough = dist2(actor.position, px, pz) > (roomy ? 2 : 0.5);
      if (clearOfOthers && clearOfProps && farEnough) {
        x = px;
        z = pz;
        break;
      }
    }
    this.#goTo(actor, x, z, actor.walkSpeed);
  }

  #chaseBall(dog, dt) {
    const { ball } = this;
    const onFloor = ball.position.y < 0.3;
    const reach = dog.breed.size.bodyLen * 0.5 + 0.2;
    const close = dist2(dog.position, ball.position.x, ball.position.z) < reach * reach;

    if (close && onFloor && Math.hypot(ball.velocity.x, ball.velocity.z) < 0.8) {
      v.set(ball.position.x - dog.position.x, 0, ball.position.z - dog.position.z).normalize();
      ball.nudge(v, 1.2 + Math.random() * 0.8);
      dog.express('happy');
      this.audio.squeak();
      if (Math.random() < 0.4) this.say?.(dog, 'Bolaku!', 1.6);
    }
    this.#walk(dog, ball.position.x, ball.position.z, dog.runSpeed, reach * 0.7, dt);
  }

  /** Jalan menuju titik sambil menghindar. Kembali true bila sudah sampai. */
  #walk(actor, x, z, topSpeed, arrive, dt) {
    const dx = x - actor.position.x;
    const dz = z - actor.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < arrive) {
      actor.speed = Math.max(0, actor.speed - dt * 2.6);
      return actor.speed < 0.05;
    }
    this.#stepToward(actor, dx / distance, dz / distance, topSpeed, dt, distance, arrive);
    return false;
  }

  #stepToward(actor, dirX, dirZ, topSpeed, dt, distance, arrive) {
    let dx = dirX;
    let dz = dirZ;
    for (const other of this.actors) {
      if (other === actor || actor.brain.arrive || Math.abs(other.position.y - actor.position.y) > 0.2) continue;
      const ox = actor.position.x - other.position.x;
      const oz = actor.position.z - other.position.z;
      const d = Math.hypot(ox, oz);
      const range = actor.radius + other.radius + 0.25;
      if (d < range && d > 1e-3) {
        const push = ((range - d) / range) * 1.5;
        dx += (ox / d) * push;
        dz += (oz / d) * push;
      }
    }
    for (const o of this.obstacles) {
      if (o.sofa && actor.brain.toSofa) continue;
      const ox = actor.position.x - o.x;
      const oz = actor.position.z - o.z;
      const d = Math.hypot(ox, oz);
      const range = o.r + actor.radius + 0.14;
      if (d < range && d > 1e-3) {
        const push = ((range - d) / range) * 2.2;
        dx += (ox / d) * push;
        dz += (oz / d) * push;
      }
    }

    const wanted = Math.atan2(dx, dz);
    const delta = wrap(wanted - actor.yaw);
    actor.yaw += clamp(delta, -TURN_RATE * dt, TURN_RATE * dt);

    // Melambat saat harus berbelok tajam dan saat mendekati tujuan, supaya tidak kaku.
    const facing = Math.max(0.28, Math.cos(delta));
    const slowDown = Number.isFinite(distance) ? smoothstep(distance, arrive, arrive + 0.42) : 1;
    const want = topSpeed * facing * (0.3 + 0.7 * slowDown);
    actor.speed += (want - actor.speed) * (1 - Math.exp(-5 * dt));

    actor.position.x += Math.sin(actor.yaw) * actor.speed * dt;
    actor.position.z += Math.cos(actor.yaw) * actor.speed * dt;
    this.#keepApart(actor);
    actor.position.x = clamp(actor.position.x, -this.world.walkX, this.world.walkX);
    actor.position.z = clamp(actor.position.z, -this.world.walkZ, this.world.walkZ);
  }

  // Batas keras: badan tidak boleh saling menembus, sekencang apa pun larinya.
  #keepApart(actor) {
    const solve = (x, z, minimum) => {
      const ox = actor.position.x - x;
      const oz = actor.position.z - z;
      const d = Math.hypot(ox, oz) || 1e-3;
      if (d < minimum) {
        actor.position.x += (ox / d) * (minimum - d);
        actor.position.z += (oz / d) * (minimum - d);
      }
    };
    for (const other of this.actors) {
      if (other === actor || Math.abs(other.position.y - actor.position.y) > 0.2) continue;
      const minimum = actor.radius + other.radius;
      if (actor.brain.arrive && other.isDog) {
        // Anjing yang dipanggil salaman punya prioritas: yang menghalangi bergeser memberi jalan.
        const ox = other.position.x - actor.position.x;
        const oz = other.position.z - actor.position.z;
        const d = Math.hypot(ox, oz) || 1e-3;
        if (d < minimum) {
          other.position.x += (ox / d) * (minimum - d);
          other.position.z += (oz / d) * (minimum - d);
        }
      } else {
        solve(other.position.x, other.position.z, minimum);
      }
    }
    for (const o of this.obstacles) {
      if (!(o.sofa && actor.brain.toSofa)) solve(o.x, o.z, o.r + actor.radius * 0.7);
    }
  }
}
