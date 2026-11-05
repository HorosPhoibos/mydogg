// Pose ditulis sebagai fungsi murni dari waktu dan ukuran badan, dan kaki selalu lewat IK.
// Jadi Gemoy yang berkaki pendek dan Pompom yang tinggi memakai definisi pose yang sama,
// dan telapak kaki tidak pernah mengambang atau menembus lantai.

const NUMERIC = ['y', 'z', 'pitch', 'spine', 'neck', 'look', 'headYaw', 'headRoll', 'jaw', 'tongue', 'ear', 'tailLift', 'tailWag', 'roll', 'spin', 'hop', 'eyeL', 'eyeR', 'lookWeight', 'brow'];
const PAWS = ['fl', 'fr', 'hl', 'hr'];

export function createPoseState() {
  const o = {};
  for (const key of NUMERIC) o[key] = 0;
  for (const key of PAWS) o[key] = [0, 0, 0];
  return o;
}

export function blendPose(out, a, b, k) {
  for (const key of NUMERIC) out[key] = a[key] + (b[key] - a[key]) * k;
  for (const key of PAWS) {
    for (let i = 0; i < 3; i++) out[key][i] = a[key][i] + (b[key][i] - a[key][i]) * k;
  }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, t) => {
  const u = clamp((t - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
const set = (arr, x, y, z) => {
  arr[0] = x;
  arr[1] = y;
  arr[2] = z;
};

function standY(m) {
  return m.hind * 0.93 + m.pawH + m.hipDrop;
}

// Kemiringan badan agar bahu pas di atas kaki depan.
function levelPitch(m, pelvisY, shoulderHeight) {
  const shoulderInPelvis = -m.shoulderDrop + 0.012;
  return Math.asin(clamp((shoulderHeight - (pelvisY + shoulderInPelvis)) / m.L, -0.98, 0.98));
}

function base(o, m, t) {
  o.y = standY(m);
  o.z = 0;
  o.pitch = levelPitch(m, o.y, m.fore * 0.95 + m.pawH);
  o.spine = 0;
  o.neck = 0;
  o.look = 0.05;
  o.headYaw = 0;
  o.headRoll = 0;
  o.jaw = 0.22 + Math.sin(t * 9) * 0.06;
  o.tongue = 0.9;
  o.ear = 0;
  o.tailLift = 0.3;
  o.tailWag = Math.sin(t * 4.2) * 0.28;
  o.roll = 0;
  o.spin = 0;
  o.hop = 0;
  o.eyeL = 1;
  o.eyeR = 1;
  o.lookWeight = 1;
  o.brow = 0;
  const hz = -m.L / 2;
  const fz = m.L / 2;
  set(o.fl, -m.shoulderX, 0, fz);
  set(o.fr, m.shoulderX, 0, fz);
  set(o.hl, -m.hipX, 0, hz);
  set(o.hr, m.hipX, 0, hz);
}

// Posisi bahu pada kerangka badan, dipakai pose yang mengangkat kaki depan.
function shoulderAt(o, m) {
  const c = Math.cos(o.pitch);
  const s = Math.sin(o.pitch);
  const dropY = -m.shoulderDrop + 0.012;
  return {
    y: o.y + s * m.L + c * dropY,
    z: -m.L / 2 + o.z + c * m.L - s * dropY,
  };
}

function poseSit(o, m, t) {
  base(o, m, t);
  o.y = m.rumpY * 0.96 + 0.002;
  o.z = -m.L * 0.02;
  o.pitch = clamp(levelPitch(m, o.y, m.fore * 0.98 + m.pawH), 0.1, 1.05);
  o.spine = o.pitch * 0.08;
  o.neck = -o.pitch * 0.5;
  const breath = Math.sin(t * 2.1) * 0.006;
  o.pitch += breath;
  const shoulder = shoulderAt(o, m);
  set(o.fl, -m.shoulderX, 0, shoulder.z + 0.012);
  set(o.fr, m.shoulderX, 0, shoulder.z + 0.012);
  const hz = -m.L / 2 + o.z + m.hind * 0.5;
  set(o.hl, -m.hipX - 0.026, 0, hz);
  set(o.hr, m.hipX + 0.026, 0, hz);
  o.tailLift = -0.5;
  o.tailWag = Math.sin(t * 5) * 0.24;
}

function poseStand(o, m, t) {
  base(o, m, t);
  o.y += Math.sin(t * 2.1) * 0.003;
}

function poseWalk(o, m, t, ctx) {
  base(o, m, t);
  const phase = ctx.gait;
  const A = ctx.stride;
  const lift = Math.max(m.fore * 0.26, 0.032);
  const paw = (arr, x, baseZ, offset) => {
    const p = (phase + offset) % 1;
    if (p < 0.5) {
      set(arr, x, 0, baseZ + A * (1 - p * 4));
    } else {
      const u = (p - 0.5) * 2;
      const eased = u * u * (3 - 2 * u);
      set(arr, x, Math.sin(u * Math.PI) * lift, baseZ + A * (-1 + 2 * eased));
    }
  };
  const fz = m.L / 2;
  const hz = -m.L / 2;
  paw(o.fl, -m.shoulderX, fz, 0);
  paw(o.fr, m.shoulderX, fz, 0.5);
  paw(o.hl, -m.hipX, hz, 0.5);
  paw(o.hr, m.hipX, hz, 0);

  const beat = Math.sin(phase * Math.PI * 4);
  o.y += beat * 0.006;
  o.pitch += Math.cos(phase * Math.PI * 4) * 0.012;
  o.roll = Math.sin(phase * Math.PI * 2) * 0.022;
  o.look = 0.02 - beat * 0.018;
  o.tailLift = 0.42;
  o.tailWag = Math.sin(phase * Math.PI * 2) * 0.32;
  o.ear = -beat * 0.12;
  o.jaw = 0.28 + Math.sin(t * 11) * 0.05;
  o.lookWeight = 0.35;
}

function poseSploot(o, m, t) {
  base(o, m, t);
  o.y = m.bellyY * 0.9 + 0.006;
  o.pitch = 0.035;
  o.neck = 0.02;
  o.look = 0.02;
  o.y += Math.sin(t * 1.8) * 0.0025;
  const shoulder = shoulderAt(o, m);
  const fz = shoulder.z + m.fore * 0.74;
  set(o.fl, -m.shoulderX - 0.012, 0, fz);
  set(o.fr, m.shoulderX + 0.012, 0, fz);
  const hz = -m.L / 2 - m.hind * 0.86;
  set(o.hl, -m.hipX - 0.05, 0, hz);
  set(o.hr, m.hipX + 0.05, 0, hz);
  o.tailLift = -0.35;
  o.tailWag = Math.sin(t * 3.6) * 0.2;
}

function poseSleep(o, m, t) {
  poseSploot(o, m, t);
  o.y = m.bellyY * 0.88 + 0.004 + Math.sin(t * 1.3) * 0.004;
  o.neck = -0.46;
  o.look = -0.22;
  o.headRoll = 0.14;
  const hz = -m.L / 2 + m.hind * 0.42;
  set(o.hl, -m.hipX - 0.05, 0, hz);
  set(o.hr, m.hipX + 0.05, 0, hz);
  o.jaw = 0;
  o.tongue = 0;
  o.eyeL = 0;
  o.eyeR = 0;
  o.tailWag = 0;
  o.tailLift = -0.6;
  o.ear = 0.2;
  o.lookWeight = 0;
}

function poseBow(o, m, t) {
  base(o, m, t);
  const bounce = Math.sin(t * 7.5);
  o.y = standY(m) * 0.98 + bounce * 0.008;
  const chestLow = m.chestY * 0.82 + m.shoulderDrop * 0.2;
  o.pitch = levelPitch(m, o.y, chestLow) + bounce * 0.01;
  o.neck = -o.pitch * 0.8;
  o.look = 0.06;
  const shoulder = shoulderAt(o, m);
  const fz = shoulder.z + m.fore * 0.74;
  set(o.fl, -m.shoulderX - 0.01, 0, fz);
  set(o.fr, m.shoulderX + 0.01, 0, fz);
  o.tailLift = 0.75;
  o.tailWag = Math.sin(t * 15) * 0.6;
  o.ear = -0.15;
  o.jaw = 0.34;
}

function poseBeg(o, m, t) {
  base(o, m, t);
  const sway = Math.sin(t * 4.6);
  o.y = m.hind * 0.68 + m.pawH + m.hipDrop + Math.abs(Math.sin(t * 4.6)) * 0.012;
  o.z = -m.L * 0.34;
  o.pitch = 1.12;
  o.spine = -0.08;
  o.neck = -0.72;
  o.look = 0.12;
  o.headRoll = sway * 0.1;
  o.roll = sway * 0.055;
  const shoulder = shoulderAt(o, m);
  const reachY = shoulder.y - m.fore * 0.62;
  const reachZ = shoulder.z + m.fore * 0.46;
  set(o.fl, -m.shoulderX, reachY - m.pawH + sway * 0.022, reachZ);
  set(o.fr, m.shoulderX, reachY - m.pawH - sway * 0.022, reachZ);
  const hz = -m.L / 2 + o.z + 0.02;
  set(o.hl, -m.hipX - 0.02, 0, hz);
  set(o.hr, m.hipX + 0.02, 0, hz);
  o.tailLift = -0.3;
  o.tailWag = Math.sin(t * 13) * 0.45;
  o.jaw = 0.34 + sway * 0.06;
}

function poseShake(o, m, t) {
  poseSit(o, m, t);
  const shoulder = shoulderAt(o, m);
  const wave = Math.sin(t * 7);
  set(o.fr, m.shoulderX, shoulder.y - m.fore * 0.5 - m.pawH + wave * 0.02, shoulder.z + m.fore * 0.68);
  o.headRoll = -0.2;
  o.look = 0.2;
  o.tailWag = Math.sin(t * 11) * 0.42;
}

function poseRoll(o, m, t) {
  base(o, m, t);
  const k = smooth(0.15, 0.95, t) * (1 - smooth(3.0, 3.8, t));
  const lying = m.bellyY * 0.94;
  const settle = smooth(0, 0.4, t) * (1 - smooth(3.5, 3.9, t));
  o.y = standY(m) + (lying - standY(m)) * settle;
  o.pitch = 0.03;
  o.roll = k * Math.PI;
  o.hop = o.y * (1 - Math.cos(o.roll));

  const wiggle = Math.sin(t * 13) * k;
  const fy = o.y - m.fore * 0.68 - m.pawH;
  const hy = o.y - m.hind * 0.68 - m.pawH;
  const shoulder = shoulderAt(o, m);
  const fz = shoulder.z + m.fore * 0.3;
  const hz = -m.L / 2 + m.hind * 0.2;
  const tuck = 1 - settle;
  set(o.fl, -m.shoulderX - 0.015, fy * settle + wiggle * 0.022, fz);
  set(o.fr, m.shoulderX + 0.015, fy * settle - wiggle * 0.022, fz);
  set(o.hl, -m.hipX - 0.025, hy * settle - wiggle * 0.022, hz - tuck * m.hind * 0.2);
  set(o.hr, m.hipX + 0.025, hy * settle + wiggle * 0.022, hz - tuck * m.hind * 0.2);

  o.neck = -0.18 * k;
  o.look = 0.2 * k;
  o.headRoll = -k * 0.9 + Math.sin(t * 6) * 0.1 * k;
  o.jaw = 0.22 + 0.2 * k;
  o.tailWag = Math.sin(t * 15) * 0.5;
  o.tailLift = -0.5;
  o.lookWeight = 0;
}

function poseJump(o, m, t) {
  base(o, m, t);
  const crouch = smooth(0, 0.28, t) * (1 - smooth(0.28, 0.42, t));
  const land = smooth(1.08, 1.2, t) * (1 - smooth(1.2, 1.6, t));
  const air = clamp((t - 0.36) / 0.76, 0, 1);
  const height = 0.34 + m.hind * 0.5;
  o.y -= (crouch + land) * m.hind * 0.26;
  o.hop = t > 0.36 && t < 1.12 ? 4 * air * (1 - air) * height : 0;
  o.spin = smooth(0.36, 1.12, t) * Math.PI * 2;
  const tuck = t > 0.36 && t < 1.12 ? Math.sin(air * Math.PI) * m.fore * 0.32 : 0;
  o.fl[1] = o.fr[1] = o.hl[1] = o.hr[1] = tuck;
  o.tailLift = 0.5;
  o.tailWag = Math.sin(t * 14) * 0.55;
  o.jaw = 0.42;
  o.ear = -0.4 * Math.sin(air * Math.PI);
  o.lookWeight = t > 0.3 && t < 1.2 ? 0 : 1;
}

function poseEat(o, m, t) {
  poseSit(o, m, t);
  o.neck = -o.pitch * 0.5 - 0.4;
  o.look = -0.42;
  o.jaw = 0.1 + Math.abs(Math.sin(t * 11)) * 0.32;
  o.tongue = 0.2;
  o.tailWag = Math.sin(t * 14) * 0.5;
  o.lookWeight = 0;
  o.eyeL = 0.25;
  o.eyeR = 0.25;
}

function poseAngry(o, m, t) {
  base(o, m, t);
  const shiver = Math.sin(t * 47);
  const bark = Math.pow(Math.abs(Math.sin(t * 5.2)), 4);
  o.y *= 0.93;
  o.pitch -= 0.08;
  o.neck = -0.2;
  o.look = -0.1 + bark * 0.1;
  o.roll = shiver * 0.006;
  o.jaw = 0.12 + bark * 0.72;
  o.tongue = 0;
  o.ear = 0.9;
  o.tailLift = 0.95;
  o.tailWag = shiver * 0.05;
  o.eyeL = 0.72;
  o.eyeR = 0.72;
  o.brow = 1;
  o.lookWeight = 0.7;
  o.fl[2] += m.fore * 0.14;
  o.fr[2] += m.fore * 0.14;
  o.fl[0] -= 0.012;
  o.fr[0] += 0.012;
}

export const POSES = {
  stand: { fn: poseStand },
  walk: { fn: poseWalk },
  sit: { fn: poseSit },
  sploot: { fn: poseSploot },
  sleep: { fn: poseSleep },
  bow: { fn: poseBow },
  beg: { fn: poseBeg },
  shake: { fn: poseShake },
  roll: { fn: poseRoll, duration: 3.9 },
  jump: { fn: poseJump, duration: 1.65 },
  eat: { fn: poseEat, duration: 1.8 },
  angry: { fn: poseAngry, duration: 3.2 },
};

// Tampilan singkat di wajah, ditumpuk di atas pose apa pun.
export const EXPRESSIONS = {
  boop: { duration: 0.55, apply: (o, e) => { o.eyeL *= 1 - 0.75 * e; o.eyeR *= 1 - 0.75 * e; o.look += 0.1 * e; o.ear -= 0.2 * e; } },
  annoyed: { duration: 1.3, apply: (o, e, t) => { o.brow += 0.6 * e; o.headYaw += Math.sin(t * 15) * 0.1 * e; o.jaw += 0.14 * e; o.tailWag *= 1 - e; } },
  sulk: { duration: 2.8, apply: (o, e) => { o.headYaw += 0.75 * e; o.look += 0.14 * e; o.brow += 0.55 * e; o.eyeL *= 1 - 0.45 * e; o.eyeR *= 1 - 0.45 * e; o.tailWag *= 1 - e; o.lookWeight *= 1 - e; } },
  tilt: { duration: 1.6, apply: (o, e) => { o.headRoll += 0.48 * e; o.ear -= 0.25 * e; } },
  yawn: { duration: 2.2, apply: (o, e) => { o.jaw += 0.75 * e; o.look += 0.22 * e; o.eyeL *= 1 - 0.85 * e; o.eyeR *= 1 - 0.85 * e; } },
  wink: { duration: 0.9, apply: (o, e) => { o.eyeR *= 1 - e; o.headRoll -= 0.12 * e; } },
  no: { duration: 1.4, apply: (o, e, t) => { o.headYaw += Math.sin(t * 14) * 0.42 * e; o.ear += Math.sin(t * 14) * 0.3 * e; } },
  happy: { duration: 1.6, apply: (o, e, t) => { o.eyeL *= 1 - 0.8 * e; o.eyeR *= 1 - 0.8 * e; o.jaw += 0.2 * e; o.tailWag = Math.sin(t * 19) * (0.3 + 0.5 * e); o.tailLift += 0.3 * e; o.look += 0.08 * e; } },
  bark: { duration: 0.42, apply: (o, e) => { o.jaw += 0.72 * e; o.look += 0.14 * e; o.ear -= 0.3 * e; o.y += 0.012 * e; } },
  talk: { duration: Infinity, apply: (o, e, t, amp) => { o.jaw += (amp ?? 0) * 0.6; o.look += 0.08; } },
};
