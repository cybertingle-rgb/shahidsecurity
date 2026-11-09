'use client';

import { useEffect } from 'react';

// The interactive half of Preloader.tsx — same logic as the Astro
// version's inline <script>, translated to a useEffect since Next.js
// Server Components can't ship inline scripts the same way. Renders
// nothing itself; it just reaches into the DOM nodes Preloader.tsx
// already rendered by id, same approach as the Astro original.
export function PreloaderController() {
  useEffect(() => {
    const preloader = document.getElementById('preloader');
    const terminal = document.getElementById('preloader-terminal');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;

    function typeBrand() {
      if (!terminal || prefersReducedMotion) return;
      const typedEl = terminal.querySelector<HTMLElement>('.preloader-typed');
      if (!typedEl) return;
      terminal.classList.add('is-animated');
      const text = 'SHAHID SECURITY';
      let i = 0;
      function tick() {
        if (cancelled) return;
        typedEl!.textContent = text.slice(0, i);
        i++;
        if (i <= text.length) setTimeout(tick, 45);
      }
      tick();
    }
    typeBrand();

    // Only ever toggles a class — never calls preloader.remove() or any
    // other native DOM mutation on this node. React rendered #preloader
    // (Preloader.tsx) and keeps it mounted in its own tree for the whole
    // session (it's not conditionally rendered), so removing it directly
    // via the DOM API desyncs React's internal fiber tree from the real
    // DOM without React ever knowing. The next time React reconciles
    // anywhere near this node — reliably, the very next client-side
    // navigation — it throws "Failed to execute 'removeChild' on 'Node':
    // the node to be removed is not a child of this node", an uncaught
    // error with no page-level recovery since it originates in the root
    // layout. .is-hidden alone (opacity: 0, pointer-events: none on a
    // position: fixed, inset: 0 element — globals.css) already makes this
    // fully invisible and non-interactive, so there's nothing left for a
    // DOM removal to accomplish.
    function hidePreloader() {
      if (!preloader) return;
      preloader.classList.add('is-hidden');
    }

    const minDisplay = prefersReducedMotion ? 0 : 900;
    const start = Date.now();

    function finish() {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, minDisplay - elapsed);
      setTimeout(hidePreloader, remaining);
    }

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }

    // Safety net: never let this block the page indefinitely.
    const safety = setTimeout(hidePreloader, 2500);

    return () => {
      cancelled = true;
      window.removeEventListener('load', finish);
      clearTimeout(safety);
    };
  }, []);

  return null;
}
