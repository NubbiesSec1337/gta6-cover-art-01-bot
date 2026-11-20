// Poster Ink: turns any panel photo into a hand-painted poster panel, so a
// cover reads as one painted poster instead of a mix of AI-looking photos
// and flat drawings. The treatment is a real feature of the app (a toggle
// the user can switch on and off), not a screenshot trick: it runs on every
// panel image, including a photo the user uploads, and on the drawn scenes.
//
// What it does, in order:
//   1. Posterizes the colours to a small warm palette (4 tones a channel,
//      red pushed up and blue pulled down in the midtones), so smooth
//      photographic gradients become flat painted tones.
//   2. Inks the strong edges: pixels where neighbouring pixels differ a lot
//      in brightness become near-black plum ink, thickened to two pixels,
//      like a comic-book outline around every shape.
//   3. Halftones the shadows: a dot screen whose dots grow in the dark
//      areas, the way printed posters shade.
//   4. Lays paper grain over the whole panel.
// Deterministic: the grain tile comes from a fixed seed and every step is a
// pure function of the source pixels, so the same photo always inks to the
// same pixels and two runs of the app write the same bytes. Results are
// cached per photo key, so the live preview only inks each photo once.

const MAX_SIDE = 768;
const LEVELS = 4;
const INK = [16, 6, 24];
const cache = new Map();

/** Deterministic PRNG (mulberry32): same seed, same noise, every run. */
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

let grainTile = null;
/** A 128x128 noise tile, made once from a fixed seed. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(128, 128);
  const r = rng(20261120);
  for (let i = 0; i < 128 * 128; i++) {
    const v = Math.floor(r() * 255);
    const o = i * 4;
    img.data[o] = v;
    img.data[o + 1] = v;
    img.data[o + 2] = v;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/**
 * Returns an inked canvas for `source` (an Image or a canvas), cached by
 * `key` (the photo's key in the cover state, so an uploaded photo is inked
 * once per session). Pass the same key to get the same canvas back.
 */
export function inkImage(source, key) {
  const cacheKey = key || '';
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const w = Math.max(2, Math.round(sw * scale));
  const h = Math.max(2, Math.round(sh * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lum = new Float32Array(w * h);
  const step = 255 / (LEVELS - 1);

  // Pass 1: warm shift + posterize, and keep the luminance for the edges.
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    let r = Math.min(255, d[o] * 1.06 + 6);
    let g = d[o + 1];
    let b = Math.max(0, d[o + 2] * 0.94 - 4);
    r = Math.round(r / step) * step;
    g = Math.round(g / step) * step;
    b = Math.round(b / step) * step;
    d[o] = r;
    d[o + 1] = g;
    d[o + 2] = b;
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Pass 2: edge mask from the posterized luminance (right/down neighbours).
  const edge = new Uint8Array(w * h);
  const TH = 26;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = lum[i];
      const dr = x + 1 < w ? Math.abs(l - lum[i + 1]) : 0;
      const dd = y + 1 < h ? Math.abs(l - lum[i + w]) : 0;
      if (dr > TH || dd > TH) edge[i] = 1;
    }
  }

  // Pass 3: ink every edge pixel and its 4-neighbours (a two-pixel outline).
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (
        edge[i] ||
        (x > 0 && edge[i - 1]) ||
        (x + 1 < w && edge[i + 1]) ||
        (y > 0 && edge[i - w]) ||
        (y + 1 < h && edge[i + w])
      ) {
        const o = i * 4;
        d[o] = INK[0];
        d[o + 1] = INK[1];
        d[o + 2] = INK[2];
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // Halftone dots in the shadows: the darker the cell, the bigger the dot.
  const SP = 7;
  ctx.fillStyle = 'rgba(10, 4, 18, 0.55)';
  for (let gy = SP / 2; gy < h; gy += SP) {
    for (let gx = SP / 2; gx < w; gx += SP) {
      const l = lum[Math.floor(gy) * w + Math.floor(gx)] / 255;
      if (l < 0.42) {
        const r = Math.max(0.6, ((0.42 - l) / 0.42) * SP * 0.42);
        ctx.beginPath();
        ctx.arc(gx, gy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Paper grain over the whole panel.
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  cache.set(cacheKey, c);
  return c;
}
