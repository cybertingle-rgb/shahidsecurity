import { createSeoPageOverride } from '../../actions';

export default function NewSeoPageOverride() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">New SEO override</h1>
      <form action={createSeoPageOverride} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <Field label="Path" name="path" placeholder="/services/penetration-testing/" required />
        <Field label="Title override" name="title" />
        <Field label="Description override" name="description" />
        <Field label="Canonical URL" name="canonicalUrl" placeholder="https://shahidiqbal.com/..." />
        <Field label="Robots directive" name="robotsDirective" placeholder="e.g. noindex, nofollow" />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Create
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, placeholder, required }: { label: string; name: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}
