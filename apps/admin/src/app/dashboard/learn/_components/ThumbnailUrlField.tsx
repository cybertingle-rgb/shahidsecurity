'use client';

import { useState } from 'react';

/**
 * V1's thumbnail "upload" is a URL field — there's no file storage yet
 * (docs/lms-admin-guide.md). This is the client-side preview + safe
 * fallback that stands in for it: the browser's own <img> fetch is what
 * actually confirms the URL loads, never a server-side request (see
 * lib/thumbnails.ts's isSafeThumbnailUrl for why that matters).
 */
export default function ThumbnailUrlField({ defaultValue }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue ?? '');
  const [broken, setBroken] = useState(false);

  return (
    <div>
      <label className="block text-sm text-text-muted" htmlFor="thumbnailUrl">
        Thumbnail image URL
      </label>
      <input
        id="thumbnailUrl"
        name="thumbnailUrl"
        type="url"
        placeholder="https://..."
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setBroken(false);
        }}
        className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
      />
      <p className="mt-1 text-xs text-text-muted">Must be a direct https:// image link. Recommended 16:9, at least 640×360.</p>
      {url && (
        <div className="mt-2 flex h-32 w-full max-w-xs items-center justify-center overflow-hidden rounded-md border border-border bg-bg-elevated">
          {broken ? (
            <span className="text-xs text-text-muted">Image couldn&apos;t load — check the URL</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- live preview of an arbitrary admin-entered URL, not a known static/remote asset Next can optimize
            <img src={url} alt="Thumbnail preview" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          )}
        </div>
      )}
    </div>
  );
}
