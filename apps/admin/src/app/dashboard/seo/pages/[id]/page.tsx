import { notFound } from 'next/navigation';
import { getSeoPageById } from '@/lib/seo';
import { updateSeoPageOverride, deleteSeoPageOverride } from '../../actions';

export default async function EditSeoPageOverride({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const override = await getSeoPageById(id);
  if (!override) notFound();

  const boundUpdate = updateSeoPageOverride.bind(null, id);
  const remove = deleteSeoPageOverride.bind(null, id);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">{override.path}</h1>
      <form action={boundUpdate} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <Field label="Title override" name="title" defaultValue={override.title ?? ''} />
        <Field label="Description override" name="description" defaultValue={override.description ?? ''} />
        <Field label="Canonical URL" name="canonicalUrl" defaultValue={override.canonicalUrl ?? ''} />
        <Field label="Robots directive" name="robotsDirective" defaultValue={override.robotsDirective ?? ''} />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save
        </button>
      </form>
      <form action={remove}>
        <button type="submit" className="rounded-md border border-danger px-4 py-2 text-sm text-danger">
          Delete override
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}
