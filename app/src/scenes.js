// Drawn demo scenes: four illustrated "photos" made in code, so every panel
// has a picture even before the user uploads one. Each draws a fixed scene
// (no randomness — a seeded PRNG drives every varied detail) onto an
// offscreen canvas and returns it. The goal is a moody cinematic still, not
// a flat icon: layered skies, haze, glow, reflections, grain and a vignette
// in every scene, and no text anywhere inside a scene (the cover's own
// lettering must never collide with a sign inside the picture).
//
// The scenes are pure environments — city, neon street, coastal road,
// beach. People appear only as photographs (the four photorealistic
// portraits in app/samples/): no face is ever drawn in code, because a
// drawn face reads as a cartoon next to a real portrait. The coupe is the
// hero of the car and neon scenes, and every scene is dense with detail so
// no panel reads as empty next to a portrait panel.

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Deterministic PRNG (mulberry32): same seed, same scene, every run. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skyGradient(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** A glowing sun: bright core, bloom halo, and a haze ring. */
function sunDisc(ctx, x, y, r, core, halo) {
  ctx.save();
  const bloom = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.6);
  bloom.addColorStop(0, halo);
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, core[0]);
  g.addColorStop(0.55, core[1]);
  g.addColorStop(1, core[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Soft horizontal haze bands over a region of the sky. */
function haze(ctx, w, y0, y1, colour, alpha) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, colour);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, y1 - y0);
  ctx.restore();
}

/** Puffy clouds: soft ellipses with a radial glow, drawn from a seed. */
function clouds(ctx, w, h, y0, y1, count, seed, colour) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const cx = r() * w;
    const cy = y0 + r() * (y1 - y0);
    const cw = w * (0.10 + r() * 0.22);
    const ch = h * (0.015 + r() * 0.03);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.6);
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Tiny distant birds: small "v" strokes from a seed. */
function birds(ctx, w, h, y0, y1, count, seed, colour) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1, h * 0.004);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = w * (0.05 + r() * 0.9);
    const y = y0 + r() * (y1 - y0);
    const s = h * (0.008 + r() * 0.012);
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Film grain: many tiny specks from a seed, light and dark. */
function grain(ctx, w, h, seed, amount) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < amount; i++) {
    const v = r();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(r() * w, r() * h, 1.4, 1.4);
  }
  ctx.restore();
}

/** A vignette: darkened corners so the eye goes to the middle. */
function vignette(ctx, w, h, strength) {
  ctx.save();
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(8,2,16,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function palmTree(ctx, x, y, h, lean, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.04;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * h * 0.3, -h * 0.5, lean * h * 0.5, -h * 0.9);
  ctx.stroke();
  const tx = lean * h * 0.5;
  const ty = -h * 0.9;
  ctx.lineWidth = h * 0.022;
  for (let i = -3; i <= 3; i++) {
    const a = (-Math.PI / 2) + (i * Math.PI) / 9;
    const len = h * (0.36 - Math.abs(i) * 0.03);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.4 - h * 0.08,
      tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.7 + h * 0.12,
    );
    ctx.stroke();
  }
  // A second, smaller crown behind the first for depth.
  ctx.lineWidth = h * 0.016;
  for (let i = -2; i <= 2; i++) {
    const a = (-Math.PI / 2) + (i * Math.PI) / 7 + 0.2;
    const len = h * 0.24;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.4 - h * 0.05,
      tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.7 + h * 0.08,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** A lit window grid over one tower: warm and cool lights, varied brightness. */
function towerWindows(ctx, w, h, fx, fy, fw, fh, seed, count) {
  const r = rng(seed);
  const cols = Math.max(2, Math.floor(fw / 0.028));
  const rows = Math.max(4, Math.floor(fh / 0.045));
  for (let i = 0; i < count; i++) {
    const c = Math.floor(r() * cols);
    const rw = Math.floor(r() * rows);
    const wx = w * (fx + 0.012 + c * (fw - 0.024) / cols);
    const wy = h * (fy + 0.03 + rw * (fh - 0.05) / rows);
    const warm = r();
    const a = 0.35 + r() * 0.6;
    ctx.fillStyle = warm > 0.72
      ? `rgba(160, 220, 255, ${a})`
      : warm > 0.2 ? `rgba(255, 205, 90, ${a})` : `rgba(255, 140, 80, ${a})`;
    ctx.fillRect(wx, wy, w * 0.013, h * 0.016);
  }
}

/** A neon sign tube: a glowing rounded bar, no text — light, not lettering. */
function neonTube(ctx, x, y, w, h, colour, vertical) {
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = h * 0.9;
  ctx.fillStyle = colour;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, h * 0.5);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x + w * 0.1, y + h * 0.28, w * 0.8, h * 0.22, h * 0.2);
  else ctx.rect(x + w * 0.1, y + h * 0.28, w * 0.8, h * 0.22);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The coupe and the drawn scenes, in the same Poster Ink language: bold
// dark outlines, 2-3 tone cel shading, flat painted highlights, grain and
// a vignette. No face is drawn here — people come from the photographs.
// ---------------------------------------------------------------------------

const INK_LINE = '#14071a';

/** Traces a closed path from an array of [x, y] points with quadratic smoothing. */
function smoothPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  ctx.closePath();
}


