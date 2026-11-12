// Bola benang yang bisa dilempar. Fisikanya kecil saja: gravitasi, pantul, dan gesek.

import * as THREE from 'three';
import { knitBall } from '../yarn/loft.js';

const RADIUS = 0.085;

export function createBall(quality) {
  const paint = ({ row }) => {
    const band = row % 16;
    return band < 5 ? 0xf1c232 : band < 11 ? 0xd9403b : 0xf4ead2;
  };
  const mesh = knitBall(RADIUS, { stitch: 'bar', w: 0.034, h: 0.015, depth: 0.012, paint, quality, darken: 0.6 });
  mesh.visible = false;
  mesh.position.y = RADIUS;

  const velocity = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const spin = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  let gravity = 5.2;
  let limitX = 2.2;
  let limitZ = 1.5;

  const ball = {
    mesh,
    velocity,
    active: false,
    get position() {
      return mesh.position;
    },
    get resting() {
      return mesh.position.y <= RADIUS + 0.002 && velocity.lengthSq() < 0.02;
    },
    setGravity(value) {
      gravity = value;
    },
    setLimits(world) {
      limitX = world.halfX - RADIUS - 0.05;
      limitZ = world.halfZ - RADIUS - 0.05;
    },
    throwTo(x, z, from = { x: x * 0.8, y: 1.2, z: z + 1.8 }) {
      const duration = 0.85;
      mesh.visible = true;
      ball.active = true;
      mesh.position.set(from.x, from.y, from.z);
      velocity.set(
        (x - from.x) / duration,
        (RADIUS - from.y + 0.5 * gravity * duration * duration) / duration,
        (z - from.z) / duration,
      );
    },
    nudge(direction, power) {
      velocity.x += direction.x * power;
      velocity.z += direction.z * power;
      velocity.y += 0.55;
    },
    update(dt) {
      if (!mesh.visible) return;
      velocity.y -= gravity * dt;
      mesh.position.addScaledVector(velocity, dt);

      if (mesh.position.y < RADIUS) {
        mesh.position.y = RADIUS;
        velocity.y = velocity.y < -0.45 ? -velocity.y * 0.48 : 0;
        const friction = Math.exp(-1.15 * dt);
        velocity.x *= friction;
        velocity.z *= friction;
      }
      if (Math.abs(mesh.position.x) > limitX) {
        mesh.position.x = Math.sign(mesh.position.x) * limitX;
        velocity.x *= -0.55;
      }
      if (Math.abs(mesh.position.z) > limitZ) {
        mesh.position.z = Math.sign(mesh.position.z) * limitZ;
        velocity.z *= -0.55;
      }

      const speed = Math.hypot(velocity.x, velocity.z);
      if (speed > 0.001) {
        axis.set(velocity.x, 0, velocity.z).cross(up).negate().normalize();
        spin.setFromAxisAngle(axis, (speed * dt) / RADIUS);
        mesh.quaternion.premultiply(spin);
      }
    },
  };
  return ball;
}
