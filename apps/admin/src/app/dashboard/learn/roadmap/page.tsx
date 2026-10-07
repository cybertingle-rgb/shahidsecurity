import { listRoadmapStages } from '@/lib/learn/roadmap';
import ConfirmSubmitButton from '../_components/ConfirmSubmitButton';
import { createRoadmapStage, updateRoadmapStage, deleteRoadmapStage } from './actions';

export default async function LearnRoadmapPage() {
  const stages = await listRoadmapStages();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Roadmap</h1>
        <p className="text-sm text-text-muted">
          Feeds shahidiqbal.com/learn/roadmap — a map, not a mandate. Edits here are picked up on the marketing site's next build.
        </p>
      </div>

      <div className="space-y-3">
        {stages.map((stage) => (
          <details key={stage.id} className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-medium">
              {stage.levelNumber}. {stage.title} {stage.isRequired && <span className="text-xs text-neon-soft">(genuinely required)</span>}
            </summary>
            <form action={updateRoadmapStage.bind(null, stage.id)} className="mt-3 space-y-3">
              <div className="grid grid-cols-[5rem_1fr] gap-2">
                <input name="levelNumber" type="number" defaultValue={stage.levelNumber} className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
                <input name="title" defaultValue={stage.title} required className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
              </div>
              <textarea name="description" defaultValue={stage.description ?? ''} rows={2} placeholder="Description" className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
              <input
                name="prerequisitesText"
                defaultValue={stage.prerequisitesText ?? ''}
                placeholder="Prerequisites (e.g. 'Helpful: networking basics')"
                className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-text-muted">
                <input type="checkbox" name="isRequired" defaultChecked={stage.isRequired} /> Genuinely required before later stages (not just "helpful")
              </label>
              <div className="flex gap-2">
                <button type="submit" className="rounded-md bg-neon px-3 py-1.5 text-xs font-medium text-bg">
                  Save
                </button>
              </div>
            </form>
            <form action={deleteRoadmapStage.bind(null, stage.id)} className="mt-2">
              <ConfirmSubmitButton confirmMessage={`Delete the roadmap stage "${stage.title}"? This cannot be undone.`} className="text-xs text-danger">
                Delete stage
              </ConfirmSubmitButton>
            </form>
          </details>
        ))}
      </div>

      <form action={createRoadmapStage} className="space-y-3 rounded-lg border border-dashed border-border-strong p-4">
        <h2 className="font-medium">Add a stage</h2>
        <div className="grid grid-cols-[5rem_1fr] gap-2">
          <input name="levelNumber" type="number" placeholder="#" className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
          <input name="title" required placeholder="Title" className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
        </div>
        <textarea name="description" rows={2} placeholder="Description" className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
        <input name="prerequisitesText" placeholder="Prerequisites" className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="isRequired" /> Genuinely required
        </label>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Add stage
        </button>
      </form>
    </div>
  );
}
