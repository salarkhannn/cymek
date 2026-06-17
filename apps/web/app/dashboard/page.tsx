import { Card, Badge } from "../../components/ui";

const stats = [
  { label: "Total Jobs", value: "1,247", change: "+12%", up: true },
  { label: "Documents Processed", value: "8,432", change: "+8%", up: true },
  { label: "Avg Eval Score", value: "0.82", change: "+0.03", up: true },
  { label: "Active Pipelines", value: "3", change: null, up: true },
];

const recentJobs = [
  { id: "job_9k3m2n1p", status: "deployed", doc: "api-docs-v3.pdf", score: 0.89, date: "2 min ago" },
  { id: "job_7h2f1d8q", status: "evaluating", doc: "product-spec.docx", score: null, date: "5 min ago" },
  { id: "job_4x1c9v0b", status: "deployed", doc: "faq-2026.txt", score: 0.94, date: "12 min ago" },
  { id: "job_2w8p5m3z", status: "failed", doc: "terms.pdf", score: null, date: "1 hr ago" },
];

const statusColor: Record<string, string> = {
  deployed: "bg-success/10 text-success border-success/20",
  evaluating: "bg-warning/10 text-warning border-warning/20",
  failed: "bg-error/10 text-error border-error/20",
  pending: "bg-hairline/50 text-steel border-hairline",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="h-1 twilight-gradient" />
      <header className="border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg twilight-gradient text-on-dark text-caption-bold">C</div>
            <span className="text-body-md-medium text-ink">Cymek</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="/onboard" className="text-body-sm text-slate hover:text-ink transition-colors">Onboard</a>
            <a href="/dashboard" className="text-body-sm-medium text-ink">Dashboard</a>
            <a href="/pipeline" className="text-body-sm text-slate hover:text-ink transition-colors">Pipeline</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-section">
        <div className="mb-8">
          <h1 className="text-h1-display text-ink">Dashboard</h1>
          <p className="mt-2 text-subtitle text-slate">Monitor your RAG pipeline health and performance.</p>
        </div>

        <div className="mb-12 grid gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} variant="feature-product" className="p-6">
              <p className="text-caption-bold text-steel">{s.label}</p>
              <p className="mt-2 text-stat-display text-ink">{s.value}</p>
              {s.change && (
                <p className={`mt-1 text-caption-bold ${s.up ? "text-success" : "text-error"}`}>{s.change}</p>
              )}
            </Card>
          ))}
        </div>

        <Card variant="feature" className="p-6">
          <h2 className="mb-6 text-h4 text-ink">Recent Jobs</h2>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border border-hairline-soft bg-surface p-4">
                <div className="flex items-center gap-4">
                  <Badge variant="dark">{job.status}</Badge>
                  <div>
                    <p className="text-body-sm-medium text-ink">{job.doc}</p>
                    <p className="text-caption text-stone">{job.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {job.score && <span className="text-body-sm-medium text-ink">{job.score.toFixed(2)}</span>}
                  <span className="text-caption text-stone">{job.date}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
