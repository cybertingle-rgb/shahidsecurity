import { createService } from '../actions';

export default function NewServicePage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">New service</h1>
      <form action={createService} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <FieldInput label="Name" name="name" required />
        <FieldTextarea label="Short description" name="shortDescription" rows={2} />
        <FieldTextarea label="Body (Markdown)" name="bodyMarkdown" rows={10} />
        <FieldInput label="SEO title" name="seoTitle" />
        <FieldTextarea label="SEO description" name="seoDescription" rows={2} />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Create draft
        </button>
      </form>
    </div>
  );
}

function FieldInput({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}

function FieldTextarea({ label, name, rows }: { label: string; name: string; rows: number }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-neon focus:outline-none"
      />
    </div>
  );
}
