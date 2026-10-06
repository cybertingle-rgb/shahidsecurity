import { listMedia } from '@/lib/media';
import { uploadMedia, deleteMedia } from './actions';
import type { Media } from '@/db/schema';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaCard({ item }: { item: Media }) {
  const remove = deleteMedia.bind(null, item.id);
  const isImage = item.mimeType.startsWith('image/');

  return (
    <div className="space-y-2 rounded-lg border border-border bg-bg-elevated/60 p-3">
      {isImage ? (
        <img src={`/api/media/${item.id}`} alt={item.altText ?? item.fileName} className="h-32 w-full rounded object-cover" />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded bg-bg text-xs text-text-muted">{item.mimeType}</div>
      )}
      <p className="truncate text-xs text-text-muted" title={item.fileName}>
        {item.fileName}
      </p>
      <p className="text-xs text-text-muted">{formatSize(item.sizeBytes)}</p>
      <div className="flex items-center justify-between">
        <a href={`/api/media/${item.id}`} target="_blank" rel="noreferrer" className="text-xs text-neon">
          open
        </a>
        <form action={remove}>
          <button type="submit" className="text-xs text-danger underline">
            delete
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function MediaLibraryPage() {
  const items = await listMedia();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Media library</h1>

      <form action={uploadMedia} className="flex items-end gap-3 rounded-lg border border-border bg-bg-elevated/60 p-4">
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="file">
            Upload a file (JPEG, PNG, WebP, GIF, or PDF — up to 10MB)
          </label>
          <input id="file" name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.pdf" required className="text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Upload
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
        {items.length === 0 && <p className="col-span-full text-center text-text-muted">No files uploaded yet.</p>}
      </div>
    </div>
  );
}
