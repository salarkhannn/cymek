"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function PipelineLookupPage() {
  const router = useRouter();
  const [jobId, setJobId] = useState("");

  function handleTrack() {
    const id = jobId.trim();
    if (id) {
      router.push(`/pipeline/${id}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-section">
      <div className="mb-8 text-center">
        <Badge variant="cream" className="mb-3">Pipeline</Badge>
        <h1 className="text-h1-display font-display text-ink mb-2">
          Track a Pipeline
        </h1>
        <p className="text-body-md text-steel">
          Enter a job ID to view its real-time progress.
        </p>
      </div>

      <Card variant="cream">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <TextInput
              label="Job ID"
              placeholder="job_9k3m2n1p"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTrack();
              }}
            />
          </div>
          <Button variant="primary" onClick={handleTrack} disabled={!jobId.trim()}>
            Track
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default PipelineLookupPage;
