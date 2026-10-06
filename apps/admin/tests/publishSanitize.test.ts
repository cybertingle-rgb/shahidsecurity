import { describe, it, expect } from 'vitest';
import { assertSafeMarkdown, assertSafePlainText, UnsafeContentError } from '@/lib/publish/sanitize';

describe('assertSafeMarkdown', () => {
  it('allows plain Markdown text', () => {
    expect(() => assertSafeMarkdown('## Heading\n\nSome **bold** text and a [link](/blog/).', 'Body')).not.toThrow();
  });

  it('rejects a raw <script> tag', () => {
    expect(() => assertSafeMarkdown('Text <script>alert(1)</script>', 'Body')).toThrow(UnsafeContentError);
  });

  it('rejects a raw <iframe> tag', () => {
    expect(() => assertSafeMarkdown('<iframe src="https://evil.example"></iframe>', 'Body')).toThrow(UnsafeContentError);
  });

  it('rejects a javascript: URI', () => {
    expect(() => assertSafeMarkdown('[click me](javascript:alert(1))', 'Body')).toThrow(UnsafeContentError);
  });

  it('rejects an inline event handler', () => {
    expect(() => assertSafeMarkdown('<img src=x onerror=alert(1)>', 'Body')).toThrow(UnsafeContentError);
  });

  it('rejects an uppercase-leading JSX/MDX component tag', () => {
    expect(() => assertSafeMarkdown('Some text <EvilComponent /> more text', 'Body')).toThrow(UnsafeContentError);
  });

  it('rejects an MDX expression brace', () => {
    expect(() => assertSafeMarkdown('Some text {fetch("https://evil.example")} more text', 'Body')).toThrow(UnsafeContentError);
  });
});

describe('assertSafePlainText', () => {
  it('allows plain text with no tags', () => {
    expect(() => assertSafePlainText('Ransomware in 2026', 'Title')).not.toThrow();
  });

  it('rejects any HTML tag', () => {
    expect(() => assertSafePlainText('Title <b>bold</b>', 'Title')).toThrow(UnsafeContentError);
  });
});
