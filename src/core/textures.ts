import * as THREE from 'three';

/** Procedural canvas textures. Everything is generated at load: no image files needed. */

export const DIAL = {
  R: 15.2,
  dayWin: [6.2, 9.6] as const,
  dateWin: [10.05, 12.1] as const,
  winHalfH: 1.0,
};
export const DAY_TEXT_R = (DIAL.dayWin[0] + DIAL.dayWin[1]) / 2;
export const DATE_TEXT_R = (DIAL.dateWin[0] + DIAL.dateWin[1]) / 2;
export const DATE_SLOTS = 31;
export const DAY_SLOTS = 14;
export const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function makeCanvas(w: number, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Deterministic RNG so textures are identical on every load. */
export function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Disc-space helper: maps millimetres to canvas pixels (y up). */
function discSpace(size: number, R: number) {
  const s = size / (2 * R);
  return { s, X: (x: number) => size / 2 + x * s, Y: (y: number) => size / 2 - y * s };
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
  let cx = x - total / 2;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + gap;
  });
  ctx.textAlign = 'center';
}

function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, radius: number, centerAngle: number, gap: number, outward = true) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width + gap);
  const total = widths.reduce((a, b) => a + b, 0);
  let a = centerAngle - (outward ? 1 : -1) * (total / radius) / 2;
  [...text].forEach((ch, i) => {
    const half = widths[i] / 2 / radius;
    a += outward ? half : -half;
    ctx.save();
    ctx.translate(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    ctx.rotate(a + (outward ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += outward ? half : -half;
  });
}

/** Horizontal brushing streaks: used as a roughness map. */
export function brushedMap(repeat: number): THREE.Texture {
  const size = 512;
  const { c, ctx } = makeCanvas(size);
  const r = seeded(7);
  ctx.fillStyle = 'rgb(150,150,150)';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const y = r() * size;
    const v = Math.round(125 + r() * 70);
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.15 + r() * 0.3})`;
    ctx.lineWidth = 0.5 + r() * 1.3;
    const x = r() * size;
    const len = 60 + r() * 420;
    ctx.beginPath();
    for (const dx of [-size, 0, size]) {
      ctx.moveTo(x - len / 2 + dx, y);
      ctx.lineTo(x + len / 2 + dx, y);
    }
    ctx.stroke();
  }
  const t = finish(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/** Concentric (circular) graining for plates, rotor and caseback. */
export function circularGrainMap(): THREE.Texture {
  const size = 1024;
  const { c, ctx } = makeCanvas(size);
  const r = seeded(11);
  ctx.fillStyle = 'rgb(150,150,150)';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1600; i++) {
    const rad = r() * size * 0.72;
    const v = Math.round(95 + r() * 140);
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.18 + r() * 0.32})`;
    ctx.lineWidth = 0.6 + r() * 1.2;
    const a0 = r() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, rad, a0, a0 + 0.5 + r() * 4);
    ctx.stroke();
  }
  return finish(c, false);
}

/** Warm ivory / champagne dial with the day-date window cut out (alpha 0). */
export function dialTexture(): THREE.CanvasTexture {
  const size = 2048;
  const R = DIAL.R;
  const { s, X, Y } = discSpace(size, R);
  const { c, ctx } = makeCanvas(size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, R * s, 0, Math.PI * 2);
  ctx.clip();

  const g = ctx.createRadialGradient(X(-3), Y(4), 0, X(0), Y(0), R * s);
  g.addColorStop(0, '#ddd5c2');
  g.addColorStop(0.6, '#d2c8b2');
  g.addColorStop(1, '#bfb398');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Fine sunburst finish.
  const r = seeded(3);
  for (let i = 0; i < 6000; i++) {
    const a = r() * Math.PI * 2;
    const light = r() < 0.5;
    ctx.strokeStyle = light
      ? `rgba(255,251,238,${0.03 + r() * 0.05})`
      : `rgba(120,100,62,${0.02 + r() * 0.035})`;
    ctx.lineWidth = 0.8 + r() * 1.4;
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2 + Math.cos(a) * R * s, size / 2 + Math.sin(a) * R * s);
    ctx.stroke();
  }
  const e = ctx.createRadialGradient(size / 2, size / 2, R * s * 0.8, size / 2, size / 2, R * s);
  e.addColorStop(0, 'rgba(0,0,0,0)');
  e.addColorStop(1, 'rgba(70,52,22,0.2)');
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, size, size);

  // Printing (positions from the photos; fine print is not legible in the collage).
  ctx.fillStyle = '#1e1e1e';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `700 ${2.0 * s}px ${SANS}`;
  spaced(ctx, 'SEIKO', X(0), Y(7.5), 0.32 * s);
  ctx.font = `500 ${0.92 * s}px ${SANS}`;
  spaced(ctx, 'AUTOMATIC', X(0), Y(5.55), 0.26 * s);

  // Seiko 5 emblem (simplified shield with "5").
  const sx = X(0);
  const sy = Y(-5.4);
  const w = 1.15 * s;
  const h = 1.45 * s;
  ctx.lineWidth = 0.12 * s;
  ctx.strokeStyle = '#1e1e1e';
  ctx.beginPath();
  ctx.moveTo(sx - w, sy - h);
  ctx.lineTo(sx + w, sy - h);
  ctx.lineTo(sx + w, sy + h * 0.25);
  ctx.quadraticCurveTo(sx + w, sy + h, sx, sy + h * 1.25);
  ctx.quadraticCurveTo(sx - w, sy + h, sx - w, sy + h * 0.25);
  ctx.closePath();
  ctx.stroke();
  ctx.font = `italic 700 ${1.75 * s}px ${SANS}`;
  ctx.fillText('5', sx, sy + 0.05 * s);
  ctx.font = `500 ${0.78 * s}px ${SANS}`;
  spaced(ctx, '17 JEWELS', X(0), Y(-8.3), 0.18 * s);
  ctx.restore();

  // Day-date aperture: transparent so the real discs show through.
  ctx.clearRect(X(DIAL.dayWin[0]), Y(DIAL.winHalfH), (DIAL.dayWin[1] - DIAL.dayWin[0]) * s, 2 * DIAL.winHalfH * s);
  ctx.clearRect(X(DIAL.dateWin[0]), Y(DIAL.winHalfH), (DIAL.dateWin[1] - DIAL.dateWin[0]) * s, 2 * DIAL.winHalfH * s);
  return finish(c);
}

