import type { ReactNode } from 'react';

/**
 * Glass/terminal-style card used by /login and /register. Stays put —
 * no pointer-tracked tilt — with a single neon-green trace continuously
 * sweeping clockwise around the border (a conic-gradient rotated via the
 * registered --auth-angle custom property) instead of a multi-color halo.
 */
export default function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth-card-wrap">
      <div className="auth-card-glow" />
      <div className="auth-card">
        <div className="auth-card-termbar" aria-hidden="true">
          <span className="auth-card-dot auth-card-dot-red" />
          <span className="auth-card-dot auth-card-dot-yellow" />
          <span className="auth-card-dot auth-card-dot-green" />
        </div>
        <h1 className="auth-card-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
