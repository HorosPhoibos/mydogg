// Data empat anjing, diambil dari foto asli. Semua ukuran dalam satuan dunia (lantai = y 0).

export const BREEDS = [
  {
    id: 'kitty',
    name: 'Kitty',
    breed: 'Maltese campuran',
    about: 'Bulu putih lebat dan mata kancing hitam. Paling suka rebahan dengan kaki terentang.',
    photo: 'photos/kitty.jpg',
    voice: 1.48,
    favourites: ['sploot', 'sit', 'walk', 'roll', 'sleep'],
    colors: {
      coat: 0xf4efe6,
      chest: 0xfbf8f1,
      ear: 0xf0e4cf,
      muzzle: 0xfbf8f1,
      tongue: 0xe5808f,
    },
    stitches: {
      body: { stitch: 'loop', w: 0.036, h: 0.032, depth: 0.04, droop: 0.15, variance: 0.025 },
      ear: { stitch: 'loop', w: 0.032, h: 0.03, depth: 0.04, variance: 0.025 },
    },
    size: {
      bodyLen: 0.4, chest: [0.165, 0.17], rump: [0.155, 0.16], waist: 0.14,
      fore: [0.12, 0.105], hind: [0.13, 0.11], legR: 0.05, pawR: 0.058,
      neckLen: 0.09, neckR: 0.105,
      head: [0.178, 0.165, 0.16], snoutLen: 0.075, snout: [0.075, 0.062],
    },
    ear: { type: 'floppy', length: 0.2, width: 0.085, thick: 0.034, x: 0.15, y: 0.095, z: -0.01 },
    tail: { type: 'plume', length: 0.2, radius: 0.056 },
  },
  {
    id: 'jenges',
    name: 'Jenges',
    breed: 'Toy poodle',
    about: 'Keriting cokelat kemerahan dengan telinga mengembang. Rapi kalau duduk, ribut kalau joget.',
    photo: 'photos/jenges.jpg',
    voice: 1.38,
    favourites: ['beg', 'sit', 'walk', 'shake'],
    colors: {
      coat: 0xa2552a,
      chest: 0xa8592c,
      ear: 0x8c4620,
      muzzle: 0xb0632f,
      tongue: 0xe2707f,
    },
    stitches: {
      body: { stitch: 'curl', w: 0.046, h: 0.04, depth: 0.05, scatter: true, variance: 0.1 },
      ear: { stitch: 'curl', w: 0.042, h: 0.038, depth: 0.05, scatter: true, variance: 0.1 },
    },
    size: {
      bodyLen: 0.36, chest: [0.15, 0.16], rump: [0.14, 0.15], waist: 0.125,
      fore: [0.15, 0.14], hind: [0.16, 0.14], legR: 0.05, pawR: 0.058,
      neckLen: 0.1, neckR: 0.095,
      head: [0.17, 0.168, 0.158], snoutLen: 0.08, snout: [0.07, 0.06],
    },
    ear: { type: 'puff', length: 0.2, width: 0.092, thick: 0.05, x: 0.15, y: 0.085, z: -0.01 },
    tail: { type: 'pom', length: 0.12, radius: 0.032 },
    topknot: true,
  },
  {
    id: 'gemoy',
    name: 'Gemoy',
    breed: 'Setengah tekel',
    about: 'Badan panjang, kaki pendek, dada krem. Pose andalannya tengkurap kaki kodok.',
    photo: 'photos/gemoy.jpg',
    voice: 1.18,
    favourites: ['walk', 'sploot', 'bow', 'sit'],
    colors: {
      coat: 0xc98f52,
      chest: 0xf3dfbd,
      ear: 0xa8723a,
      muzzle: 0xdcb07a,
      tongue: 0xe3707f,
      nose: 0x171312,
    },
    stitches: {
      body: { stitch: 'v', w: 0.036, h: 0.03, depth: 0.03, variance: 0.05 },
      ear: { stitch: 'v', w: 0.03, h: 0.026, depth: 0.026, variance: 0.05 },
    },
    size: {
      bodyLen: 0.62, chest: [0.15, 0.155], rump: [0.14, 0.145], waist: 0.128,
      fore: [0.085, 0.075], hind: [0.09, 0.075], legR: 0.05, pawR: 0.056,
      neckLen: 0.1, neckR: 0.09,
      head: [0.15, 0.145, 0.16], snoutLen: 0.125, snout: [0.066, 0.056],
    },
    ear: { type: 'fold', length: 0.15, width: 0.09, thick: 0.02, x: 0.135, y: 0.095, z: -0.02 },
    tail: { type: 'sabre', length: 0.3, radius: 0.036 },
    chestPatch: true,
  },
  {
    id: 'pompom',
    name: 'Pompom',
    breed: 'Pomeranian / pompom mix',
    about: 'Pomeranian mix paling tinggi. Telinga tegak, surai singa di leher, dan selalu pasang lonceng ungu.',
    photo: 'photos/pompom.jpg',
    voice: 1.28,
    favourites: ['bow', 'walk', 'sit', 'beg'],
    colors: {
      coat: 0xd18f47,
      chest: 0xecc48a,
      ear: 0xb87430,
      muzzle: 0xdca866,
      tongue: 0xe2707f,
    },
    stitches: {
      body: { stitch: 'v', w: 0.038, h: 0.032, depth: 0.032, variance: 0.06 },
      ear: { stitch: 'v', w: 0.03, h: 0.026, depth: 0.024, variance: 0.06 },
    },
    size: {
      bodyLen: 0.44, chest: [0.165, 0.18], rump: [0.145, 0.155], waist: 0.13,
      fore: [0.19, 0.17], hind: [0.2, 0.17], legR: 0.048, pawR: 0.054,
      neckLen: 0.13, neckR: 0.105,
      head: [0.172, 0.158, 0.165], snoutLen: 0.105, snout: [0.066, 0.054],
    },
    ear: { type: 'upright', length: 0.17, width: 0.085, thick: 0.024, x: 0.1, y: 0.115, z: -0.03 },
    tail: { type: 'curl', length: 0.3, radius: 0.066 },
    mane: true,
  },
];

// Baju per anjing sesuai foto. "foto2" punya keempatnya, "foto1" hanya tiga (Gemoy tidak ikut di foto itu).
export const PHOTO_LOOKS = {
  foto2: {
    label: 'Foto kaus warna-warni',
    kitty: { outfit: 'jersey', neck: 'none', head: 'none' },
    jenges: { outfit: 'tee', neck: 'none', head: 'none' },
    gemoy: { outfit: 'tank', neck: 'none', head: 'none' },
    pompom: { outfit: 'none', neck: 'charm', head: 'none' },
  },
  foto1: {
    label: 'Foto gaun rumbai',
    kitty: { outfit: 'dressTeal', neck: 'none', head: 'none' },
    jenges: { outfit: 'dressPink', neck: 'none', head: 'none' },
    gemoy: { outfit: 'tank', neck: 'none', head: 'none' },
    pompom: { outfit: 'none', neck: 'koala', head: 'none' },
  },
};

export const breedById = (id) => BREEDS.find((b) => b.id === id);
