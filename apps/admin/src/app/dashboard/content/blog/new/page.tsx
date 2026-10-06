import { createBlogPost } from '../actions';

export default function NewBlogPostPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">New blog post</h1>
      <form action={createBlogPost} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <FieldInput label="Title" name="title" required />
        <FieldTextarea label="Description" name="description" rows={2} />
        <FieldTextarea label="Body (Markdown)" name="bodyMarkdown" rows={16} />
        <FieldInput label="Related service slug" name="relatedServiceSlug" placeholder="e.g. penetration-testing" />
        <FieldInput label="Tags (comma-separated)" name="tags" placeholder="e.g. ai-security, incident-response" />
        <FieldTextarea
          label="FAQs"
          name="faqs"
          rows={6}
          placeholder={'Q: Question one?\nA: Answer one.\n\nQ: Question two?\nA: Answer two.'}
        />
        <FieldInput label="SEO title" name="seoTitle" />
        <FieldTextarea label="SEO description" name="seoDescription" rows={2} />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Create draft
        </button>
      </form>
    </div>
  );
}

function FieldInput({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}

function FieldTextarea({ label, name, rows, placeholder }: { label: string; name: string; rows: number; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-neon focus:outline-none"
      />
    </div>
  );
}
