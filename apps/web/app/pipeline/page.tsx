"use client";

import { useState } from "react";
import { Button, Card, Badge, TextInput, PipelineProgress, PipelineStep } from "../../components/ui";

const pipelineSteps = [
  { label: "Ingesting", status: "complete" as const },
  { label: "Chunking", status: "complete" as const },
  { label: "Embedding", status: "complete" as const },
  { label: "Prompt Gen", status: "active" as const },
  { label: "Evaluating", status: "pending" as const },
  { label: "Deployed", status: "pending" as const },
];

export default function PipelinePage() {
  const [jobId, setJobId] = useState("");

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
            <a href="/dashboard" className="text-body-sm text-slate hover:text-ink transition-colors">Dashboard</a>
            <a href="/pipeline" className="text-body-sm-medium text-ink">Pipeline</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-section">
        <div className="mb-8">
          <h1 className="text-h1-display text-ink">Pipeline</h1>
          <p className="mt-2 text-subtitle text-slate">Track document processing in real time.</p>
        </div>

        <div className="mb-8 flex items-end gap-4">
          <div className="flex-1">
            <TextInput label="Job ID" placeholder="job_9k3m2n1p" value={jobId} onChange={(e) => setJobId(e.target.value)} />
          </div>
          <Button variant="primary">Track</Button>
        </div>

        <Card variant="feature" className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-h4 text-ink">Pipeline Progress</h2>
            <Badge variant="cream">Job: job_9k3m2n1p</Badge>
          </div>

          <div className="mb-8">
            <PipelineProgress steps={pipelineSteps} />
          </div>

          <div className="space-y-3">
            <h3 className="text-h5 text-ink">SSE Event Log</h3>
            {[
              { time: "14:23:01", event: "ingesting", data: "Extracting text from api-docs-v3.pdf (24 pages)" },
              { time: "14:23:04", event: "chunking", data: "Split into 48 chunks (overlap: 200 chars)" },
              { time: "14:23:07", event: "embedding", data: "Generated 48 embeddings (1536-dim)" },
              { time: "14:23:10", event: "prompt_gen", data: "Generating system prompt from context..." },
            ].map((log, i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border border-hairline-soft bg-surface-code p-3 font-mono text-code-md">
                <span className="shrink-0 text-stone">{log.time}</span>
                <Badge variant="dark">{log.event}</Badge>
                <span className="text-on-dark-muted">{log.data}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
