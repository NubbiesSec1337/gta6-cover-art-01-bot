// Draws a GTA-style multi-panel cover onto a canvas at any size.
// Everything is drawn in code: slanted photo panels with role tags, a
// retro-chrome gradient title, a script subtitle, a quote bar, a tagline
// strip, a seal, a billing block and a barcode. No network, no randomness
// (the barcode bars and every shape come from fixed tables), so the same
// state always draws the same pixels.
//
// Poster Ink (ink.js) is OFF by default: the cover shows the photos as
// they are — photorealistic, like the leaderboard's top covers. Turn it on
// with state.ink = true to paint every panel (photo or drawn scene) into a
// flat-toned, ink-outlined poster panel. The toggle in the editor does the
// same; ?ink=0/1 in the shot query overrides it per screenshot.

import { inkImage } from './ink.js';

/** The six photorealistic portrait photos in app/samples/. */
export const PORTRAITS = {
  insider: 'samples/media-generation-portrait-insider-0-0df2d61e-9766-4e77-be09-af8ad1d52e99.webp',
  boss: 'samples/media-generation-portrait-boss-0-d70b292c-c1c0-474f-b5e4-b9170efbeb3b.webp',
  driver: 'samples/media-generation-portrait-driver-0-f3183d23-b83d-4681-bcaf-9d3cadd3fd0e.webp',
  rider: 'samples/media-generation-portrait-rider-0-342d7ba8-a15c-4642-8ed3-bd181cd664cd.webp',
  fixer: 'samples/media-generation-portrait-fixer-0-c27f45b0-c678-481d-bd29-3d2d5f8c3a09.webp',
  courier: 'samples/media-generation-portrait-courier-0-b0038273-21bb-4e3b-8fd7-d84525f189cf.webp',
};

/** The four colour grades. Each tints the panels and recolours the title. */
export const GRADES = {
  sunset: {
    name: 'Sunset',
    tint: 'rgba(255, 90, 60, 0.16)',
    tintDeep: 'rgba(190, 30, 110, 0.30)',
    title: ['#fff3b0', '#ffb347', '#ff5e62', '#c0247a', '#7b1e8f'],
    accent: '#ffd23e',
    sky: ['#2b0f4a', '#7b1e6e', '#ff5e62'],
    sun: ['#fff3b0', '#ffb347', '#ff5e62'],
  },
  neon: {
    name: 'Neon',
    tint: 'rgba(0, 229, 255, 0.14)',
    tintDeep: 'rgba(255, 0, 150, 0.30)',
    title: ['#e0fbff', '#7df9ff', '#00c2ff', '#ff2ea6', '#7b1e8f'],
    accent: '#00e5ff',
    sky: ['#0b1035', '#1b2a6b', '#ff2ea6'],
    sun: ['#e0fbff', '#7df9ff', '#ff2ea6'],
  },
  gold: {
    name: 'Gold',
    tint: 'rgba(255, 180, 40, 0.16)',
    tintDeep: 'rgba(160, 60, 10, 0.30)',
    title: ['#fffbe0', '#ffe27a', '#ffb347', '#e07b00', '#7a3c00'],
    accent: '#ffd23e',
    sky: ['#241505', '#6b3a0e', '#e07b00'],
    sun: ['#fffbe0', '#ffe27a', '#ff8c1a'],
  },
  teal: {
    name: 'Teal',
    tint: 'rgba(0, 200, 170, 0.14)',
    tintDeep: 'rgba(40, 40, 140, 0.32)',
    title: ['#e0fff8', '#7dffd4', '#00c2a8', '#3a6bff', '#5b2a9d'],
    accent: '#7dffd4',
    sky: ['#062a2a', '#0e4a5a', '#3a6bff'],
    sun: ['#e0fff8', '#7dffd4', '#3a6bff'],
  },
};

