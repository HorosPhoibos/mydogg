// Satu anjing yang hidup: memadukan pose, menyelesaikan IK kaki, dan menambah gerak sekunder.

import * as THREE from 'three';
import { buildRig } from './rig.js';
import { solveTwoBone, Spring } from './ik.js';
import { Wardrobe } from './wardrobe.js';
import { POSES, EXPRESSIONS, createPoseState, blendPose } from './poses.js';

const BLEND_TIME = 0.5;
const DOG_SCALE = 1.04;
const NOSE_MEMORY = 4;
const tmpV = new THREE.Vector3();
const tmpW = new THREE.Vector3();

const easeInOut = (t) => t * t * (3 - 2 * t);

export class Dog {
  constructor(breed, quality) {
    this.breed = breed;
    this.id = breed.id;
    this.name = breed.name;
    this.isDog = true;
    this.idlePose = 'sit';
    this.favourites = breed.favourites;
    this.rig = buildRig(breed, quality);
    this.root = this.rig.root;
    this.root.scale.setScalar(DOG_SCALE);
    this.m = this.rig.measures;
    this.wardrobe = new Wardrobe(this.rig, breed, quality);

    this.position = this.root.position;
    this.yaw = 0;
    this.speed = 0;
    this.stepping = 0;
    this.radius = breed.size.bodyLen * 0.5 * DOG_SCALE + 0.1;
    this.scale = DOG_SCALE;
    this.walkSpeed = 0.42 * (0.8 + this.m.fore * 0.9);
    this.runSpeed = 0.95 * (0.7 + this.m.fore);

    this.poseName = 'sit';
    this.poseTime = Math.random() * 10;
    this.prevName = 'sit';
    this.prevTime = 0;
    this.blend = 1;
    this.a = createPoseState();
    this.b = createPoseState();
    this.o = createPoseState();
    this.gait = Math.random();
    this.stride = Math.min(0.03 + this.m.fore * 0.22, 0.075);

    this.expression = null;
    this.expressionTime = 0;
    this.talking = false;
    this.mouth = 0;

    this.blinkTimer = 1 + Math.random() * 4;
    this.blinkT = 1;

    this.lookPoint = null;
    this.lookOverride = null;
    this.headFollow = 1;
    this.lookYaw = new Spring(26, 8);
    this.lookPitch = new Spring(26, 8);
    this.eyeYaw = new Spring(170, 22);
    this.eyePitch = new Spring(170, 22);
    this.earSprings = [new Spring(90, 7), new Spring(90, 7)];
    this.tailSpring = new Spring(70, 8);
    this.noseSpring = new Spring(240, 11, 1);
    this.noseBase = this.rig.nose.scale.clone();
    this.nosePresses = 0;
    this.noseTimer = 0;
    this.prevHeadPitch = 0;
    this.prevSpeed = 0;

    this.ctx = { gait: 0, stride: this.stride };
    this.brain = { mode: 'rest', timer: 1 + Math.random() * 2, target: new THREE.Vector3(), then: null, faceYaw: 0, manual: false };
  }

  setPose(name) {
    if (this.poseName === name) {
      if (POSES[name].duration) this.poseTime = 0;
      return;
    }
    // Pose yang sedang ditinggal tetap dievaluasi selama blend, jadi tak ada lompatan.
    this.prevName = this.poseName;
    this.prevTime = this.poseTime;
    this.poseName = name;
    this.poseTime = 0;
    this.blend = 0;
  }

  express(name) {
    this.expression = name;
    this.expressionTime = 0;
  }

  get poseFinished() {
    const duration = POSES[this.poseName].duration;
    return duration ? this.poseTime >= duration : false;
  }

  get isAngry() {
    return this.poseName === 'angry';
  }

  /** Hidung dipencet. Mengembalikan jumlah pencetan beruntun, 3 berarti marah. */
  boop() {
    this.noseSpring.v = -9;
    if (this.isAngry) return 3;
    this.nosePresses += 1;
    this.noseTimer = NOSE_MEMORY;
    const count = this.nosePresses;
    if (count >= 3) {
      this.nosePresses = 0;
      this.expression = null;
      this.setPose('angry');
    } else {
      this.express(count === 1 ? 'boop' : 'annoyed');
    }
    return count;
  }

