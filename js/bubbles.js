// Gelembung obrolan yang menempel di atas kepala tokoh.

import * as THREE from 'three';
import { LINES, pick } from './lines.js';

const POOL = 3;
const point = new THREE.Vector3();

export function createBubbles(camera, stage) {
  const layer = document.createElement('div');
  layer.className = 'bubbles';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const bubbles = Array.from({ length: POOL }, () => {
    const el = document.createElement('div');
    el.className = 'bubble';
    layer.appendChild(el);
    return { el, actor: null, timer: 0 };
  });
  let chatter = 6;
  let enabled = true;

  function say(actor, text, hold = 2.8) {
    const existing = bubbles.find((b) => b.actor === actor);
    const free = existing ?? bubbles.find((b) => !b.actor) ?? bubbles.reduce((a, b) => (a.timer < b.timer ? a : b));
    free.actor = actor;
    free.timer = hold;
    free.el.textContent = text;
    free.el.classList.add('is-on');
  }

  function isOnScreen(actor) {
    actor.headWorld(point);
    point.project(camera);
    return Math.abs(point.x) < 0.9 && Math.abs(point.y) < 0.9 && point.z < 1;
  }

  function update(dt, actors) {
    if (enabled) {
      chatter -= dt;
      if (chatter <= 0) {
        chatter = 6 + Math.random() * 7;
        const visible = actors.filter((a) => a.root.visible && isOnScreen(a) && !bubbles.some((b) => b.actor === a));
        if (visible.length) {
          const actor = pick(visible);
          say(actor, actor.poseName === 'sleep' ? 'Zzz...' : pick(LINES[actor.id]));
        }
      }
    }
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    for (const bubble of bubbles) {
      if (!bubble.actor) continue;
      bubble.timer -= dt;
      if (bubble.timer <= 0 || !bubble.actor.root.visible) {
        bubble.actor = null;
        bubble.el.classList.remove('is-on');
        continue;
      }
      bubble.actor.headWorld(point);
      point.y += bubble.actor.isDog ? 0.3 : 0.46;
      point.project(camera);
      const half = bubble.el.offsetWidth / 2 + 6;
      const x = Math.max(half, Math.min(width - half, ((point.x + 1) / 2) * width));
      const y = Math.max(44, ((1 - point.y) / 2) * height);
      bubble.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
  }

  return {
    say,
    update,
    setEnabled(value) {
      enabled = value;
    },
  };
}