/** The four panel layouts. Each panel is [x, y, w, h] in fractions of the panel area. */
export const LAYOUTS = {
  hero5: {
    name: 'Hero 5',
    panels: [
      [0.005, 0.01, 0.285, 0.48],
      [0.005, 0.51, 0.285, 0.48],
      [0.305, 0.01, 0.39, 0.98],
      [0.71, 0.01, 0.285, 0.48],
      [0.71, 0.51, 0.285, 0.48],
    ],
  },
  six: {
    name: 'Six Grid',
    panels: [
      [0.005, 0.01, 0.323, 0.48],
      [0.338, 0.01, 0.323, 0.48],
      [0.672, 0.01, 0.323, 0.48],
      [0.005, 0.51, 0.323, 0.48],
      [0.338, 0.51, 0.323, 0.48],
      [0.672, 0.51, 0.323, 0.48],
    ],
  },
  wide3: {
    name: 'Wide 3',
    panels: [
      [0.005, 0.01, 0.323, 0.98],
      [0.338, 0.01, 0.323, 0.98],
      [0.672, 0.01, 0.323, 0.98],
    ],
  },
  square4: {
    name: 'Square 4',
    panels: [
      [0.005, 0.01, 0.49, 0.48],
      [0.505, 0.01, 0.49, 0.48],
      [0.005, 0.51, 0.49, 0.48],
      [0.505, 0.51, 0.49, 0.48],
    ],
  },
};

/** Default panel photos and role tags per layout. Four photorealistic
 * portraits fill most panels (crops vary per panel so the same portrait
 * never repeats the same shot); the drawn scenes fill the rest. Crops are
 * tuned per panel aspect: a tall portrait in a wide panel shows its full
 * width, so only dy moves the vertical window (dx must stay 0); a wide
 * photo in a tall panel shows its full height, so only dx moves the
 * horizontal window (dy must stay 0). */
export const LAYOUT_DEFAULTS = {
  hero5: [
    { photo: PORTRAITS.driver, tag: 'THE DRIVER', zoom: 1.0, dx: 0, dy: 0.42 },
    { photo: PORTRAITS.rider, tag: 'THE RIDER', zoom: 1.0, dx: -0.08, dy: 0 },
    { photo: PORTRAITS.insider, tag: 'THE INSIDER', zoom: 1.0, dx: 0, dy: 0.13 },
    { photo: PORTRAITS.boss, tag: 'THE BOSS', zoom: 1.1, dx: 0, dy: 0.50 },
    { photo: PORTRAITS.fixer, tag: 'THE FIXER', zoom: 1.0, dx: 0, dy: 0.36 },
  ],
  six: [
    { photo: PORTRAITS.insider, tag: 'THE INSIDER', zoom: 1.0, dx: 0, dy: 0.50 },
    { photo: PORTRAITS.rider, tag: 'THE RIDER', zoom: 1.0, dx: 0, dy: 0 },
    { photo: PORTRAITS.driver, tag: 'THE DRIVER', zoom: 1.0, dx: 0, dy: 0.45 },
    { photo: 'scene:neon', tag: 'THE COURIER', zoom: 1, dx: 0, dy: 0 },
    { photo: 'scene:skyline', tag: 'THE FIXER', zoom: 1, dx: 0, dy: 0 },
    { photo: 'scene:beach', tag: 'THE BOSS', zoom: 1, dx: 0, dy: 0 },
  ],
  wide3: [
    { photo: PORTRAITS.insider, tag: 'THE INSIDER', zoom: 1.0, dx: -0.17, dy: 0 },
    { photo: PORTRAITS.driver, tag: 'THE DRIVER', zoom: 1.0, dx: -0.03, dy: 0 },
    { photo: PORTRAITS.boss, tag: 'THE BOSS', zoom: 1.0, dx: 0, dy: 0 },
  ],
  square4: [
    { photo: PORTRAITS.insider, tag: 'THE INSIDER', zoom: 1.1, dx: 0, dy: 0.30 },
    { photo: PORTRAITS.boss, tag: 'THE BOSS', zoom: 1.1, dx: 0, dy: 0.30 },
    { photo: PORTRAITS.rider, tag: 'THE RIDER', zoom: 1.1, dx: -0.26, dy: 0.05 },
    { photo: PORTRAITS.courier, tag: 'THE COURIER', zoom: 1.1, dx: 0, dy: 0.30 },
  ],
};

