"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { apiFetch, getTenant, type TenantInfo } from "../../lib/api";

interface Job {
  id: string;
  status: string;
  stage: string;
  evalScore: number | null;
  warning: boolean;
  createdAt: string;
}

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  useCase: string | null;
  createdAt: string;
}

function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/sign-in");
      return;
    }

    (async () => {
      try {
        const res = await apiFetch("/api/auth/tenants");
        if (res.ok) {
          const data = await res.json();
          setTenants(data.tenants ?? []);
          if (data.tenants?.length > 0) {
            setSelectedTenant(data.tenants[0].id);
          }
        }
      } catch {
        // no tenants yet
      } finally {
        setLoading(false);
      }
    })();
    }, [user, isLoaded, router]);

  useEffect(() => {
    if (!selectedTenant) return;

    getTenant(selectedTenant)
      .then((info) => {
        setTenantInfo(info);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load tenant");
      });
  }, [selectedTenant]);

  useEffect(() => {
    const tenant = selectedTenant;
    if (!tenant) return;

    async function fetchJobs() {
      try {
        const res = await apiFetch(`/api/pipeline/jobs?tenantId=${encodeURIComponent(tenant!)}`);
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
  }, [selectedTenant]);

  const latestJob = jobs.length > 0
    ? jobs.reduce((latest, job) =>
        new Date(job.createdAt) > new Date(latest.createdAt) ? job : latest,
      )
    : null;

  const endpointUrl = tenantInfo
    ? `${window.location.origin}/api/chat/${tenantInfo.id}`
    : "";

  if (!isLoaded || loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-section">
        <p className="text-body-md text-steel">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (tenants.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-section text-center">
        <h1 className="text-h1-display font-display text-ink mb-4">
          No pipelines yet
        </h1>
        <p className="text-body-md text-steel mb-6">
          Create your first pipeline to see your dashboard.
        </p>
        <Button variant="primary" onClick={() => router.push("/onboard")}>
          Create Pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-section">
      <div className="mb-8">
        <Badge variant="primary" className="mb-3">Dashboard</Badge>
        <h1 className="text-h1-display font-display text-ink mb-2">
          Your Pipelines
        </h1>

        {tenants.length > 1 && (
          <div className="flex gap-2 mt-4">
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTenant(t.id)}
                className={`rounded-md px-3 py-1 text-body-sm transition-colors ${
                  selectedTenant === t.id
                    ? "bg-primary text-on-primary"
                    : "bg-surface text-steel border border-hairline hover:bg-hairline"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-error bg-error/5 p-3 mb-6">
          <p className="text-body-sm text-error">{error}</p>
        </div>
      )}

      {tenantInfo && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card variant="cream">
              <h3 className="text-h5 text-ink mb-3">Use Case</h3>
              <p className="text-body-md text-steel">{tenantInfo.useCase || "Not specified"}</p>
            </Card>

            <Card variant="cream">
              <h3 className="text-h5 text-ink mb-3">Tenant ID</h3>
              <p className="text-body-sm text-steel font-mono">{tenantInfo.id}</p>
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
              <h3 className="text-h5 text-ink mb-3">Latest Evaluation Score</h3>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-hairline overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round((latestJob.evalScore ?? 0) * 100)}%` }}
                  />
                </div>
                <span className="text-body-sm text-primary font-mono">
                  {Math.round((latestJob.evalScore ?? 0) * 100)}%
                </span>
              </div>
            </Card>
          )}

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
        </>
      )}
    </div>
  );
}

export default DashboardPage;
