'use client';

import { useEffect, useRef } from 'react';

/**
 * Matrix-style "0"/"1" digit trail that follows the pointer — ported from
 * the root marketing site's CursorParticles.astro. Same pooled-particle
 * flow (a capped pool, pre-allocated and reused, each "respawned" near
 * the cursor on movement and fading out over its lifetime), just with
 * each particle carrying a '0'/'1' glyph in Matrix-movie green instead of
 * a plain dot. Canvas-based rather than one DOM node per particle.
 */
export default function MatrixCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canvas || !ctx || prefersReducedMotion) return;

    const PARTICLE_COUNT = 42;
    const MATRIX_GREEN = '57, 255, 90';

    type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; char: string; active: boolean };

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 0,
      char: '0',
      active: false,
    }));

    let nextIndex = 0;
    let rafId = 0;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx?.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function spawn(x: number, y: number) {
      const p = particles[nextIndex]!;
      nextIndex = (nextIndex + 1) % PARTICLE_COUNT;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.4;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 0.3;
      p.maxLife = 40 + Math.random() * 30;
      p.life = p.maxLife;
      p.size = 10 + Math.random() * 8;
      p.char = Math.random() < 0.5 ? '0' : '1';
      p.active = true;
    }

    function onPointerMove(e: PointerEvent) {
      spawn(e.clientX, e.clientY);
      spawn(e.clientX, e.clientY);
    }

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const p of particles) {
        if (!p.active) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        const alpha = p.life / p.maxLife;
        ctx.font = `600 ${(p.size * alpha).toFixed(1)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = `rgba(${MATRIX_GREEN}, ${(alpha * 0.85).toFixed(3)})`;
        ctx.shadowColor = `rgba(${MATRIX_GREEN}, ${(alpha * 0.9).toFixed(3)})`;
        ctx.shadowBlur = 8;
        ctx.fillText(p.char, p.x, p.y);
      }

      rafId = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="cursor-particles" aria-hidden="true" />;
}
