"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { ScoreBar } from "../../components/ui/ScoreBar";
import { getTenant, type TenantInfo } from "../../lib/api";

interface Job {
  id: string;
  status: string;
  stage: string;
  evalScore: number | null;
  warning: boolean;
  createdAt: string;
}

function DashboardPage() {
  const router = useRouter();
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("cymek_tenant");
    if (!stored) {
      setLoading(false);
      return;
    }

    const tenantId = stored;

    getTenant(tenantId)
      .then((info) => {
        setTenantInfo(info);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load tenant");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!tenantInfo) return;

    const tid = tenantInfo.id;
    async function fetchJobs() {
      try {
        const res = await fetch(`/api/pipeline/jobs?tenantId=${tid}`);
        if (res.ok) {
          const data = await res.json();
          setJobs(Array.isArray(data) ? data : []);
        }
      } catch {
        // orchestrator may not be running
      }
    }

    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [tenantInfo]);

  const latestJob = jobs.length > 0
    ? jobs.reduce((latest, job) =>
        new Date(job.createdAt) > new Date(latest.createdAt) ? job : latest,
      )
    : null;

  const endpointUrl = tenantInfo
    ? `${window.location.origin}/api/chat/${tenantInfo.id}`
    : "";

  const embedSnippet = tenantInfo?.embedSnippet ?? "";

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-section">
        <p className="text-body-md text-steel">Loading...</p>
      </div>
    );
  }

  if (!tenantInfo) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-section text-center">
        {error && (
          <Badge variant="primary" className="mb-3">Error</Badge>
        )}
        <h1 className="text-h1-display font-display text-ink mb-4">
          {error ? "Could not load dashboard" : "No pipeline yet"}
        </h1>
        <p className="text-body-md text-steel mb-6">
          {error
            ? error
            : "Create your first pipeline to see your dashboard."}
        </p>
        <Button variant="primary" onClick={() => router.push("/onboard")}>
          {error ? "Try Again" : "Create Pipeline"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-section">
      <div className="mb-8">
        <Badge variant="primary" className="mb-3">Dashboard</Badge>
        <h1 className="text-h1-display font-display text-ink mb-2">
          Your Pipeline
        </h1>
        <p className="text-body-sm text-steel">{tenantInfo.useCase}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card variant="cream">
          <h3 className="text-h5 text-ink mb-3">API Endpoint</h3>
          <TextInput
            value={endpointUrl}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </Card>

        <Card variant="cream">
          <h3 className="text-h5 text-ink mb-3">Tenant ID</h3>
          <TextInput
            value={tenantInfo.id}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </Card>
      </div>

      <div className="flex gap-3 mb-6">
        <Button variant="primary" onClick={() => router.push(`/chat?tenantId=${tenantInfo.id}`)}>
          Open Chat
        </Button>
        <Button variant="secondary" onClick={() => router.push("/onboard")}>
          New Pipeline
        </Button>
      </div>

      {latestJob?.evalScore !== null && latestJob?.evalScore !== undefined && (
        <Card variant="base" className="mb-6">
          <ScoreBar
            label="Latest Evaluation Score"
            score={Math.round((latestJob.evalScore ?? 0) * 100)}
          />
        </Card>
      )}

      <Card variant="base" className="mb-6">
        <h3 className="text-h5 text-ink mb-3">Embed Snippet</h3>
        <CodeBlock header="index.html" code={embedSnippet} />
      </Card>

      <Card variant="base">
        <h3 className="text-h5 text-ink mb-3">Recent Jobs</h3>
        {jobs.length === 0 ? (
          <p className="text-body-sm text-steel">No jobs found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-md border border-hairline-soft p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-body-sm-medium text-ink">
                    {job.stage || job.status}
                  </span>
                  <span className="text-caption text-muted font-mono">
                    {job.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {job.evalScore !== null && (
                    <span className="text-body-sm text-primary">
                      {Math.round(job.evalScore * 100)}%
                    </span>
                  )}
                  <Badge
                    variant={
                      job.status === "completed"
                        ? job.warning ? "cream" : "primary"
                        : job.status === "failed"
                          ? "primary"
                          : "cream"
                    }
                  >
                    {job.warning ? "Warning" : job.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default DashboardPage;
