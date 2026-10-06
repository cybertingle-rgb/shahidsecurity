import { notFound } from 'next/navigation';
import { getServiceById } from '@/lib/services';
import { updateService, setServiceStatus, deleteService } from '../actions';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) notFound();

  const boundUpdate = updateService.bind(null, id);
  const publish = setServiceStatus.bind(null, id, 'published');
  const unpublish = setServiceStatus.bind(null, id, 'draft');
  const remove = deleteService.bind(null, id);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{service.name}</h1>
        <span className={service.status === 'published' ? 'text-sm text-neon-soft' : 'text-sm text-text-muted'}>{service.status}</span>
      </div>

      <form action={boundUpdate} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <FieldInput label="Name" name="name" defaultValue={service.name} required />
        <FieldTextarea label="Short description" name="shortDescription" rows={2} defaultValue={service.shortDescription ?? ''} />
        <FieldTextarea label="Body (Markdown)" name="bodyMarkdown" rows={10} defaultValue={service.bodyMarkdown ?? ''} />
        <FieldInput label="SEO title" name="seoTitle" defaultValue={service.seoTitle ?? ''} />
        <FieldTextarea label="SEO description" name="seoDescription" rows={2} defaultValue={service.seoDescription ?? ''} />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save
        </button>
      </form>

      <div className="flex gap-3">
        {service.status === 'published' ? (
          <form action={unpublish}>
            <button type="submit" className="rounded-md border border-warn px-4 py-2 text-sm text-warn">
              Unpublish
            </button>
          </form>
        ) : (
          <form action={publish}>
            <button type="submit" className="rounded-md border border-neon px-4 py-2 text-sm text-neon">
              Publish
            </button>
          </form>
        )}
        {service.status === 'draft' && (
          <form action={remove}>
            <button type="submit" className="rounded-md border border-danger px-4 py-2 text-sm text-danger">
              Delete draft
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function FieldInput({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}

function FieldTextarea({ label, name, rows, defaultValue }: { label: string; name: string; rows: number; defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-neon focus:outline-none"
      />
    </div>
  );
}
