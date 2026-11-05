// Otak keluarga: siapa jalan ke mana, siapa mengejar bola, dan kapan pose berganti.

import * as THREE from 'three';
import { Dog } from './dog.js';
import { BREEDS, PHOTO_LOOKS } from './breeds.js';
import { Person, PEOPLE } from '../people/people.js';
import { THEMES, obstaclesFor } from '../world/room.js';

const LAYOUTS = {
  indoor: {
    kitty: { x: -1.22, z: 0.3, yaw: 0.22, pose: 'sploot' },
    jenges: { x: -0.42, z: -0.12, yaw: 0.1, pose: 'sit' },
    gemoy: { x: 0.42, z: 0.4, yaw: -0.16, pose: 'sploot' },
    pompom: { x: 1.26, z: -0.12, yaw: -0.24, pose: 'sit' },
    mama: { x: -1.9, z: -0.3, yaw: 0.34, pose: 'idle' },
    bapak: { x: 0, z: -1.02, yaw: 0, pose: 'idle' },
  },
  park: {
    kitty: { x: -1.5, z: 0.5, yaw: 0.4, pose: 'sploot' },
    jenges: { x: -0.5, z: 0.1, yaw: 0.1, pose: 'sit' },
    gemoy: { x: 0.5, z: 0.7, yaw: -0.2, pose: 'walk' },
    pompom: { x: 1.5, z: 0.2, yaw: -0.4, pose: 'sit' },
    mama: { x: -1, z: -1, yaw: 0.2, pose: 'idle' },
    bapak: { x: 0.8, z: -1.1, yaw: -0.2, pose: 'idle' },
  },
};

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
    this.themeId = 'room';
    this.world = THEMES.room.world;
    this.obstacles = obstaclesFor('room');
    this.dogs = BREEDS.map((breed) => new Dog(breed, quality));
    this.people = PEOPLE.map((data) => new Person(data, quality));
    this.actors = [...this.dogs, ...this.people];
    this.actors.forEach((actor) => scene.add(actor.root));
    this.dogs.forEach((dog) => dog.wardrobe.apply(PHOTO_LOOKS.foto2[dog.id]));

    this.chase = { active: false, timer: 0 };
    this.focus = null;
    this.active = null;
    this.steer = { x: 0, z: 0 };
    this.#place('indoor');
    this.dogs.forEach((dog) => (dog.brain.timer = 5 + Math.random() * 4));
  }

  byId(id) {
    return this.actors.find((a) => a.id === id);
  }

  setTheme(id) {
    this.themeId = id;
    this.world = THEMES[id].world;
    this.obstacles = obstaclesFor(id);
    this.ball.setLimits(this.world);
    this.ball.mesh.visible = false;
    this.chase.active = false;
    this.#place(this.world.roomy ? 'park' : 'indoor');
  }

  #place(layoutName) {
    const layout = LAYOUTS[layoutName];
    this.actors.forEach((actor) => {
      const spot = layout[actor.id];
      actor.position.set(spot.x, 0, spot.z);
      actor.yaw = spot.yaw;
      actor.speed = 0;
      actor.stepping = 0;
      const pose = spot.pose === 'walk' ? actor.idlePose : spot.pose;
      actor.poseName = pose;
      actor.prevName = pose;
      actor.blend = 1;
      const brain = actor.brain;
      brain.mode = 'rest';
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
    const brain = actor.brain;
    brain.then = null;
    brain.chasing = false;
    brain.manual = true;
    if (poseId === 'walk') {
      this.#goSomewhere(actor);
      return;
    }
    actor.speed = 0;
    actor.stepping = 0;
    actor.setPose(poseId);
    brain.mode = 'rest';
    brain.timer = 9 + Math.random() * 5;
  }

  /** Jalan ke titik yang dipilih pengguna di taman. */
  walkTo(actor, x, z) {
    const b = actor.brain;
    b.chasing = false;
    b.manual = true;
    this.#goTo(actor, x, z, actor.runSpeed * 0.8, () => this.#rest(actor, actor.idlePose, 8));
  }

  throwBall(x, z) {
    this.ball.throwTo(x, z);
    this.chase.active = true;
    this.chase.timer = 11;
    this.dogs.forEach((dog) => (dog.brain.chasing = false));
    const sorted = [...this.dogs].sort((a, b) => dist2(a.position, x, z) - dist2(b.position, x, z));
    sorted.slice(0, 2).forEach((dog) => {
      dog.brain.chasing = true;
      dog.brain.mode = 'go';
      dog.brain.manual = false;
      dog.setPose('walk');
    });
  }

  feed(dog) {
    const ahead = 0.3 + dog.breed.size.bodyLen * 0.5 + dog.breed.size.snoutLen;
    const brain = dog.brain;
    brain.chasing = false;
    this.say?.(dog, 'Nyam nyam!');
    brain.mode = 'eat';
    brain.timer = 1.8;
    dog.speed = 0;
    dog.setPose('eat');
    return new THREE.Vector3(dog.position.x + Math.sin(dog.yaw) * ahead * 0.8, 0.02, dog.position.z + Math.cos(dog.yaw) * ahead * 0.8);
  }

  /** Semua anjing berlari ke tokoh ini, duduk melingkar di depannya, dan menghadapnya. */
  callDogs(person) {
    const count = this.dogs.length;
    this.dogs.forEach((dog, i) => {
      const angle = person.yaw + (i - (count - 1) / 2) * 0.72;
      const reach = person.radius + dog.radius + 0.28;
      const x = clamp(person.position.x + Math.sin(angle) * reach, -this.world.walkX, this.world.walkX);
      const z = clamp(person.position.z + Math.cos(angle) * reach, -this.world.walkZ, this.world.walkZ);
      const b = dog.brain;
      b.chasing = false;
      b.manual = true;
      this.#goTo(dog, x, z, dog.runSpeed, () => {
        this.#turnTo(dog, angleTo(dog.position, person.position.x, person.position.z), () => {
          this.#rest(dog, 'sit', 7 + Math.random() * 3);
          dog.express('happy');
        });
      });
    });
  }

  /**
   * Perintah Mama atau Bapak ke satu anjing atau semuanya:
   * come = datang, sit = duduk, shake = salaman, bark = gonggong. Semua dilakukan di depan tokohnya.
   */
  order(person, dogs, action) {
    const pb = person.brain;
    pb.then = null;
    pb.manual = true;
    person.speed = 0;
    person.stepping = 0;
    pb.mode = 'rest';
    pb.timer = 8;
    person.setPose(action === 'come' ? 'wave' : action === 'shake' ? person.idlePose : 'point');

    const count = dogs.length;
    dogs.forEach((dog, i) => {
      const angle = person.yaw + (i - (count - 1) / 2) * (count > 1 ? 0.72 : 0);
      // Saat salaman jaraknya diukur dari panjang badan, supaya kaki depan pas di tangan.
      const paws = (dog.breed.size.bodyLen * 0.45 + dog.m.fore * 0.68) * dog.scale;
      const close = action === 'shake' && i === 0 ? paws + person.data.height * 0.2 : dog.radius + person.radius + 0.28;
      const x = clamp(person.position.x + Math.sin(angle) * close, -this.world.walkX, this.world.walkX);
      const z = clamp(person.position.z + Math.cos(angle) * close, -this.world.walkZ, this.world.walkZ);
      const b = dog.brain;
      b.chasing = false;
      b.manual = true;
      b.arrive = action === 'shake' && i === 0 ? 0.03 : 0;
      this.#goTo(dog, x, z, dog.runSpeed, () => {
        b.arrive = 0;
        this.#turnTo(dog, angleTo(dog.position, person.position.x, person.position.z), () => {
          if (action === 'shake') {
            this.#rest(dog, 'shake', 6);
            dog.express('happy');
            this.say?.(dog, `Salam, ${person.name}!`);
            if (i === 0) {
              // Mama atau Bapak ikut menghadap anjing itu sebelum menyambut kakinya.
              person.yaw = angleTo(person.position, dog.position.x, dog.position.z);
              person.reach = { target: dog.rig.legs[1].ankle, arm: 0, lift: 0.03, pat: false };
              person.setPose('shakeHand');
              person.brain.mode = 'rest';
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
      const b = actor.brain;
      b.chasing = false;
      b.manual = true;
      spot.done = false;
      this.#goTo(actor, spot.x, spot.z, actor.runSpeed, () => {
        this.#turnTo(actor, spot.yaw, () => {
          spot.done = true;
          this.placed += 1;
          this.#rest(actor, actor.idlePose, 1e9);
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
      actor.position.set(spot.x, 0, spot.z);
      actor.yaw = spot.yaw;
      actor.speed = 0;
      actor.brain.then = null;
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
      b.loop = false;
      b.mode = 'rest';
      b.manual = false;
      b.timer = 1 + Math.random() * 3;
      actor.lookOverride = null;
      if (actor.poseFinished || actor.poseName === 'beg' || actor.poseName === 'bow') actor.setPose(actor.idlePose);
    });
  }

  /** Tokoh berjalan ke anjing terdekat lalu mengelusnya. */
  petNearest(person) {
    const dog = [...this.dogs].sort((a, b) => dist2(a.position, person.position.x, person.position.z) - dist2(b.position, person.position.x, person.position.z))[0];
    this.petDog(person, dog);
  }

  petDog(person, dog) {
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
        pb.mode = 'patting';
        pb.timer = 4.2;
        pb.patDog = dog;
        pb.patTick = 0;
      });
    });
  }

  /** Mode Elus: anjing menghadap kamera lalu duduk, tokoh lain berhenti di tempat. */
  enterPet(dog, cameraPosition) {
    this.focus = dog;
    dog.brain.chasing = false;
    dog.brain.manual = true;
    const yaw = angleTo(dog.position, cameraPosition.x, cameraPosition.z);
    this.#turnTo(dog, yaw, () => this.#rest(dog, 'sit', 1e9));
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
    if (this.chase.active) {
      this.chase.timer -= dt;
      if (this.chase.timer <= 0) this.#endChase();
    }
    this.#bumpBall();
    for (const actor of this.actors) {
      if (this.focus && actor !== this.focus) {
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
    actor.stepping = 0;
    if (actor.poseName === 'walk' && actor.speed < 0.05) actor.setPose(actor.idlePose);
    actor.brain.mode = 'rest';
    actor.brain.then = null;
    actor.brain.chasing = false;
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

    // Dikendalikan tombol panah
    if (!this.locked && actor === this.active && actor !== this.focus && (this.steer.x || this.steer.z)) {
      brain.chasing = false;
      brain.then = null;
      brain.manual = true;
      brain.mode = 'driven';
      if (actor.poseName !== 'walk') actor.setPose('walk');
      this.#stepToward(actor, this.steer.x, this.steer.z, actor.runSpeed, dt, Infinity, 0);
      return;
    }
    if (brain.mode === 'driven') this.#rest(actor, actor.idlePose, 7);

    if (brain.chasing) {
      this.#chaseBall(actor, dt);
      return;
    }
    if (brain.mode === 'turn') {
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
    if (brain.mode === 'go') {
      const arrived = this.#walk(actor, brain.target.x, brain.target.z, brain.topSpeed, brain.arrive || 0.14, dt);
      brain.timer -= dt;
      if (arrived || brain.timer <= 0) {
        actor.speed = 0;
        const then = brain.then;
        brain.then = null;
        if (then) then();
        else this.#rest(actor, this.#pickRestPose(actor));
      }
      return;
    }
    if (brain.mode === 'patting') {
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
      if (brain.timer < 1e8) brain.timer = Math.min(brain.timer, 2.5 + Math.random() * 2);
    }
    if (brain.timer <= 0 && !this.locked) {
      brain.manual = false;
      if (brain.mode === 'eat') brain.mode = 'rest';
      if (!this.autoRoam) {
        brain.timer = 4;
      } else if (actor.isDog || this.world.roomy) {
        this.#goSomewhere(actor);
      } else {
        // Di ruangan sempit, Mama dan Bapak cukup bergaya di tempat.
        this.#rest(actor, this.#pickRestPose(actor), 6 + Math.random() * 6);
      }
    }
  }

  #pickRestPose(actor) {
    const list = actor.favourites.filter((p) => p !== 'walk');
    return list[Math.floor(Math.random() * list.length)];
  }

  #rest(actor, pose, hold) {
    actor.setPose(pose);
    actor.stepping = 0;
    actor.brain.mode = 'rest';
    actor.brain.timer = hold ?? (pose === 'sleep' ? 9 : 4) + Math.random() * 4;
  }

  #goTo(actor, x, z, speed, then = null) {
    const b = actor.brain;
    b.target.set(x, 0, z);
    b.topSpeed = speed;
    b.then = then;
    b.mode = 'go';
    b.timer = Math.hypot(x - actor.position.x, z - actor.position.z) / speed * 2 + 4;
    actor.stepping = 0;
    actor.setPose('walk');
  }

  #turnTo(actor, yaw, then) {
    const b = actor.brain;
    b.faceYaw = yaw;
    b.then = then;
    b.mode = 'turn';
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
      if (other === actor || actor.brain.arrive) continue;
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
      if (other === actor) continue;
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
    for (const o of this.obstacles) solve(o.x, o.z, o.r + actor.radius * 0.7);
  }
}
