'use client';

import { useRef, type PointerEvent, type ReactNode } from 'react';

/**
 * Glass card used by /login and /register: a rotating neon/RGB gradient
 * "traces" the border continuously (independent of the mouse), and the
 * card itself tilts subtly in 3D toward the pointer while hovered. Both
 * effects are pure CSS/transform — no layout impact if JS is disabled,
 * the tilt just doesn't animate.
 */
export default function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--tiltX', `${(-py * 8).toFixed(2)}deg`);
    card.style.setProperty('--tiltY', `${(px * 8).toFixed(2)}deg`);
  }

  function handlePointerLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--tiltX', '0deg');
    card.style.setProperty('--tiltY', '0deg');
  }

  return (
    <div className="auth-card-wrap">
      <div className="auth-card-glow" />
      <div
        ref={cardRef}
        className="auth-card"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <h1 className="auth-card-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
