// Ambient, decorative background for the marketing/auth screens: a dense,
// seamlessly-tiled "doodle wallpaper" of education/cybersecurity glyphs
// (book, graduation cap, school columns, pencil, certificate, flask,
// chalkboard, student, laptop-code, globe, calculator, code brackets,
// terminal, lock, shield, bug) — the same density/feel as a chat app's
// tiled wallpaper, not a handful of floating icons. Purely cosmetic:
// aria-hidden, fixed to the viewport, pointer-events none, never
// interferes with the form on top of it. The tile is a single background
// image (one data: URI, baked at module load) rather than dozens of
// individually positioned/animated DOM nodes — simpler to reason about,
// cheaper to render, and tiles cleanly at any viewport size/aspect ratio.
const ICON_PATHS = [
  'M2 5c3-1 6-1 9 1v13c-3-2-6-2-9-1V5Z M22 5c-3-1-6-1-9 1v13c3-2 6-2 9-1V5Z', // open book
  'M12 3 3 7l9 4 9-4-9-4Z M3 7v6l9 4 9-4V7 M12 11v10', // graduation cap
  'M3 21h18 M4 21V10l8-5 8 5v11 M9 21v-6h6v6 M6 10v11 M18 10v11', // school / building-columns
  'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z', // pencil
  'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M8.5 13 6 21l6-3 6 3-2.5-8', // certificate / diploma
  'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3 M8 15h8', // flask / science
  'M4 4h16v12H4Z M12 16v4 M8 20h8', // chalkboard
  'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21c0-4 4-6 8-6s8 2 8 6', // student / user-graduate
  'M4 5h16v10H4Z M2 19h20 M9 9l-2 2 2 2 M15 9l2 2-2 2', // laptop-code
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M3 12h18 M12 3c2.5 2.5 2.5 15.5 0 18 M12 3c-2.5 2.5-2.5 15.5 0 18', // globe
  'M4 4h8v16H4Z M6 8h4 M6 11h4 M6 14h4 M6 17h2', // calculator
  'M8 6 3 12l5 6 M16 6l5 6-5 6 M13 4l-2 16', // code brackets
  'M4 17l4-4-4-4 M12 19h8', // terminal prompt
  'M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z', // shield
  'M5 11V8a7 7 0 0 1 14 0v3 M4 11h16v9H4Z M12 15v3', // lock
  'M8 2 7 5H5v3H3a9 9 0 0 0 18 0h-2V5h-2l-1-3 M12 7v5l3 3', // bug
] as const;

// Deterministic PRNG (mulberry32) so server- and client-rendered markup
// match exactly — Math.random() here would cause a hydration mismatch.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TILE_SIZE = 260;
const TILE_COLS = 4;
const TILE_ROWS = 4;
// A muted, slightly-visible green — baked directly into the tile's SVG
// markup since a background-image data: URI can't reference a CSS custom
// property; opacity is controlled separately on the container div.
const DOODLE_STROKE = '#2fcf8a';

function buildTileDataUri(): string {
  const rand = mulberry32(20260930);
  const cellW = TILE_SIZE / TILE_COLS;
  const cellH = TILE_SIZE / TILE_ROWS;
  let iconIndex = 0;
  const glyphs: string[] = [];

  for (let row = 0; row < TILE_ROWS; row++) {
    for (let col = 0; col < TILE_COLS; col++) {
      const size = 22 + rand() * 14;
      const jitterX = (rand() - 0.5) * cellW * 0.35;
      const jitterY = (rand() - 0.5) * cellH * 0.35;
      const cx = col * cellW + cellW / 2 + jitterX;
      const cy = row * cellH + cellH / 2 + jitterY;
      const rotation = Math.round((rand() - 0.5) * 50);
      const path = ICON_PATHS[iconIndex % ICON_PATHS.length]!;
      iconIndex++;
      const scale = size / 24;
      glyphs.push(
        `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rotation}) scale(${scale.toFixed(2)}) translate(-12 -12)">` +
          `<path d="${path}" fill="none" stroke="${DOODLE_STROKE}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` +
          `</g>`,
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}">${glyphs.join('')}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const TILE_DATA_URI = buildTileDataUri();

export default function EduBackground() {
  return (
    <div className="edu-bg" aria-hidden="true">
      <div className="edu-bg-orb edu-bg-orb-a" />
      <div className="edu-bg-orb edu-bg-orb-b" />
      <div
        className="edu-bg-doodles"
        style={{ backgroundImage: `url("${TILE_DATA_URI}")`, backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px` }}
      />
    </div>
  );
}
