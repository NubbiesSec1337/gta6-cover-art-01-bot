// Wires the Golden Hour studio: pick photos, choose a layout and grade,
// edit the caption and each panel, and export the cover as a PNG.
// A `?shot=` query sets up a fixed scene for a screenshot instead.

import { GRADES, LAYOUTS, LAYOUT_DEFAULTS, PORTRAITS, defaultState, drawCover, panelHit } from './cover.js';
import { buildScenes } from './scenes.js';
import { applyShotQuery, shotSize, markShotReady } from './shots.js';

const SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

const DEMO_PHOTOS = [
  { key: PORTRAITS.insider, label: 'Insider' },
  { key: PORTRAITS.boss, label: 'Boss' },
  { key: PORTRAITS.driver, label: 'Driver' },
  { key: PORTRAITS.rider, label: 'Rider' },
  { key: PORTRAITS.fixer, label: 'Fixer' },
  { key: PORTRAITS.courier, label: 'Courier' },
  { key: 'scene:skyline', label: 'Skyline' },
  { key: 'scene:neon', label: 'Neon street' },
  { key: 'scene:car', label: 'Sports car' },
  { key: 'scene:beach', label: 'Beach' },
];

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let size = SIZES[2];
let selected = 0;
const images = {};
let uploadCount = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function previewSize() {
  const w = 960;
  const h = Math.round((w * size.h) / size.w);
  return [w, h];
}

function redraw() {
  const [w, h] = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state, images);
}

function selectedPanel() {
  return state.panels[selected] || state.panels[0];
}

function syncPanelControls() {
  const p = selectedPanel();
  document.getElementById('panelName').textContent = `— panel ${selected + 1}`;
  document.getElementById('panelTag').value = p.tag || '';
  document.getElementById('panelZoom').value = String(p.zoom || 1);
  document.getElementById('panelDx').value = String(p.dx || 0);
  document.getElementById('panelDy').value = String(p.dy || 0);
  document.querySelectorAll('#thumbs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.photo === p.photo);
  });
}

function buildButtons(containerId, items, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    b.classList.toggle('on', item.key === current);
    b.addEventListener('click', () => {
      onPick(item.key);
      box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    });
    box.appendChild(b);
  });
}

function buildThumbs() {
  const box = document.getElementById('thumbs');
  box.innerHTML = '';
  DEMO_PHOTOS.forEach((photo) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.photo = photo.key;
    b.title = photo.label;
    const img = images[photo.key];
    if (img instanceof HTMLCanvasElement) {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      b.appendChild(c);
    } else if (img) {
      const el = document.createElement('img');
      el.src = img.src;
      el.alt = photo.label;
      b.appendChild(el);
    }
    b.addEventListener('click', () => {
      selectedPanel().photo = photo.key;
      syncPanelControls();
      redraw();
    });
    box.appendChild(b);
  });
  syncPanelControls();
}

function applyLayout(layoutKey) {
  state.layout = layoutKey;
  state.panels = LAYOUT_DEFAULTS[layoutKey].map((p) => ({ ...p }));
  selected = 0;
  syncPanelControls();
  redraw();
}

function bindText(id, field) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[field] = e.target.value;
    redraw();
  });
}

function bindPanelRange(id, field) {
  document.getElementById(id).addEventListener('input', (e) => {
    selectedPanel()[field] = Number(e.target.value);
    redraw();
  });
}

// Poster Ink toggle: paints every panel or shows the raw photos.
const inkToggle = document.getElementById('inkToggle');
function syncInkToggle() {
  const on = state.ink !== false;
  inkToggle.textContent = on ? 'Poster Ink: On — painted panels' : 'Poster Ink: Off — raw photos';
  inkToggle.setAttribute('aria-pressed', String(on));
}
inkToggle.addEventListener('click', () => {
  state.ink = state.ink === false;
  syncInkToggle();
  redraw();
});
syncInkToggle();