/** The default cover state (what the editor opens with). */
export function defaultState() {
  return {
    layout: 'hero5',
    grade: 'sunset',
    ink: false,
    title: 'GOLDEN HOUR',
    subtitle: 'last light on the coast',
    tagline: 'ONE COAST · FIVE FRIENDS · ZERO REGRETS',
    quote: 'EVERY SUNSET IS A GETAWAY',
    quoteSource: 'THE LEONIDA LEDGER',
    volume: 'VOL. 1',
    panels: LAYOUT_DEFAULTS.hero5.map((p) => ({ ...p })),
  };
}

/** The barcode's fixed bar widths (deterministic, no randomness). */
const BARCODE = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1];

function slantedQuad(x, y, w, h, skew) {
  return [
    [x + skew, y],
    [x + w + skew, y],
    [x + w - skew, y + h],
    [x - skew, y + h],
  ];
}

function traceQuad(ctx, quad) {
  ctx.beginPath();
  ctx.moveTo(quad[0][0], quad[0][1]);
  for (let i = 1; i < quad.length; i++) ctx.lineTo(quad[i][0], quad[i][1]);
  ctx.closePath();
}

/** Draws one photo panel: the photo cover-fit with zoom/offset, the grade tint and a gold edge. The role tag is drawn separately (after the title) so it is never hidden behind the lettering.
 * With Poster Ink on, the photo is first painted (posterized, ink-outlined,
 * halftoned) so it reads as a hand-painted panel, not a photograph. */
function drawPhotoPanel(ctx, quad, img, panel, grade, px, py, pw, ph, ink) {
  ctx.save();
  traceQuad(ctx, quad);
  ctx.clip();
  if (img) {
    const shown = ink ? inkImage(img, panel.photo || '') : img;
    const iw = shown.naturalWidth || shown.width;
    const ih = shown.naturalHeight || shown.height;
    const scale = Math.max(pw / iw, ph / ih) * (panel.zoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = px + (pw - dw) / 2 + (panel.dx || 0) * pw;
    const dy = py + (ph - dh) / 2 + (panel.dy || 0) * ph;
    ctx.drawImage(shown, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#3a2340';
    ctx.fillRect(px, py, pw, ph);
  }
  // Grade tint: a wash over the photo, deeper toward the bottom.
  ctx.fillStyle = grade.tint;
  ctx.fillRect(px, py, pw, ph);
  const deep = ctx.createLinearGradient(0, py + ph * 0.55, 0, py + ph);
  deep.addColorStop(0, 'rgba(0,0,0,0)');
  deep.addColorStop(1, grade.tintDeep);
  ctx.fillStyle = deep;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  // Gold edge.
  ctx.save();
  traceQuad(ctx, quad);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, pw * 0.008);
  ctx.stroke();
  ctx.restore();
}

/** Draws a panel's role tag: a dark slanted chip at the panel's lower-left corner, sized to fit the panel. */
function drawRoleTag(ctx, panel, px, py, pw, ph) {
  const tag = (panel.tag || '').trim();
  if (!tag) return;
  let fs = Math.max(10, ph * 0.075);
  ctx.save();
  const padFor = (s) => s * 0.7;
  ctx.font = `800 ${fs}px 'Arial Black', Arial, sans-serif`;
  let tw = ctx.measureText(tag).width;
  while (tw + padFor(fs) * 2 > pw * 0.92 && fs > 8) {
    fs -= 1;
    ctx.font = `800 ${fs}px 'Arial Black', Arial, sans-serif`;
    tw = ctx.measureText(tag).width;
  }
  const pad = padFor(fs);
  const tx = px + pw * 0.04;
  const ty = py + ph - fs * 1.9;
  const skew = fs * 0.35;
  ctx.beginPath();
  ctx.moveTo(tx + skew, ty);
  ctx.lineTo(tx + tw + pad * 2 + skew, ty);
  ctx.lineTo(tx + tw + pad * 2 - skew, ty + fs * 1.5);
  ctx.lineTo(tx - skew, ty + fs * 1.5);
  ctx.closePath();
  ctx.fillStyle = 'rgba(10, 6, 18, 0.92)';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, tx + pad, ty + fs * 0.78);
  ctx.restore();
}

