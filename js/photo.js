// Menyusun tangkapan layar menjadi foto berbingkai, seperti kartu rajut yang dijahit tepinya.

const WIDTH = 1200;
const HEIGHT = 1060;
const MARGIN = 44;
const PHOTO_H = 840;

export function composePhoto(source, title) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  const style = getComputedStyle(document.documentElement);
  ctx.fillStyle = style.getPropertyValue('--oat').trim() || '#f8f0dd';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const photoW = WIDTH - MARGIN * 2;
  const gradient = ctx.createRadialGradient(WIDTH / 2, MARGIN + PHOTO_H * 0.4, 60, WIDTH / 2, MARGIN + PHOTO_H * 0.4, photoW * 0.72);
  gradient.addColorStop(0, style.getPropertyValue('--bg-a').trim());
  gradient.addColorStop(1, style.getPropertyValue('--bg-c').trim());
  ctx.fillStyle = gradient;
  ctx.fillRect(MARGIN, MARGIN, photoW, PHOTO_H);

  // Potong tengah agar pas dengan bingkai.
  const scale = Math.max(photoW / source.width, PHOTO_H / source.height);
  const sw = photoW / scale;
  const sh = PHOTO_H / scale;
  ctx.drawImage(source, (source.width - sw) / 2, (source.height - sh) / 2, sw, sh, MARGIN, MARGIN, photoW, PHOTO_H);

  ctx.setLineDash([18, 12]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#b9a780';
  ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);
  ctx.setLineDash([]);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#135f58';
  ctx.font = '400 62px Caprasimo, Georgia, serif';
  ctx.fillText(title, MARGIN + 6, MARGIN + PHOTO_H + 92);
  ctx.fillStyle = '#55645f';
  ctx.font = '500 30px Figtree, system-ui, sans-serif';
  const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const dateW = ctx.measureText(date).width;
  ctx.fillText(date, WIDTH - MARGIN - 6 - dateW, MARGIN + PHOTO_H + 86);
  return canvas;
}
