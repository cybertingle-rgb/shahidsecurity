// Ambient, decorative background for the marketing/auth screens: a dark
// gradient field with education/cybersecurity glyphs continuously drifting
// backward (like the main site's circuit-doodle travel animation) plus two
// soft neon glow orbs for depth. Purely cosmetic — aria-hidden, fixed to
// the viewport, pointer-events none so it never interferes with the form
// on top of it.
const ICONS = [
  { path: 'M2 5c3-1 6-1 9 1v13c-3-2-6-2-9-1V5Z M22 5c-3-1-6-1-9 1v13c3-2 6-2 9-1V5Z', top: '10%', left: '8%', size: 58, duration: 26, delay: 0 }, // open book
  { path: 'M12 3 3 7l9 4 9-4-9-4Z M3 7v6l9 4 9-4V7 M12 11v10', top: '20%', left: '84%', size: 60, duration: 28, delay: 2 }, // graduation cap
  { path: 'M3 21h18 M4 21V10l8-5 8 5v11 M9 21v-6h6v6 M6 10v11 M18 10v11', top: '58%', left: '6%', size: 62, duration: 32, delay: 5 }, // school / building-columns
  { path: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z', top: '42%', left: '4%', size: 42, duration: 22, delay: 3 }, // pencil
  { path: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M8.5 13 6 21l6-3 6 3-2.5-8', top: '30%', left: '48%', size: 48, duration: 27, delay: 6 }, // certificate / diploma
  { path: 'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3 M8 15h8', top: '78%', left: '62%', size: 50, duration: 24, delay: 1.5 }, // flask / science
  { path: 'M4 4h16v12H4Z M12 16v4 M8 20h8', top: '8%', left: '55%', size: 52, duration: 30, delay: 4.5 }, // chalkboard
  { path: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21c0-4 4-6 8-6s8 2 8 6', top: '85%', left: '20%', size: 46, duration: 25, delay: 2.5 }, // student / user-graduate
  { path: 'M4 5h16v10H4Z M2 19h20 M9 9l-2 2 2 2 M15 9l2 2-2 2', top: '65%', left: '88%', size: 54, duration: 29, delay: 0.8 }, // laptop-code
  { path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M3 12h18 M12 3c2.5 2.5 2.5 15.5 0 18 M12 3c-2.5 2.5-2.5 15.5 0 18', top: '38%', left: '92%', size: 44, duration: 23, delay: 3.5 }, // globe
  { path: 'M4 4h8v16H4Z M6 8h4 M6 11h4 M6 14h4 M6 17h2', top: '92%', left: '42%', size: 40, duration: 21, delay: 1 }, // calculator
  { path: 'M8 6 3 12l5 6 M16 6l5 6-5 6 M13 4l-2 16', top: '50%', left: '30%', size: 40, duration: 26, delay: 5.5 }, // code brackets
] as const;

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