/**
 * A painted sports coupe: long hood, glasshouse cabin, visible wheels with
 * rims, cel shading (a bright top, a deep lower tone, a flat highlight
 * band), painted reflections as flat shapes, a ground shadow, and a bold
 * outline. (cx, cy) is the centre of the car at the ground line; L is the
 * car length. Drawn facing right.
 */
function drawCoupe(ctx, cx, cy, L, opts) {
  const o = opts || {};
  const body = o.body || ['#ff6b7a', '#c8102e', '#5e0616'];
  const lw = Math.max(1.5, L * 0.012);
  const H = 0.30 * L; // roof height above the ground line
  const wr = 0.085 * L; // wheel radius
  const wx1 = cx - 0.30 * L;
  const wx2 = cx + 0.30 * L;
  const wy = cy - wr;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Ground shadow.
  ctx.fillStyle = 'rgba(8,2,16,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.012 * L, 0.46 * L, 0.035 * L, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body: rear bumper, deck, cabin, long hood, front bumper.
  const bodyPath = [
    [cx - 0.50 * L, cy - 0.06 * L], [cx - 0.47 * L, cy - 0.13 * L],
    [cx - 0.34 * L, cy - 0.17 * L], [cx - 0.26 * L, cy - H * 0.82],
    [cx - 0.08 * L, cy - H], [cx + 0.14 * L, cy - H * 0.94],
    [cx + 0.30 * L, cy - 0.20 * L], [cx + 0.46 * L, cy - 0.14 * L],
    [cx + 0.50 * L, cy - 0.06 * L],
  ];
  const bg = ctx.createLinearGradient(0, cy - H, 0, cy);
  bg.addColorStop(0, body[0]);
  bg.addColorStop(0.45, body[1]);
  bg.addColorStop(1, body[2]);
  smoothPath(ctx, bodyPath);
  ctx.fillStyle = bg;
  ctx.fill();
  // Flat highlight band along the side.
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.beginPath();
  ctx.moveTo(cx - 0.44 * L, cy - 0.10 * L);
  ctx.lineTo(cx + 0.40 * L, cy - 0.10 * L);
  ctx.lineTo(cx + 0.44 * L, cy - 0.06 * L);
  ctx.lineTo(cx - 0.46 * L, cy - 0.06 * L);
  ctx.closePath();
  ctx.fill();
  // Lower shadow tone along the sills.
  ctx.fillStyle = 'rgba(10,2,16,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx - 0.48 * L, cy - 0.045 * L);
  ctx.lineTo(cx + 0.48 * L, cy - 0.045 * L);
  ctx.lineTo(cx + 0.49 * L, cy - 0.01 * L);
  ctx.lineTo(cx - 0.49 * L, cy - 0.01 * L);
  ctx.closePath();
  ctx.fill();
  // Bold outline around the body.
  smoothPath(ctx, bodyPath);
  ctx.strokeStyle = INK_LINE;
  ctx.lineWidth = lw;
  ctx.stroke();
  // Door line + handle.
  ctx.strokeStyle = 'rgba(10,2,16,0.55)';
  ctx.lineWidth = lw * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx + 0.02 * L, cy - 0.16 * L);
  ctx.lineTo(cx + 0.02 * L, cy - 0.04 * L);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(cx + 0.05 * L, cy - 0.13 * L, 0.05 * L, 0.012 * L);
  // Side mirror at the A-pillar base, front grille and bumper, side skirt,
  // and a blank license plate (no text): the details that make it a car.
  ctx.fillStyle = body[1];
  ctx.beginPath();
  ctx.ellipse(cx + 0.22 * L, cy - 0.185 * L, 0.022 * L, 0.014 * L, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK_LINE;
  ctx.lineWidth = lw * 0.5;
  ctx.stroke();
  ctx.fillStyle = '#0a0518';
  ctx.fillRect(cx + 0.455 * L, cy - 0.085 * L, 0.045 * L, 0.035 * L);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(cx + 0.455 * L, cy - 0.085 * L, 0.045 * L, 0.008 * L);
  ctx.fillStyle = 'rgba(10,2,16,0.5)';
  ctx.fillRect(cx - 0.20 * L, cy - 0.025 * L, 0.40 * L, 0.018 * L);
  ctx.fillStyle = '#e8e4d8';
  ctx.fillRect(cx - 0.49 * L, cy - 0.075 * L, 0.05 * L, 0.022 * L);
  ctx.strokeStyle = INK_LINE;
  ctx.lineWidth = lw * 0.4;
  ctx.strokeRect(cx - 0.49 * L, cy - 0.075 * L, 0.05 * L, 0.022 * L);
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = '#ffe9a8';
  ctx.shadowBlur = L * 0.015;
  ctx.beginPath();
  ctx.ellipse(cx + 0.47 * L, cy - 0.035 * L, 0.015 * L, 0.009 * L, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Glasshouse: dark glass with a warm painted reflection.
  const glass = [
    [cx - 0.24 * L, cy - 0.17 * L], [cx - 0.20 * L, cy - H * 0.78],
    [cx - 0.04 * L, cy - H * 0.88], [cx + 0.12 * L, cy - H * 0.82],
    [cx + 0.22 * L, cy - 0.17 * L],
  ];
  const gg = ctx.createLinearGradient(cx - 0.2 * L, cy - H, cx + 0.2 * L, cy);
  gg.addColorStop(0, '#1a0b26');
  gg.addColorStop(0.5, '#4a3a6e');
  gg.addColorStop(1, '#0e0620');
  smoothPath(ctx, glass);
  ctx.fillStyle = gg;
  ctx.fill();
  ctx.strokeStyle = INK_LINE;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,180,90,0.55)';
  ctx.beginPath();
  ctx.moveTo(cx - 0.12 * L, cy - H * 0.72);
  ctx.lineTo(cx - 0.04 * L, cy - H * 0.72);
  ctx.lineTo(cx - 0.10 * L, cy - 0.17 * L);
  ctx.lineTo(cx - 0.16 * L, cy - 0.17 * L);
  ctx.closePath();
  ctx.fill();

  // Wheels: tyre, rim, five spokes, hub.
  [wx1, wx2].forEach((wx) => {
    ctx.fillStyle = '#0a0518';
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK_LINE;
    ctx.lineWidth = lw * 0.6;
    ctx.stroke();
    ctx.fillStyle = '#8a8f9a';
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfd6e4';
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0518';
    ctx.lineWidth = wr * 0.14;
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5 + 0.3;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * wr * 0.44, wy + Math.sin(a) * wr * 0.44);
      ctx.stroke();
    }
    ctx.fillStyle = '#0a0518';
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.14, 0, Math.PI * 2);
    ctx.fill();
  });

  // Headlight (front) with a beam, and a glowing taillight (rear).
  ctx.fillStyle = '#fff3b0';
  ctx.shadowColor = '#fff3b0';
  ctx.shadowBlur = L * 0.02;
  ctx.beginPath();
  ctx.ellipse(cx + 0.47 * L, cy - 0.10 * L, 0.022 * L, 0.014 * L, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  const beam = ctx.createLinearGradient(cx + 0.48 * L, cy - 0.10 * L, cx + 0.72 * L, cy - 0.04 * L);
  beam.addColorStop(0, 'rgba(255,243,176,0.55)');
  beam.addColorStop(1, 'rgba(255,243,176,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(cx + 0.48 * L, cy - 0.12 * L);
  ctx.lineTo(cx + 0.72 * L, cy - 0.18 * L);
  ctx.lineTo(cx + 0.72 * L, cy - 0.02 * L);
  ctx.lineTo(cx + 0.48 * L, cy - 0.07 * L);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff2a3c';
  ctx.shadowColor = '#ff2a3c';
  ctx.shadowBlur = L * 0.02;
  ctx.fillRect(cx - 0.505 * L, cy - 0.11 * L, 0.018 * L, 0.03 * L);
  ctx.shadowBlur = 0;
  ctx.restore();
}

/** Sunset skyline: layered towers against a glowing sun, haze, clouds, birds
 * and palms, rooftop detail and car lights on the street below. */
function drawSkyline(w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  skyGradient(ctx, w, h, ['#2b0f4a', '#7b1e6e', '#ff5e62', '#ff9e5e', '#ffc46b']);
  sunDisc(ctx, w * 0.68, h * 0.40, h * 0.17, ['#fffbe0', '#ffb347', '#ff5e62'], 'rgba(255, 150, 60, 0.45)');
  clouds(ctx, w, h, h * 0.06, h * 0.30, 7, 11, 'rgba(255, 190, 140, 0.35)');
  clouds(ctx, w, h, h * 0.30, h * 0.48, 5, 23, 'rgba(255, 120, 90, 0.28)');
  birds(ctx, w, h, h * 0.08, h * 0.22, 6, 37, 'rgba(30, 8, 40, 0.7)');
  haze(ctx, w, h * 0.42, h * 0.58, 'rgba(255, 150, 90, 0.35)', 0.5);
  // Far skyline: hazy, lighter.
  ctx.fillStyle = 'rgba(90, 40, 110, 0.75)';
  const far = [
    [0.0, 0.50, 0.10, 0.30], [0.09, 0.44, 0.08, 0.36], [0.18, 0.52, 0.12, 0.28],
    [0.31, 0.46, 0.09, 0.34], [0.42, 0.54, 0.11, 0.26], [0.55, 0.48, 0.08, 0.32],
    [0.64, 0.55, 0.12, 0.25], [0.77, 0.47, 0.09, 0.33], [0.87, 0.53, 0.13, 0.27],
  ];
  far.forEach(([fx, fy, fw, fh]) => ctx.fillRect(w * fx, h * fy, w * fw, h * fh));
  // Near towers: dark, with many lit windows and antenna beacons.
  const towers = [
    [0.04, 0.42, 0.13, 0.58], [0.20, 0.30, 0.11, 0.70], [0.34, 0.48, 0.12, 0.52],
    [0.50, 0.24, 0.10, 0.76], [0.63, 0.40, 0.13, 0.60], [0.79, 0.32, 0.11, 0.68],
    [0.92, 0.50, 0.08, 0.50],
  ];
  ctx.fillStyle = '#1c0b2e';
  towers.forEach(([fx, fy, fw, fh]) => ctx.fillRect(w * fx, h * fy, w * fw, h * fh));
  towers.forEach(([fx, fy, fw, fh], i) => towerWindows(ctx, w, h, fx, fy, fw, fh, 100 + i * 17, 34));
  // Antenna beacons on the two tallest towers.
  ctx.fillStyle = '#ff3b30';
  ctx.shadowColor = '#ff3b30';
  ctx.shadowBlur = h * 0.02;
  ctx.beginPath(); ctx.arc(w * 0.255, h * 0.285, h * 0.012, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.55, h * 0.225, h * 0.012, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // Street: dark, with vertical smears of window light as reflections.
  ctx.fillStyle = '#12061f';
  ctx.fillRect(0, h * 0.82, w, h * 0.18);
  const r = rng(77);
  for (let i = 0; i < 22; i++) {
    const x = r() * w;
    const g = ctx.createLinearGradient(0, h * 0.82, 0, h);
    g.addColorStop(0, r() > 0.5 ? 'rgba(255, 205, 90, 0.28)' : 'rgba(255, 110, 140, 0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, h * 0.82, w * 0.012, h * 0.16);
  }
  palmTree(ctx, w * 0.10, h * 0.86, h * 0.34, 0.4, '#0d0418');
  palmTree(ctx, w * 0.90, h * 0.88, h * 0.30, -0.4, '#0d0418');
  // Rooftop detail on the tallest towers: a water tower, an AC unit and a
  // second antenna, so the skyline has a finished roofline, not flat tops.
  ctx.fillStyle = '#0d0418';
  ctx.fillRect(w * 0.525, h * 0.20, w * 0.006, h * 0.04);
  ctx.fillRect(w * 0.565, h * 0.20, w * 0.006, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(w * 0.515, h * 0.20);
  ctx.lineTo(w * 0.515, h * 0.16);
  ctx.lineTo(w * 0.545, h * 0.135);
  ctx.lineTo(w * 0.575, h * 0.16);
  ctx.lineTo(w * 0.575, h * 0.20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#241338';
  ctx.fillRect(w * 0.225, h * 0.275, w * 0.05, h * 0.025);
  ctx.fillStyle = 'rgba(255, 205, 90, 0.7)';
  ctx.fillRect(w * 0.235, h * 0.282, w * 0.03, h * 0.008);
  // Car lights on the street: warm headlights one way, red taillights the other.
  const r3 = rng(91);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(255, 240, 200, ${0.5 + r3() * 0.4})`;
    ctx.beginPath(); ctx.arc(w * (0.06 + r3() * 0.85), h * (0.86 + r3() * 0.05), h * 0.008, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255, 60, 60, ${0.5 + r3() * 0.4})`;
    ctx.beginPath(); ctx.arc(w * (0.06 + r3() * 0.85), h * (0.92 + r3() * 0.04), h * 0.008, 0, Math.PI * 2); ctx.fill();
  }
  grain(ctx, w, h, 501, 1400);
  vignette(ctx, w, h, 0.42);
  return c;
}

/** Neon street: a red coupe parked under glowing shop signs on a wet road,
 * with street lamps, a traffic light and steam. No text anywhere. */
function drawNeon(w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  skyGradient(ctx, w, h, ['#0e0626', '#2b0f4a', '#6b1160', '#a4136b']);
  clouds(ctx, w, h, h * 0.04, h * 0.20, 5, 41, 'rgba(255, 90, 160, 0.25)');
  const moon = ctx.createRadialGradient(w * 0.82, h * 0.12, 0, w * 0.82, h * 0.12, h * 0.10);
  moon.addColorStop(0, 'rgba(255, 220, 240, 0.9)');
  moon.addColorStop(0.4, 'rgba(255, 150, 200, 0.35)');
  moon.addColorStop(1, 'rgba(255, 150, 200, 0)');
  ctx.fillStyle = moon;
  ctx.fillRect(w * 0.7, 0, w * 0.3, h * 0.24);
  // Shopfronts: dark walls, glowing sign tubes above the awnings, warm windows.
  const fronts = [
    { col: '#ff2ea6', fx: 0.00, fy: 0.26, fw: 0.24 },
    { col: '#00e5ff', fx: 0.26, fy: 0.32, fw: 0.22 },
    { col: '#ffd23e', fx: 0.50, fy: 0.24, fw: 0.24 },
    { col: '#ff2ea6', fx: 0.76, fy: 0.30, fw: 0.24 },
  ];
  fronts.forEach(({ col, fx, fy, fw }, i) => {
    ctx.fillStyle = '#14081f';
    ctx.fillRect(w * fx, h * fy, w * fw, h * (0.70 - fy));
    // Warm lit windows inside the shopfront.
    const r = rng(200 + i * 31);
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = `rgba(255, ${180 + Math.floor(r() * 50)}, 90, ${0.5 + r() * 0.4})`;
      ctx.fillRect(w * (fx + 0.02 + r() * (fw - 0.06)), h * (fy + 0.16 + r() * 0.28), w * 0.03, h * 0.05);
    }
    // Neon tube signs ABOVE the shopfront (high in the frame, clear of the
    // cover's title and subtitle bands): vertical and horizontal tubes.
    ctx.strokeStyle = col;
    ctx.lineWidth = h * 0.008;
    ctx.strokeRect(w * fx + 1, h * fy + 1, w * fw - 2, h * (0.70 - fy) - 2);
    neonTube(ctx, w * (fx + 0.03), h * (fy + 0.02), w * (fw - 0.06), h * 0.018, col, false);
    neonTube(ctx, w * (fx + 0.04), h * (fy + 0.05), h * 0.016, h * 0.07, col, true);
    neonTube(ctx, w * (fx + fw - 0.06), h * (fy + 0.05), h * 0.016, h * 0.07, col, true);
    // Awning stripes under the signs.
    for (let s = 0; s < 6; s++) {
      ctx.fillStyle = s % 2 === 0 ? col : 'rgba(20, 8, 31, 0.9)';
      ctx.globalAlpha = s % 2 === 0 ? 0.85 : 1;
      ctx.fillRect(w * (fx + s * fw / 6), h * (fy + 0.13), w * fw / 6, h * 0.045);
    }
    ctx.globalAlpha = 1;
  });
  // Wet road: dark, with long vertical reflections of every neon colour.
  ctx.fillStyle = '#0a0518';
  ctx.fillRect(0, h * 0.70, w, h * 0.30);
  const r2 = rng(313);
  fronts.forEach(({ col, fx, fw }) => {
    const g = ctx.createLinearGradient(0, h * 0.70, 0, h);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(w * fx, h * 0.70, w * fw, h * 0.30);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.25 + r2() * 0.3;
      ctx.fillStyle = col;
      ctx.fillRect(w * (fx + r2() * fw), h * 0.72, w * 0.008, h * (0.10 + r2() * 0.16));
    }
    ctx.globalAlpha = 1;
  });
  // Puddles: bright horizontal highlights on the road.
  ctx.fillStyle = 'rgba(255, 120, 200, 0.30)';
  ctx.beginPath(); ctx.ellipse(w * 0.30, h * 0.86, w * 0.10, h * 0.012, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0, 229, 255, 0.28)';
  ctx.beginPath(); ctx.ellipse(w * 0.68, h * 0.92, w * 0.12, h * 0.012, 0, 0, Math.PI * 2); ctx.fill();
  // The coupe, centred, its roof at the man's hand height.
  drawCoupe(ctx, w * 0.50, h * 0.90, w * 0.92);
  // Street furniture, so the road is a place, not a void: two glowing street
  // lamps, a traffic light, a parked car in the background, steam.
  [[0.08, '#ffd23e'], [0.86, '#00e5ff']].forEach(([fx, col]) => {
    ctx.strokeStyle = '#0d0418';
    ctx.lineWidth = h * 0.01;
    ctx.beginPath();
    ctx.moveTo(w * fx, h * 0.72);
    ctx.lineTo(w * fx, h * 0.52);
    ctx.quadraticCurveTo(w * fx, h * 0.48, w * (fx + 0.04), h * 0.48);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = h * 0.03;
    ctx.beginPath(); ctx.arc(w * (fx + 0.045), h * 0.485, h * 0.014, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });
  // Traffic light on the right.
  ctx.fillStyle = '#0d0418';
  ctx.fillRect(w * 0.955, h * 0.50, w * 0.012, h * 0.22);
  ctx.fillRect(w * 0.945, h * 0.46, w * 0.032, h * 0.10);
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath(); ctx.arc(w * 0.961, h * 0.48, h * 0.009, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a10';
  ctx.beginPath(); ctx.arc(w * 0.961, h * 0.505, h * 0.009, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a5c1a';
  ctx.beginPath(); ctx.arc(w * 0.961, h * 0.53, h * 0.009, 0, Math.PI * 2); ctx.fill();
  // A parked car in the background, smaller and darker, up the street.
  drawCoupe(ctx, w * 0.10, h * 0.68, w * 0.28, { body: ['#3a4a6b', '#1c2a4a', '#0a1226'] });
  // Steam from a manhole: soft white ellipses rising.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath(); ctx.ellipse(w * 0.82, h * 0.78, w * 0.02, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w * 0.83, h * 0.74, w * 0.015, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  grain(ctx, w, h, 502, 1400);
  vignette(ctx, w, h, 0.5);
  return c;
}

/** Sports car: a low red coupe on a coastal road at dusk, sea glitter, a
 * headland with a lighthouse, and a distant car ahead on the road. */
function drawCar(w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  skyGradient(ctx, w, h, ['#2b0f4a', '#7b1e6e', '#ff5e62', '#ff9e5e', '#ffc46b']);
  sunDisc(ctx, w * 0.18, h * 0.26, h * 0.10, ['#fffbe0', '#ffb347', '#ff5e62'], 'rgba(255, 150, 60, 0.4)');
  clouds(ctx, w, h, h * 0.05, h * 0.24, 6, 61, 'rgba(255, 190, 140, 0.35)');
  birds(ctx, w, h, h * 0.10, h * 0.22, 5, 71, 'rgba(30, 8, 40, 0.7)');
  haze(ctx, w, h * 0.20, h * 0.34, 'rgba(255, 170, 110, 0.30)', 0.5);
  haze(ctx, w, h * 0.40, h * 0.56, 'rgba(255, 150, 90, 0.3)', 0.5);
  // Distant headland on the horizon.
  ctx.fillStyle = 'rgba(60, 20, 70, 0.8)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.56);
  ctx.quadraticCurveTo(w * 0.15, h * 0.46, w * 0.34, h * 0.55);
  ctx.lineTo(w * 0.34, h * 0.56);
  ctx.closePath();
  ctx.fill();
  // Sea with sun glitter: many short golden dashes, denser near the sun's column.
  ctx.fillStyle = '#1b2a6b';
  ctx.fillRect(0, h * 0.55, w, h * 0.15);
  const r = rng(83);
  for (let i = 0; i < 90; i++) {
    const x = r() * w;
    const y = h * (0.56 + r() * 0.13);
    const near = 1 - Math.min(1, Math.abs(x - w * 0.22) / (w * 0.45));
    ctx.fillStyle = `rgba(255, 205, 110, ${0.12 + near * 0.55 * r()})`;
    ctx.fillRect(x, y, w * (0.01 + r() * 0.03), h * 0.004);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = h * 0.006;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w * (0.05 + i * 0.3), h * (0.60 + i * 0.03));
    ctx.quadraticCurveTo(w * (0.15 + i * 0.3), h * (0.58 + i * 0.03), w * (0.25 + i * 0.3), h * (0.60 + i * 0.03));
    ctx.stroke();
  }
  // Road + guard rail.
  ctx.fillStyle = '#12061f';
  ctx.fillRect(0, h * 0.70, w, h * 0.30);
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(0, h * 0.68, w, h * 0.015);
  ctx.fillStyle = '#3a3a4a';
  for (let i = 0; i < 9; i++) ctx.fillRect(w * (0.02 + i * 0.11), h * 0.68, w * 0.012, h * 0.03);
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = h * 0.012;
  ctx.setLineDash([w * 0.05, w * 0.04]);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.88);
  ctx.lineTo(w, h * 0.88);
  ctx.stroke();
  ctx.setLineDash([]);
  // The coupe, centred on the road.
  drawCoupe(ctx, w * 0.50, h * 0.90, w * 0.92);
  // A distant car ahead on the road, and a lighthouse on the headland.
  drawCoupe(ctx, w * 0.14, h * 0.76, w * 0.20, { body: ['#ff8a5e', '#c8102e', '#5e0616'] });
  ctx.fillStyle = '#f2ead8';
  ctx.beginPath();
  ctx.moveTo(w * 0.295, h * 0.55);
  ctx.lineTo(w * 0.305, h * 0.44);
  ctx.lineTo(w * 0.325, h * 0.44);
  ctx.lineTo(w * 0.335, h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(w * 0.303, h * 0.425, w * 0.024, h * 0.018);
  ctx.fillStyle = '#fff3b0';
  ctx.shadowColor = '#fff3b0';
  ctx.shadowBlur = h * 0.02;
  ctx.beginPath(); ctx.arc(w * 0.315, h * 0.42, h * 0.008, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  const beam = ctx.createLinearGradient(w * 0.315, h * 0.42, w * 0.05, h * 0.58);
  beam.addColorStop(0, 'rgba(255, 243, 176, 0.4)');
  beam.addColorStop(1, 'rgba(255, 243, 176, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(w * 0.315, h * 0.415);
  ctx.lineTo(w * 0.05, h * 0.54);
  ctx.lineTo(w * 0.05, h * 0.62);
  ctx.lineTo(w * 0.315, h * 0.425);
  ctx.closePath();
  ctx.fill();
  palmTree(ctx, w * 0.06, h * 0.72, h * 0.30, 0.4, '#0d0418');
  palmTree(ctx, w * 0.93, h * 0.74, h * 0.26, -0.4, '#0d0418');
  grain(ctx, w, h, 503, 1400);
  vignette(ctx, w, h, 0.42);
  return c;
}

/** Beach: turquoise sea with glitter, sand, a lifeguard tower, an umbrella
 * and palms, plus beach gear — a surfboard, a towel and cooler, a ball. */
function drawBeach(w, h) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  skyGradient(ctx, w, h, ['#7df9ff', '#ffe27a', '#ffb347', '#ff9e5e']);
  sunDisc(ctx, w * 0.78, h * 0.22, h * 0.13, ['#fffbe0', '#ffe27a', '#ffb347'], 'rgba(255, 210, 120, 0.4)');
  clouds(ctx, w, h, h * 0.05, h * 0.26, 6, 97, 'rgba(255, 255, 255, 0.55)');
  birds(ctx, w, h, h * 0.08, h * 0.20, 5, 107, 'rgba(60, 40, 20, 0.6)');
  // Sea with sun glitter and foam lines.
  ctx.fillStyle = '#00a8bd';
  ctx.fillRect(0, h * 0.42, w, h * 0.22);
  const r = rng(113);
  for (let i = 0; i < 70; i++) {
    const x = r() * w;
    const y = h * (0.43 + r() * 0.20);
    const near = 1 - Math.min(1, Math.abs(x - w * 0.78) / (w * 0.45));
    ctx.fillStyle = `rgba(255, 250, 220, ${0.10 + near * 0.5 * r()})`;
    ctx.fillRect(x, y, w * (0.01 + r() * 0.025), h * 0.004);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = h * 0.008;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(w * (0.1 + i * 0.2), h * (0.48 + i * 0.03));
    ctx.quadraticCurveTo(w * (0.2 + i * 0.2), h * (0.45 + i * 0.03), w * (0.3 + i * 0.2), h * (0.48 + i * 0.03));
    ctx.stroke();
  }
  // A distant boat on the horizon.
  ctx.fillStyle = '#123';
  ctx.beginPath();
  ctx.moveTo(w * 0.10, h * 0.44);
  ctx.lineTo(w * 0.16, h * 0.44);
  ctx.lineTo(w * 0.15, h * 0.46);
  ctx.lineTo(w * 0.11, h * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(w * 0.125, h * 0.415, w * 0.006, h * 0.028);
  // Sand: warm, with texture dots, footprints and a long shadow.
  ctx.fillStyle = '#f2d8a0';
  ctx.fillRect(0, h * 0.64, w, h * 0.36);
  const r2 = rng(131);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = r2() > 0.5 ? 'rgba(180, 130, 60, 0.25)' : 'rgba(255, 245, 220, 0.35)';
    ctx.fillRect(r2() * w, h * (0.65 + r2() * 0.33), 2, 2);
  }
  ctx.fillStyle = 'rgba(120, 80, 30, 0.35)';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse(w * (0.30 + i * 0.02), h * (0.72 + i * 0.028), w * 0.012, h * 0.008, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Beach umbrella: striped canopy, pole, shadow.
  const ux = w * 0.28;
  const uy = h * 0.76;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = h * 0.015;
  ctx.shadowOffsetX = w * 0.02;
  for (let s = 0; s < 6; s++) {
    ctx.fillStyle = s % 2 === 0 ? '#ff5e62' : '#fff3e0';
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(ux - w * 0.11 + s * w * 0.037, uy + h * 0.07);
    ctx.lineTo(ux - w * 0.11 + (s + 1) * w * 0.037, uy + h * 0.07);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#7a3c00';
  ctx.lineWidth = h * 0.008;
  ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux, uy + h * 0.16); ctx.stroke();
  // Lifeguard tower: roof, cabin, rails, ladder, red flag.
  ctx.fillStyle = '#ff5e62';
  ctx.beginPath();
  ctx.moveTo(w * 0.60, h * 0.50);
  ctx.lineTo(w * 0.80, h * 0.50);
  ctx.lineTo(w * 0.70, h * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3e0';
  ctx.fillRect(w * 0.64, h * 0.50, w * 0.12, h * 0.12);
  ctx.fillStyle = '#ff5e62';
  ctx.fillRect(w * 0.64, h * 0.50, w * 0.12, h * 0.025);
  ctx.strokeStyle = '#7a3c00';
  ctx.lineWidth = h * 0.008;
  ctx.strokeRect(w * 0.64, h * 0.50, w * 0.12, h * 0.12);
  ctx.beginPath(); ctx.moveTo(w * 0.64, h * 0.56); ctx.lineTo(w * 0.76, h * 0.56); ctx.stroke();
  ctx.fillStyle = '#7a3c00';
  ctx.fillRect(w * 0.63, h * 0.62, w * 0.018, h * 0.22);
  ctx.fillRect(w * 0.75, h * 0.62, w * 0.018, h * 0.22);
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(w * 0.63, h * (0.65 + i * 0.045), w * 0.14, h * 0.008);
  }
  ctx.fillStyle = '#ff2a3c';
  ctx.beginPath();
  ctx.moveTo(w * 0.70, h * 0.44);
  ctx.lineTo(w * 0.70, h * 0.36);
  ctx.lineTo(w * 0.76, h * 0.385);
  ctx.lineTo(w * 0.70, h * 0.41);
  ctx.closePath();
  ctx.fill();
  palmTree(ctx, w * 0.14, h * 0.88, h * 0.42, 0.5, '#1c4a1c');
  palmTree(ctx, w * 0.88, h * 0.90, h * 0.36, -0.5, '#1c4a1c');
  // Beach gear, so the sand is lived-in: a surfboard stuck upright, a towel
  // and cooler, a beach ball, and a second small umbrella at the waterline.
  ctx.save();
  ctx.translate(w * 0.42, h * 0.80);
  ctx.rotate(-0.18);
  ctx.fillStyle = '#ff5e62';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.09, w * 0.02, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3e0';
  ctx.fillRect(-w * 0.02, -h * 0.16, w * 0.04, h * 0.05);
  ctx.fillStyle = '#00c2a8';
  ctx.fillRect(-w * 0.02, -h * 0.10, w * 0.04, h * 0.03);
  ctx.restore();
  ctx.fillStyle = '#00c2a8';
  ctx.fillRect(w * 0.36, h * 0.86, w * 0.09, h * 0.035);
  ctx.fillStyle = '#ff2ea6';
  ctx.fillRect(w * 0.36, h * 0.86, w * 0.02, h * 0.035);
  ctx.fillRect(w * 0.42, h * 0.86, w * 0.02, h * 0.035);
  ctx.fillStyle = '#fff3e0';
  ctx.fillRect(w * 0.47, h * 0.85, w * 0.035, h * 0.045);
  ctx.fillStyle = '#ff5e62';
  ctx.fillRect(w * 0.47, h * 0.85, w * 0.035, h * 0.012);
  ctx.fillStyle = '#ff2ea6';
  ctx.beginPath(); ctx.arc(w * 0.53, h * 0.88, h * 0.018, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath(); ctx.arc(w * 0.53, h * 0.88, h * 0.018, -0.6, 0.6); ctx.fill();
  ctx.fillStyle = '#00c2a8';
  ctx.beginPath();
  ctx.moveTo(w * 0.56, h * 0.68);
  ctx.lineTo(w * 0.50, h * 0.70);
  ctx.lineTo(w * 0.62, h * 0.70);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a3c00';
  ctx.lineWidth = h * 0.004;
  ctx.beginPath(); ctx.moveTo(w * 0.56, h * 0.68); ctx.lineTo(w * 0.56, h * 0.73); ctx.stroke();
  grain(ctx, w, h, 504, 1200);
  vignette(ctx, w, h, 0.35);
  return c;
}

/** Builds every drawn scene once, at 720x720, and returns them by key. */
export function buildScenes() {
  return {
    'scene:skyline': drawSkyline(720, 720),
    'scene:neon': drawNeon(720, 720),
    'scene:car': drawCar(720, 720),
    'scene:beach': drawBeach(720, 720),
  };
}