/** Draws the synthwave sun: a gradient disc with horizontal slats cut through its lower half. */
function drawSun(ctx, cx, cy, r, grade) {
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grade.sun.forEach((c, i) => g.addColorStop(i / (grade.sun.length - 1), c));
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Slats: background-coloured bars, thicker toward the bottom.
  ctx.fillStyle = 'rgba(20, 8, 40, 0.9)';
  let y = cy + r * 0.05;
  let thick = r * 0.02;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick + r * 0.11;
    thick *= 1.5;
  }
  ctx.restore();
}

/** Draws one palm silhouette at (x, y) with height h. */
function drawPalm(ctx, x, y, h, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(16, 6, 30, 0.85)';
  ctx.fillStyle = 'rgba(16, 6, 30, 0.85)';
  ctx.lineCap = 'round';
  // Trunk: a leaning curve.
  ctx.lineWidth = h * 0.035;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * h * 0.25, -h * 0.5, lean * h * 0.45, -h * 0.92);
  ctx.stroke();
  const topX = lean * h * 0.45;
  const topY = -h * 0.92;
  // Fronds: arcs fanning out from the crown.
  ctx.lineWidth = h * 0.02;
  for (let i = -3; i <= 3; i++) {
    const a = (-Math.PI / 2) + (i * Math.PI) / 9;
    const len = h * (0.34 - Math.abs(i) * 0.03);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.7 + h * 0.12;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.4 - h * 0.08, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws the big retro-chrome title: a chunky 3D extrusion, a thick dark
 * outline, a vertical chrome gradient fill, a top highlight band and a deep
 * drop shadow — the lettering must dominate the cover. */
function drawChromeTitle(ctx, text, cx, y, maxW, maxH, grade) {
  let size = maxH;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const font = (s) => `900 ${s}px 'Arial Black', 'Helvetica Neue', Arial, sans-serif`;
  ctx.font = font(size);
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2;
    ctx.font = font(size);
  }
  const grad = ctx.createLinearGradient(0, y - size, 0, y + size * 0.12);
  grade.title.forEach((c, i) => grad.addColorStop(i / (grade.title.length - 1), c));
  ctx.save();
  ctx.lineJoin = 'round';
  // 3D extrusion: the letterforms repeated downward in deep purple, so the
  // title reads as a solid chrome block, not flat paint.
  ctx.fillStyle = '#2a0a3a';
  for (let d = 4; d >= 1; d--) ctx.fillText(text, cx, y + size * 0.028 * d);
  // Deep drop shadow.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = size * 0.20;
  ctx.shadowOffsetY = size * 0.09;
  ctx.lineWidth = size * 0.13;
  ctx.strokeStyle = '#160818';
  ctx.strokeText(text, cx, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, y);
  // Highlight band across the top third of the letters.
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - maxW / 2, y - size, maxW, size * 0.42);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.fillText(text, cx, y);
  ctx.restore();
  ctx.restore();
  return size;
}

