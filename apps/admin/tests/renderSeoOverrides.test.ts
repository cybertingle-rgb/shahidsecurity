import { describe, it, expect } from 'vitest';
import { buildSeoOverridesFile, InvalidSeoOverrideError } from '@/lib/publish/renderSeoOverrides';

const EMPTY_FILE = JSON.stringify({ _comment: 'generated', overrides: {} }, null, 2);

describe('buildSeoOverridesFile', () => {
  it('adds a new override for a path with no existing entry', () => {
    const result = buildSeoOverridesFile(EMPTY_FILE, {
      path: '/services/penetration-testing/',
      title: 'Penetration Testing Services',
      description: 'A custom description.',
      canonicalUrl: null,
      robotsDirective: null,
    });
    const parsed = JSON.parse(result);
    expect(parsed.overrides['/services/penetration-testing/']).toEqual({
      title: 'Penetration Testing Services',
      description: 'A custom description.',
    });
  });

  it('merges into existing overrides without disturbing other paths', () => {
    const existing = JSON.stringify({
      _comment: 'generated',
      overrides: { '/about/': { title: 'About Us' } },
    });
    const result = buildSeoOverridesFile(existing, {
      path: '/blog/',
      title: 'Blog',
      description: null,
      canonicalUrl: null,
      robotsDirective: null,
    });
    const parsed = JSON.parse(result);
    expect(parsed.overrides['/about/']).toEqual({ title: 'About Us' });
    expect(parsed.overrides['/blog/']).toEqual({ title: 'Blog' });
  });

  it('removes a path entirely when every field is empty (restores code-controlled defaults)', () => {
    const existing = JSON.stringify({
      _comment: 'generated',
      overrides: { '/about/': { title: 'About Us' } },
    });
    const result = buildSeoOverridesFile(existing, {
      path: '/about/',
      title: null,
      description: null,
      canonicalUrl: null,
      robotsDirective: null,
    });
    const parsed = JSON.parse(result);
    expect(parsed.overrides['/about/']).toBeUndefined();
  });

  it('rejects a path that is not an absolute, trailing-slash path', () => {
    expect(() =>
      buildSeoOverridesFile(EMPTY_FILE, {
        path: 'about',
        title: 'About',
        description: null,
        canonicalUrl: null,
        robotsDirective: null,
      }),
    ).toThrow(InvalidSeoOverrideError);
  });

  it('rejects HTML in the title or description', () => {
    expect(() =>
      buildSeoOverridesFile(EMPTY_FILE, {
        path: '/about/',
        title: 'About <script>alert(1)</script>',
        description: null,
        canonicalUrl: null,
        robotsDirective: null,
      }),
    ).toThrow();
  });

  it('refuses to overwrite a file that is not valid JSON', () => {
    expect(() =>
      buildSeoOverridesFile('not valid json {{{', {
        path: '/about/',
        title: 'About',
        description: null,
        canonicalUrl: null,
        robotsDirective: null,
      }),
    ).toThrow(InvalidSeoOverrideError);
  });
});