/**
 * Printed calendar disc. Slot i sits at angle i*2π/slots and is drawn so that it
 * reads upright once the disc is rotated by -angle (i.e. when it is in the window at 3 o'clock).
 */
function calendarDisc(outer: number, inner: number, textR: number, labels: string[], fontMM: number, size: number): THREE.CanvasTexture {
  const { s, X, Y } = discSpace(size, outer);
  const { c, ctx } = makeCanvas(size);
  ctx.fillStyle = '#f3f0e8';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, outer * s, 0, Math.PI * 2);
  if (inner > 0) ctx.arc(size / 2, size / 2, inner * s, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.fillStyle = '#151515';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${fontMM * s}px ${SANS}`;
  labels.forEach((label, i) => {
    const a = (i / labels.length) * Math.PI * 2;
    ctx.save();
    ctx.translate(X(textR * Math.cos(a)), Y(textR * Math.sin(a)));
    ctx.rotate(-a);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });
  return finish(c);
}

export function dateRingTexture(outer: number, inner: number): THREE.CanvasTexture {
  const labels = Array.from({ length: DATE_SLOTS }, (_, i) => String(i + 1));
  return calendarDisc(outer, inner, DATE_TEXT_R, labels, 1.45, 2048);
}

export function dayDiscTexture(outer: number): THREE.CanvasTexture {
  const labels = Array.from({ length: DAY_SLOTS }, (_, i) => DAYS[i % 7]);
  return calendarDisc(outer, 0, DAY_TEXT_R, labels, 1.25, 1536);
}

/** Caseback face: circular graining + engraving (simplified: collage is too low-res to read). */
export function casebackTexture(R: number): THREE.CanvasTexture {
  const size = 1536;
  const { s, X, Y } = discSpace(size, R);
  const { c, ctx } = makeCanvas(size);
  const g = ctx.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), R * s);
  g.addColorStop(0, '#c9ccd0');
  g.addColorStop(1, '#b4b8bd');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const r = seeded(5);
  for (let i = 0; i < 900; i++) {
    const v = Math.round(150 + r() * 90);
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.15 + r() * 0.25})`;
    ctx.lineWidth = 0.7 + r();
    ctx.beginPath();
    ctx.arc(X(0), Y(0), r() * R * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  const engrave = (draw: (dx: number, dy: number) => void) => {
    ctx.fillStyle = 'rgba(250,251,252,0.85)';
    ctx.strokeStyle = 'rgba(250,251,252,0.85)';
    draw(1.5, 1.5);
    ctx.fillStyle = '#5b6067';
    ctx.strokeStyle = '#5b6067';
    draw(0, 0);
  };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  engrave((dx, dy) => {
    ctx.font = `600 ${0.95 * s}px ${SANS}`;
    arcText(ctx, 'SEIKO  ·  WATER RESISTANT  ·  STAINLESS STEEL', X(0) + dx, Y(0) + dy, 9.6 * s, -Math.PI / 2, 0.12 * s);
    ctx.lineWidth = 0.12 * s;
    ctx.beginPath();
    ctx.arc(X(0) + dx, Y(0) + dy, 4.6 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(0) + dx, Y(0) + dy, 4.0 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `italic 700 ${4.2 * s}px ${SANS}`;
    ctx.fillText('5', X(0) + dx, Y(0.2) + dy);
    ctx.font = `600 ${1.0 * s}px ${SANS}`;
    ctx.fillText('6309-8060', X(0) + dx, Y(-6.6) + dy);
  });
  return finish(c);
}
