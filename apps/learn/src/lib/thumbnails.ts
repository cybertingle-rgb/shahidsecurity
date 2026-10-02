/**
 * Course thumbnails are admin-entered URLs in V1 (no upload storage yet —
 * see docs/lms-admin-guide.md). This validates the URL string itself only;
 * it deliberately never makes a server-side request (HEAD or otherwise) to
 * fetch or probe it — that would be exactly the SSRF surface (an admin
 * account could make the server issue requests to internal services,
 * cloud metadata endpoints, or follow a redirect somewhere unsafe) this
 * function exists to avoid. The live `<img>` preview in the admin form is
 * what actually confirms the image loads, in the viewer's own browser.
 */
export function isSafeThumbnailUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;

  // Reject literal IP addresses outright rather than trying to parse and
  // range-check every private/loopback/link-local block (10.0.0.0/8,
  // 127.0.0.0/8, 169.254.0.0/16, ::1, fc00::/7, etc.) — a real image host
  // has a domain name; there's no legitimate case for an admin pasting a
  // bare IP, so the simplest check is also the safest one.
  const isIPv4Literal = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isIPv6Literal = host.includes(':') || (host.startsWith('[') && host.endsWith(']'));
  if (isIPv4Literal || isIPv6Literal) return false;

  return true;
}