// Layout, grade and size pickers.
buildButtons('layouts', Object.entries(LAYOUTS).map(([key, l]) => ({ key, label: l.name })), state.layout, applyLayout);
buildButtons('grades', Object.entries(GRADES).map(([key, g]) => ({ key, label: g.name })), state.grade, (key) => {
  state.grade = key;
  redraw();
});
buildButtons('sizes', SIZES.map((s, i) => ({ key: String(i), label: s.label })), '2', (key) => {
  size = SIZES[Number(key)];
  redraw();
});

bindText('title', 'title');
bindText('subtitle', 'subtitle');
bindText('tagline', 'tagline');
bindText('quote', 'quote');
bindText('quoteSource', 'quoteSource');
document.getElementById('panelTag').addEventListener('input', (e) => {
  selectedPanel().tag = e.target.value;
  redraw();
});
bindPanelRange('panelZoom', 'zoom');
bindPanelRange('panelDx', 'dx');
bindPanelRange('panelDy', 'dy');

// Photo upload: the file goes into the selected panel and stays local.
async function addUpload(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  try {
    images[url] = await loadImage(url);
  } catch {
    status.textContent = 'That file could not be read as a photo.';
    return;
  }
  uploadCount += 1;
  selectedPanel().photo = url;
  status.textContent = `Photo ${uploadCount} loaded into panel ${selected + 1}.`;
  syncPanelControls();
  redraw();
}
document.getElementById('photo').addEventListener('change', (e) => addUpload(e.target.files[0]));
const drop = document.getElementById('drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('drag');
  addUpload(e.dataTransfer.files[0]);
});

// Panel picking and dragging on the preview.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return [
    ((e.clientX - r.left) / r.width) * canvas.width,
    ((e.clientY - r.top) / r.height) * canvas.height,
  ];
}
canvas.addEventListener('pointerdown', (e) => {
  const [x, y] = canvasPoint(e);
  const hit = panelHit(state, x, y, canvas.width, canvas.height);
  if (hit < 0) return;
  selected = hit;
  syncPanelControls();
  const p = selectedPanel();
  drag = { x, y, dx: p.dx || 0, dy: p.dy || 0 };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [x, y] = canvasPoint(e);
  const layout = LAYOUTS[state.layout];
  const p = layout.panels[selected];
  const pw = p[2] * canvas.width * 0.964;
  const ph = p[3] * canvas.height * 0.79;
  const panel = selectedPanel();
  panel.dx = Math.max(-0.4, Math.min(0.4, drag.dx + (x - drag.x) / pw));
  panel.dy = Math.max(-0.4, Math.min(0.4, drag.dy + (y - drag.y) / ph));
  syncPanelControls();
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = selectedPanel();
  p.zoom = Math.max(1, Math.min(2.2, (p.zoom || 1) - Math.sign(e.deltaY) * 0.08));
  syncPanelControls();
  redraw();
}, { passive: false });

// Export: render the cover at the chosen size and download it as a PNG.
document.getElementById('export').addEventListener('click', () => {
  const out = document.createElement('canvas');
  out.width = size.w;
  out.height = size.h;
  drawCover(out, state, images);
  out.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `golden-hour-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved golden-hour-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KiB).`;
  }, 'image/png');
});

// Boot: build the drawn scenes, load the sample photos, then draw.
const scenes = buildScenes();
Object.assign(images, scenes);
Promise.all(Object.values(PORTRAITS).map((key) => loadImage(key).then((img) => { images[key] = img; }))).catch(() => {
  status.textContent = 'A sample photo failed to load; the drawn scenes still work.';
}).finally(() => {
  buildThumbs();
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    const shotState = applyShotQuery(state, query);
    Object.assign(state, shotState);
    // A shot that changes the layout must also take that layout's panels:
    // the state's panels belong to the previous layout, and a layout with
    // more panels than the state holds would draw the extras empty.
    if (query.get('layout')) {
      state.panels = LAYOUT_DEFAULTS[state.layout].map((p) => ({ ...p }));
      selected = 0;
    }
    if (shot === 'cover') {
      const [w, h] = shotSize(query);
      size = { label: `${w} × ${h}`, w, h };
      document.body.classList.add('shot-cover');
    }
    redraw();
    markShotReady();
  } else {
    redraw();
  }
});