  /** Telinga bergoyang saat kepala diusap. */
  tickle() {
    this.earSprings[0].v += 3.5;
    this.earSprings[1].v -= 3.5;
  }

  update(dt, time) {
    this.poseTime += dt;
    this.prevTime += dt;
    this.blend = Math.min(1, this.blend + dt / BLEND_TIME);
    if (this.noseTimer > 0) {
      this.noseTimer -= dt;
      if (this.noseTimer <= 0) this.nosePresses = 0;
    }

    this.gait = (this.gait + ((this.speed / DOG_SCALE + this.stepping) * dt) / (this.stride * 4)) % 1;
    this.ctx.gait = this.gait;

    POSES[this.poseName].fn(this.b, this.m, this.poseTime, this.ctx);
    let o = this.b;
    if (this.blend < 1) {
      POSES[this.prevName].fn(this.a, this.m, this.prevTime, this.ctx);
      blendPose(this.o, this.a, this.b, easeInOut(this.blend));
      o = this.o;
    }

    this.#applyExpression(o, dt, time);
    this.#blink(o, dt);
    this.#apply(o, dt, time);
  }

  #applyExpression(o, dt, time) {
    if (this.talking) {
      EXPRESSIONS.talk.apply(o, 1, time, this.mouth);
    }
    if (!this.expression) return;
    const def = EXPRESSIONS[this.expression];
    this.expressionTime += dt;
    const t = this.expressionTime;
    if (t >= def.duration) {
      this.expression = null;
      return;
    }
    const fade = Math.min(0.22, def.duration / 2);
    const envelope = Math.min(1, t / fade, (def.duration - t) / fade);
    def.apply(o, easeInOut(Math.max(envelope, 0)), time);
  }

  #blink(o, dt) {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2 + Math.random() * 5;
      this.blinkT = 0;
    }
    this.blinkT = Math.min(1, this.blinkT + dt / 0.16);
    const closure = 1 - Math.sin(this.blinkT * Math.PI);
    o.eyeL *= closure;
    o.eyeR *= closure;
  }

  #apply(o, dt, time) {
    const r = this.rig;
    const m = this.m;
    this.root.rotation.y = this.yaw;

    r.body.position.y = o.hop;
    r.body.rotation.set(0, o.spin, o.roll);
    r.pelvis.position.set(0, o.y, -m.L / 2 + o.z);
    r.pelvis.rotation.x = -o.pitch;
    r.chest.rotation.x = -o.spine;
    r.neck.rotation.x = -o.neck;

    // Lihat titik sasaran (kursor atau bola), dibatasi agar lehernya masuk akal.
    let wantYaw = 0;
    let wantPitch = 0;
    const point = this.lookOverride ?? this.lookPoint;
    if (point && o.lookWeight > 0.01) {
      r.head.getWorldPosition(tmpV);
      tmpW.subVectors(point, tmpV);
      const heading = Math.atan2(tmpW.x, tmpW.z) - this.yaw - o.spin;
      const wrapped = Math.atan2(Math.sin(heading), Math.cos(heading));
      wantYaw = THREE.MathUtils.clamp(wrapped, -1, 1) * o.lookWeight;
      if (Math.abs(wrapped) > 2.3) wantYaw = 0;
      wantPitch = THREE.MathUtils.clamp(Math.atan2(tmpW.y, Math.hypot(tmpW.x, tmpW.z)), -0.45, 0.5) * o.lookWeight;
    }
    const yaw = this.lookYaw.step(wantYaw * this.headFollow, dt);
    const lookPitch = this.lookPitch.step(wantPitch * this.headFollow, dt);

    const absolutePitch = o.pitch + o.spine + o.neck;
    const headPitch = o.look + lookPitch - absolutePitch;
    r.head.rotation.set(-headPitch, yaw * 0.9 + o.headYaw, o.headRoll, 'YXZ');

    // Mulut, lidah, hidung
    r.jaw.rotation.x = Math.max(o.jaw, 0) * 0.9;
    r.tongue.rotation.x = 0.1 - (o.jaw - 0.22) * 0.25;
    r.tongue.scale.setScalar(Math.max(0.001, 0.32 + 0.68 * o.tongue));
    r.tongue.scale.z = Math.max(0.001, o.tongue);
    const squish = this.noseSpring.step(1, dt);
    r.nose.scale.set(this.noseBase.x * (2 - squish), this.noseBase.y * (2 - squish), this.noseBase.z * squish);

    // Mata: tutup lewat tinggi kelopak, lirik lewat iris.
    r.eyes[0].scale.y = Math.max(0.08, o.eyeL);
    r.eyes[1].scale.y = Math.max(0.08, o.eyeR);
    let eyeYaw = 0;
    let eyePitch = 0;
    if (point) {
      r.head.worldToLocal(tmpW.copy(point));
      tmpW.sub(r.eyes[0].position);
      tmpW.x += r.eyes[0].position.x;
      eyeYaw = THREE.MathUtils.clamp(Math.atan2(tmpW.x, Math.max(tmpW.z, 0.05)), -0.62, 0.62);
      eyePitch = THREE.MathUtils.clamp(Math.atan2(tmpW.y, Math.hypot(tmpW.x, tmpW.z)), -0.45, 0.45);
    }
    const eyeX = this.eyeYaw.step(eyeYaw, dt);
    const eyeY = this.eyePitch.step(eyePitch, dt);
    r.eyes.forEach((eye) => eye.userData.iris.rotation.set(-eyeY, eyeX, 0, 'YXZ'));

    // Alis dan tanda marah
    const brow = THREE.MathUtils.clamp(o.brow, 0, 1);
    r.brows.forEach((b) => {
      b.visible = brow > 0.03;
      b.rotation.z = Math.PI / 2 + b.userData.side * (0.1 + 0.55 * brow);
      b.scale.setScalar(Math.max(brow, 0.01));
    });
    r.anger.visible = brow > 0.75;
    if (r.anger.visible) {
      r.anger.rotation.set(time * 3, time * 5, 0);
      r.anger.scale.setScalar(0.85 + Math.sin(time * 16) * 0.16);
    }

    // Telinga dan ekor punya pegas sendiri: terlambat sedikit dari kepala, seperti kain sungguhan.
    const headVelocity = (headPitch - this.prevHeadPitch) / Math.max(dt, 1e-3);
    this.prevHeadPitch = headPitch;
    const accel = (this.speed - this.prevSpeed) / Math.max(dt, 1e-3);
    this.prevSpeed = this.speed;
    const hopKick = o.hop > 0.01 ? 0.5 : 0;
    const upright = this.breed.ear.type === 'upright';
    r.ears.forEach((ear, i) => {
      const rest = ear.userData.rest;
      const swing = this.earSprings[i].step(o.ear + headVelocity * 0.03 - accel * 0.05 + hopKick * (upright ? 0.1 : 1), dt);
      const limited = THREE.MathUtils.clamp(swing, -0.9, 0.9);
      ear.rotation.x = rest.x + limited * (upright ? 0.25 : 0.55);
      ear.rotation.z = rest.z + (i === 0 ? 1 : -1) * limited * (upright ? 0.15 : 0.5);
    });
    r.tailBase.rotation.set(-o.tailLift, o.tailWag, 0);
    r.tailTip.rotation.y = this.tailSpring.step(o.tailWag * 0.85, dt);

    r.root.updateMatrixWorld(true);
    this.#solveLeg(r.legs[0], o.fl, o);
    this.#solveLeg(r.legs[1], o.fr, o);
    this.#solveLeg(r.legs[2], o.hl, o);
    this.#solveLeg(r.legs[3], o.hr, o);
  }

  // Target adalah titik telapak dalam kerangka "body".
  #solveLeg(leg, target, o) {
    tmpV.set(target[0], target[1] + this.m.pawH, target[2]);
    this.rig.body.localToWorld(tmpV);
    leg.hip.parent.worldToLocal(tmpV);
    const phi2 = solveTwoBone(leg, tmpV.x, tmpV.y, tmpV.z);
    // Telapak selalu sejajar dengan kerangka badan supaya menapak rata.
    leg.ankle.rotation.x = phi2 + o.pitch + (leg.isFore ? o.spine : 0);
  }

  headWorld(target) {
    return this.rig.head.getWorldPosition(target);
  }

  chestWorld(target) {
    return this.rig.chest.getWorldPosition(target);
  }
}
