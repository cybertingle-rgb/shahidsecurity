import { seoFindings, countByPriority, SEO_AUDIT_SNAPSHOT_DATE, type SeoFindingPriority } from '@/admin-core/lib/seo/findings';

const PRIORITY_STYLES: Record<SeoFindingPriority, string> = {
  P0: 'border-danger/40 bg-danger/10 text-danger',
  P1: 'border-warn/40 bg-warn/10 text-warn',
  P2: 'border-border bg-bg-elevated/60 text-text-muted',
  P3: 'border-border bg-bg-elevated/30 text-text-muted',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  resolved: 'Resolved',
  'owner-dependent': 'Needs owner action',
};

export default function SeoHealthPage() {
  const counts = countByPriority(seoFindings);
  const sorted = [...seoFindings].sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">SEO health</h1>
        <p className="text-sm text-text-muted">
          Snapshot of the {SEO_AUDIT_SNAPSHOT_DATE} technical audit (docs/seo-growth/SEO_PRIORITY_MATRIX.md). This is a
          point-in-time record, not a live scan — re-sync it by hand each time the audit is re-run.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => (
          <div key={p} className={`rounded-lg border p-3 text-center ${PRIORITY_STYLES[p]}`}>
            <div className="text-2xl font-semibold">{counts[p]}</div>
            <div className="text-xs">{p}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Finding</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Phase</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => (
              <tr key={f.id} className="border-t border-border align-top">
                <td className="px-4 py-2 font-mono text-xs text-text-muted">{f.id}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${PRIORITY_STYLES[f.priority]}`}>{f.priority}</span>
                </td>
                <td className="px-4 py-2">
                  <div>{f.finding}</div>
                  <div className="mt-1 text-xs text-text-muted">{f.impact}</div>
                </td>
                <td className="px-4 py-2 text-text-muted">{STATUS_LABEL[f.status]}</td>
                <td className="px-4 py-2 text-text-muted">{f.phase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