/** Draws the gold starburst seal with two lines of text. */
function drawSeal(ctx, cx, cy, r, line1, line2) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  const teeth = 16;
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i * Math.PI) / teeth;
    const rad = i % 2 === 0 ? r : r * 0.82;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.fillStyle = '#1a0b26';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = r * 0.05;
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${r * 0.22}px Arial, sans-serif`;
  ctx.fillText(line1, 0, -r * 0.16);
  ctx.fillText(line2, 0, r * 0.16);
  ctx.font = `${r * 0.2}px Arial, sans-serif`;
  ctx.fillText('★ ★ ★', 0, r * 0.44);
  ctx.restore();
}

/** Draws the barcode from the fixed bar table. */
function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - w * 0.04, y - h * 0.08, w * 1.08, h * 1.28);
  let bx = x;
  const unit = w / BARCODE.reduce((a, b) => a + b, 0);
  ctx.fillStyle = '#111111';
  BARCODE.forEach((bw, i) => {
    if (i % 2 === 0) ctx.fillRect(bx, y, bw * unit, h);
    bx += bw * unit;
  });
  ctx.restore();
}

function fitFont(ctx, text, maxW, start, family, weight) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > 8) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Hit-tests a point (in canvas pixels) against the panels: returns the
 * panel index, or -1. Uses the same geometry drawCover uses, so a click on
 * the preview selects the panel under it.
 */
export function panelHit(state, x, y, W, H) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero5;
  const areaX = W * 0.018;
  const areaY = H * 0.068;
  const areaW = W * 0.964;
  const areaH = H * 0.79;
  const gap = Math.max(4, W * 0.006);
  const skew = areaH * 0.03;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    const px = areaX + p[0] * areaW + gap / 2;
    const py = areaY + p[1] * areaH + gap / 2;
    const pw = p[2] * areaW - gap;
    const ph = p[3] * areaH - gap;
    const quad = slantedQuad(px, py, pw, ph, skew);
    // Point-in-polygon for the slanted quad.
    let inside = false;
    for (let a = 0, b = quad.length - 1; a < quad.length; b = a++) {
      const [ax, ay] = quad[a];
      const [bx, by] = quad[b];
      if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

/**
 * Draws the whole cover onto `canvas` (any size) from `state`.
 * `images` maps a photo key (samples/*.jpg, scene:*, or an object URL) to a
 * loaded image/canvas. Missing images draw as dark panels.
 */
export function drawCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero5;

  // Sky: deep gradient + glow.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, W * 0.55);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.28)');
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Quote bar at the top.
  const qh = H * 0.052;
  ctx.fillStyle = 'rgba(12, 5, 24, 0.55)';
  ctx.fillRect(0, 0, W, qh);
  const qfs = fitFont(ctx, '★★★★★', W * 0.12, qh * 0.62, 'Arial, sans-serif', '700');
  ctx.fillStyle = grade.accent;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('★★★★★', W * 0.02, qh * 0.54);
  const quote = `"${(state.quote || '').trim()}" — ${state.quoteSource || ''}`.toUpperCase();
  fitFont(ctx, quote, W * 0.62, qh * 0.52, 'Georgia, serif', 'italic 700');
  ctx.fillStyle = '#ffe9c9';
  ctx.fillText(quote, W * 0.15, qh * 0.54);
  ctx.textAlign = 'right';
  fitFont(ctx, state.volume || '', W * 0.1, qh * 0.55, 'Arial, sans-serif', '800');
  ctx.fillStyle = '#1a0b26';
  const vw = ctx.measureText(state.volume || '').width;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(W * 0.985 - vw - W * 0.02, qh * 0.16, vw + W * 0.02, qh * 0.68);
  ctx.fillStyle = '#1a0b26';
  ctx.fillText(state.volume || '', W * 0.985 - W * 0.01, qh * 0.54);
  ctx.textAlign = 'left';

  // Panel area.
  const areaX = W * 0.018;
  const areaY = H * 0.068;
  const areaW = W * 0.964;
  const areaH = H * 0.79;
  const gap = Math.max(4, W * 0.006);
  const skew = areaH * 0.03;

  // Panels first; the title then sits across their middle, straddling the
  // seam between the rows so no row is mostly hidden behind it.
  layout.panels.forEach((p, i) => {
    const px = areaX + p[0] * areaW + gap / 2;
    const py = areaY + p[1] * areaH + gap / 2;
    const pw = p[2] * areaW - gap;
    const ph = p[3] * areaH - gap;
    const panel = state.panels[i] || { photo: '', tag: '', zoom: 1, dx: 0, dy: 0 };
    const img = panel.photo ? images[panel.photo] || null : null;
    drawPhotoPanel(ctx, slantedQuad(px, py, pw, ph, skew), img, panel, grade, px, py, pw, ph, state.ink !== false);
  });

  // Outer gold frame.
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(W * 0.008, H * 0.062, W * 0.984, H * 0.80);

  // One warm vignette over the whole panel area, so the photos and the
  // drawn scenes read as a single shoot under the same light.
  const vig = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.30, W / 2, H * 0.46, Math.max(W, H) * 0.72);
  vig.addColorStop(0, 'rgba(255, 170, 80, 0.06)');
  vig.addColorStop(0.65, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10, 2, 18, 0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Title + script subtitle across the middle, over the panels: low enough
  // to clear the top row's role tags, high enough to leave the bottom row's
  // photos and tags visible below it. A portrait cover gets a smaller title
  // so it does not swallow the two-column bottom row.
  const title = (state.title || '').trim().toUpperCase();
  const portrait = H > W;
  // On a portrait cover the title sits just above the seam between the
  // rows (and slightly smaller), so no letter touches a face in the
  // bottom row — the subtitle clears the rider's cap and the courier's
  // forehead, and the title clears the top row's role tags.
  const titleY = H * (portrait ? 0.52 : 0.62);
  const titleSize = drawChromeTitle(ctx, title, W * 0.5, titleY, W * 0.94, H * (portrait ? 0.09 : 0.15), grade);
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const sfs = fitFont(ctx, sub, W * 0.7, titleSize * 0.34, "Georgia, 'Times New Roman', serif", 'italic 700');
    ctx.font = `italic 700 ${sfs}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = sfs * 0.25;
    ctx.fillStyle = '#ffe9f2';
    ctx.fillText(sub, W * 0.5, titleY + titleSize * 0.42);
    ctx.shadowBlur = 0;
  }

  // Role tags, drawn after the title so they sit on top of the lettering
  // wherever the two overlap.
  layout.panels.forEach((p, i) => {
    const px = areaX + p[0] * areaW + gap / 2;
    const py = areaY + p[1] * areaH + gap / 2;
    const pw = p[2] * areaW - gap;
    const ph = p[3] * areaH - gap;
    drawRoleTag(ctx, state.panels[i] || { tag: '' }, px, py, pw, ph);
  });

  // Tagline strip.
  const th = H * 0.042;
  const ty = H * 0.878;
  ctx.fillStyle = 'rgba(12, 5, 24, 0.85)';
  ctx.fillRect(0, ty, W, th);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, ty, W, Math.max(2, H * 0.003));
  ctx.fillRect(0, ty + th - Math.max(2, H * 0.003), W, Math.max(2, H * 0.003));
  const tfs = fitFont(ctx, state.tagline || '', W * 0.9, th * 0.62, 'Arial, sans-serif', '800');
  ctx.font = `800 ${tfs}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.tagline || '', W * 0.5, ty + th * 0.54);

  // Bottom row: COMING SOON, billing block, seal, barcode.
  const by = H * 0.945;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const cfs = fitFont(ctx, 'COMING SOON', W * 0.14, H * 0.026, 'Arial, sans-serif', '800');
  ctx.font = `800 ${cfs}px Arial, sans-serif`;
  ctx.fillStyle = grade.accent;
  ctx.fillText('COMING SOON', W * 0.02, by);
  ctx.textAlign = 'center';
  const bfs = fitFont(ctx, 'A PALM PICTURES PRODUCTION · STARRING YOU', W * 0.52, H * 0.02, 'Arial, sans-serif', '700');
  ctx.font = `700 ${bfs}px Arial, sans-serif`;
  ctx.fillStyle = '#e8ddff';
  ctx.fillText('A PALM PICTURES PRODUCTION · STARRING YOU', W * 0.5, by - H * 0.012);
  const bfs2 = fitFont(ctx, 'SHOT ON YOUR OWN CAMERA · GRADED BY HAND', W * 0.52, H * 0.02, 'Arial, sans-serif', '700');
  ctx.font = `700 ${bfs2}px Arial, sans-serif`;
  ctx.fillStyle = '#b9a8d8';
  ctx.fillText('SHOT ON YOUR OWN CAMERA · GRADED BY HAND', W * 0.5, by + H * 0.012);
  drawSeal(ctx, W * 0.815, H * 0.945, Math.min(W, H) * 0.042, 'ORIGINAL', 'COVER ART');
  drawBarcode(ctx, W * 0.905, H * 0.928, W * 0.075, H * 0.032);
  ctx.font = `${Math.max(8, H * 0.014)}px Arial, sans-serif`;
  ctx.fillStyle = '#e8ddff';
  ctx.textAlign = 'center';
  ctx.fillText('00213  122826', W * 0.942, H * 0.972);
}
