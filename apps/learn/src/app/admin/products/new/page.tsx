import { createProduct } from '../actions';

export default function NewProductPage() {
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">New product</h1>
      <form action={createProduct} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
            <option value="course">Course</option>
            <option value="membership">Membership</option>
            <option value="bundle">Bundle</option>
            <option value="workshop">Workshop</option>
            <option value="bootcamp">Bootcamp</option>
            <option value="mentoring">Mentoring</option>
            <option value="digital_product">Digital product</option>
            <option value="live_class">Live class</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" rows={3} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Create product
        </button>
      </form>
    </div>
  );
}
