// Ported from the root marketing site's SocialRail.astro — same floating
// edge rail, same rotating blue+green neon ring per icon, same per-platform
// hover accent. Used only on the public-facing pages (home, courses, auth
// forms), not inside /dashboard or /admin — those already have the portal
// sidebar docked at the same left edge. No phone/WhatsApp entry here
// deliberately — all contact is email-only (info@shahidiqbal.com).
const FACEBOOK_LINK = 'https://www.facebook.com/shahidsecurityofficial';
const INSTAGRAM_LINK = 'https://www.instagram.com/shahidsecurityofficial';
const X_LINK = 'https://x.com/shahidsecurity';

export default function SocialRail() {
  return (
    <nav className="social-rail" aria-label="Social links">
      <span className="social-ring" data-accent="facebook">
        <a href={FACEBOOK_LINK} target="_blank" rel="noopener" className="social-pill" data-accent="facebook" aria-label="Facebook">
          <span className="social-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.918 8.437-9.94" />
            </svg>
          </span>
          <span className="social-label">Facebook</span>
        </a>
      </span>

      <span className="social-ring" data-accent="instagram">
        <a href={INSTAGRAM_LINK} target="_blank" rel="noopener" className="social-pill" data-accent="instagram" aria-label="Instagram">
          <span className="social-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.92-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.07 4.849-.07M12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.332 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.668-.072-4.948C23.73 2.7 21.308.273 16.95.072 15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881" />
            </svg>
          </span>
          <span className="social-label">Instagram</span>
        </a>
      </span>

      <span className="social-ring" data-accent="x">
        <a href={X_LINK} target="_blank" rel="noopener" className="social-pill" data-accent="x" aria-label="X (Twitter)">
          <span className="social-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </span>
          <span className="social-label">X</span>
        </a>
      </span>
    </nav>
  );
}
