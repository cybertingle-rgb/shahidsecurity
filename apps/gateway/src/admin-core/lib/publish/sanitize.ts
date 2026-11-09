/**
 * Content from the CMS is treated as Markdown text only, never raw
 * HTML/JSX/MDX components — rejecting any literal script/iframe/object/
 * embed tag or MDX component syntax outright, rather than trying to
 * strip-and-allow a safe subset. The brief is explicit: do not allow
 * arbitrary HTML or <script> injection from the admin panel. Since this
 * content ends up compiled by Astro's own MDX pipeline, letting through
 * a raw `<script>` or an arbitrary `<Component />` tag would mean a
 * CMS field could execute code in the actual Astro build, not just
 * render unsafely — rejecting at validation time instead of attempting
 * runtime sanitization closes that off entirely.
 */
const DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<style[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i, // inline event handlers, e.g. onclick=
  // MDX/JSX component usage — an uppercase-leading tag — isn't valid
  // CommonMark and would only do something if it resolved to a real
  // component import, which CMS content must never be able to trigger.
  /<[A-Z][a-zA-Z0-9]*[\s/>]/,
  // MDX expression braces ({ ... }) let arbitrary JS expressions appear
  // directly in the compiled output.
  /\{[^}]*\}/,
];

export class UnsafeContentError extends Error {}

/** Throws if the given Markdown body contains anything beyond plain Markdown text. */
export function assertSafeMarkdown(body: string, fieldName: string): void {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(body)) {
      throw new UnsafeContentError(`${fieldName} contains content that isn't allowed (raw HTML, scripts, or embedded expressions). Use plain Markdown only.`);
    }
  }
}

/** Plain-text fields (title, description, alt text) — no HTML/Markdown at all. */
export function assertSafePlainText(value: string, fieldName: string): void {
  if (/<[^>]+>/.test(value)) {
    throw new UnsafeContentError(`${fieldName} cannot contain HTML tags.`);
  }
}
