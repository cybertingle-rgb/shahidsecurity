// Ambient, decorative background for the marketing/auth screens: a dark
// gradient field with a handful of slowly drifting education/cybersecurity
// glyphs (book, pencil, cap, shield, certificate, code brackets) plus two
// soft neon glow orbs for depth. Purely cosmetic — aria-hidden, fixed to
// the viewport, pointer-events none so it never interferes with the form
// on top of it.
const ICONS = [
  { path: 'M4 4h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z M20 4v14', top: '12%', left: '8%', size: 46, duration: 22, delay: 0 }, // open book
  { path: 'm3 17 6-6 4 4L21 7 M14 6h7v7', top: '68%', left: '10%', size: 34, duration: 26, delay: 3 }, // trend/progress (kept small, security-adjacent)
  { path: 'M12 3 3 7l9 4 9-4-9-4Z M3 7v6l9 4 9-4V7 M12 11v10', top: '20%', left: '82%', size: 44, duration: 24, delay: 1 }, // graduation cap
  { path: 'M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z', top: '75%', left: '85%', size: 40, duration: 28, delay: 2 }, // shield
  { path: 'M12 2 4 21l8-5 8 5-8-19Z', top: '42%', left: '4%', size: 30, duration: 20, delay: 4 }, // pencil/nib
  { path: 'M8 6 3 12l5 6 M16 6l5 6-5 6 M13 4l-2 16', top: '88%', left: '45%', size: 38, duration: 30, delay: 1.5 }, // code brackets
  { path: 'M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z M7 10v2a5 5 0 0 0 10 0v-2 M12 17v4 M9 21h6', top: '8%', left: '55%', size: 34, duration: 25, delay: 3.5 }, // lock/mic-shaped: certificate stand-in
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
          strokeWidth="1.4"
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
