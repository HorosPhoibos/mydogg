// IK dua tulang: dari titik sasaran, hitung sudut pangkal dan sendi tengah pada bidang tungkai.
// Dipakai kaki anjing dan kaki manusia.

import * as THREE from 'three';

const { clamp } = THREE.MathUtils;

/** tx, ty, tz adalah sasaran dalam kerangka induk pangkal. Mengembalikan sudut tulang bawah. */
export function solveTwoBone(leg, tx, ty, tz) {
  const dx = tx - leg.hip.position.x;
  const dy = ty - leg.hip.position.y;
  const dz = tz - leg.hip.position.z;

  const down = Math.max(Math.hypot(dx, dy), 1e-4);
  const abduct = Math.atan2(dx, Math.max(-dy, 1e-4));
  const { a, b } = leg;
  const c = clamp(Math.hypot(down, dz), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  const signedDown = dy < 0 ? down : -down;
  const phi = Math.atan2(dz, signedDown);

  const angleA = Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c), -1, 1));
  const angleB = Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c), -1, 1));
  const phi1 = phi + angleA * leg.bend;
  const phi2 = phi - angleB * leg.bend;

  leg.hip.rotation.set(-phi1, 0, clamp(abduct, -0.6, 0.6));
  leg.knee.rotation.x = phi1 - phi2;
  return phi2;
}

export class Spring {
  constructor(stiffness = 60, damping = 9, value = 0) {
    this.k = stiffness;
    this.c = damping;
    this.x = value;
    this.v = 0;
  }
  step(target, dt) {
    this.v += (this.k * (target - this.x) - this.c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}
