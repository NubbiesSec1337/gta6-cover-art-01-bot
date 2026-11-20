// Fixed scenes for screenshots: ?shot=editor shows the page with a photo
// loaded; ?shot=cover shows the cover alone. The query may override the
// layout, grade, export size and caption text. window.__shotReady is set
// once the scene has painted, so a screenshot tool can wait for it.

/** Applies the ?shot= query overrides to a cover state, returning a copy. */
export function applyShotQuery(state, query) {
  const next = { ...state, panels: state.panels.map((p) => ({ ...p })) };
  const layout = query.get('layout');
  if (layout) next.layout = layout;
  const grade = query.get('grade');
  if (grade) next.grade = grade;
  const title = query.get('title');
  if (title) next.title = title;
  const subtitle = query.get('subtitle');
  if (subtitle) next.subtitle = subtitle;
  const tagline = query.get('tagline');
  if (tagline) next.tagline = tagline;
  const quote = query.get('quote');
  if (quote) next.quote = quote;
  const ink = query.get('ink');
  if (ink === '0' || ink === 'off') next.ink = false;
  if (ink === '1' || ink === 'on') next.ink = true;
  return next;
}

/** Parses an export size like "1920x1080" into [w, h], defaulting to square. */
export function shotSize(query) {
  const m = /^(\d+)x(\d+)$/.exec(query.get('size') || '');
  if (!m) return [1080, 1080];
  return [Number(m[1]), Number(m[2])];
}

/** Marks the scene ready after two animation frames, once it has painted. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
