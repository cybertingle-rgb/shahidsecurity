'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadCourseThumbnail } from '../courses/actions';

/**
 * Two ways to set a thumbnail: paste a direct image URL, or upload a
 * file (stored through the same validated path as the general media
 * library — see src/lib/media.ts). Either way the result lives in this
 * one `thumbnailUrl` field, so a successful upload fills the text input
 * with the real link to the now-uploaded file — visible, copyable, and
 * re-editable exactly like a pasted URL would be, and validated by the
 * same isSafeThumbnailUrl check on submit either way. The browser's own
 * <img> fetch is what actually confirms either kind of URL loads, never
 * a server-side request (see lib/thumbnails.ts's isSafeThumbnailUrl for
 * why that matters for a pasted external URL).
 */
export default function ThumbnailUrlField({ defaultValue }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue ?? '');
  const [broken, setBroken] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    startUpload(async () => {
      try {
        const formData = new FormData();
        formData.set('file', file);
        const { url: uploadedUrl } = await uploadCourseThumbnail(formData);
        setUrl(uploadedUrl);
        setBroken(false);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        // Allows re-selecting the same file again after a failed attempt.
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  }

  return (
    <div>
      <label className="block text-sm text-text-muted" htmlFor="thumbnailUrl">
        Thumbnail image
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
      <div className="mt-2 flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:border-neon">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} disabled={isUploading} className="hidden" />
          {isUploading ? 'Uploading…' : 'Upload image instead'}
        </label>
        <span className="text-xs text-text-muted">JPEG, PNG, WebP or GIF, up to 10MB.</span>
      </div>
      {uploadError && <p className="mt-1 text-xs text-danger">{uploadError}</p>}
      <p className="mt-1 text-xs text-text-muted">
        Paste a direct https:// image link, or upload a file — uploading fills this field with the link to it. Recommended 16:9, at least 640×360.
      </p>
      {url && (
        <div className="mt-2 flex h-32 w-full max-w-xs items-center justify-center overflow-hidden rounded-md border border-border bg-bg-elevated">
          {broken ? (
            <span className="text-xs text-text-muted">Image couldn&apos;t load — check the URL</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- live preview of an arbitrary admin-entered or just-uploaded URL, not a known static/remote asset Next can optimize
            <img src={url} alt="Thumbnail preview" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          )}
        </div>
      )}
    </div>
  );
}
