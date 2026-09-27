// Ambient, decorative background for the marketing/auth screens: a dense
// full-viewport "doodle sheet" of education/cybersecurity glyphs (book,
// graduation cap, school columns, pencil, certificate, flask, chalkboard,
// student, laptop-code, globe, calculator, code brackets) continuously
// drifting backward, plus two soft neon glow orbs for depth. Purely
// cosmetic — aria-hidden, fixed to the viewport, pointer-events none so it
// never interferes with the form on top of it.
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

const GRID_COLS = 7;
const GRID_ROWS = 6;

const ICONS = (() => {
  const rand = mulberry32(20260927);
  const items: { path: string; top: string; left: string; size: number; duration: number; delay: number }[] = [];
  let iconIndex = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // Jitter within each grid cell so it reads as scattered, not a rigid grid.
      const cellW = 100 / GRID_COLS;
      const cellH = 100 / GRID_ROWS;
      const jitterX = (rand() - 0.5) * cellW * 0.7;
      const jitterY = (rand() - 0.5) * cellH * 0.7;
      const top = row * cellH + cellH / 2 + jitterY;
      const left = col * cellW + cellW / 2 + jitterX;
      items.push({
        path: ICON_PATHS[iconIndex % ICON_PATHS.length]!,
        top: `${top.toFixed(1)}%`,
        left: `${left.toFixed(1)}%`,
        size: Math.round(22 + rand() * 20),
        duration: Math.round(18 + rand() * 16),
        delay: Math.round(rand() * 60) / 10,
      });
      iconIndex++;
    }
  }
  return items;
})();

export default function EduBackground() {
  return (
    <div className="edu-bg" aria-hidden="true">
      <div className="edu-bg-orb edu-bg-orb-a" />
      <div className="edu-bg-orb edu-bg-orb-b" />
      {ICONS.map((icon, i) => (
        <svg
          key={i}
          className="edu-bg-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            {
              top: icon.top,
              left: icon.left,
              width: `${icon.size}px`,
              height: `${icon.size}px`,
              '--edu-duration': `${icon.duration}s`,
              '--edu-delay': `${icon.delay}s`,
            } as React.CSSProperties
          }
        >
          <path d={icon.path} />
        </svg>
      ))}
    </div>
  );
}
