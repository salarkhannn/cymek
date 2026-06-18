"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { PipelineProgress } from "../../../components/ui/PipelineProgress";
import { ScoreBar } from "../../../components/ui/ScoreBar";
import { streamPipelineEvents, type SseEvent } from "../../../lib/api";

interface PipelinePageProps {
  params: { jobId: string };
}

const STAGE_LABELS: Record<string, string> = {
  ingesting: "Ingesting documents",
  chunking: "Chunking content",
  embedding: "Embedding vectors",
  prompt_gen: "Generating system prompt",
  evaluating: "Evaluating quality",
  deployed: "Deployed",
};

function PipelineProgressPage({ params }: PipelinePageProps) {
  const router = useRouter();
  const jobId = params.jobId;

  const [events, setEvents] = useState<SseEvent[]>([]);
  const [currentStage, setCurrentStage] = useState<string>("ingesting");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [warning, setWarning] = useState(false);
  const [evalScore, setEvalScore] = useState<number | undefined>(undefined);

  useEffect(() => {
    const controller = streamPipelineEvents(
      jobId,
      (event) => {
        setEvents((prev) => [...prev, event]);
        setCurrentStage(event.stage);

        if (event.score !== undefined) {
          setEvalScore(event.score);
        }
        if (event.warning) {
          setWarning(true);
        }
        if (event.error) {
          setError(event.error);
        }
        if (event.stage === "deployed") {
          setCompleted(true);
        }
      },
      (err) => {
        setError(err.message);
      },
    );

    return () => controller.abort();
  }, [jobId]);

  const stages = ["ingesting", "chunking", "embedding", "prompt_gen", "evaluating", "deployed"];

  const orderedSteps = stages.map((stage) => ({
    label: STAGE_LABELS[stage] || stage,
    status: (() => {
      const idx = stages.indexOf(stage);
      const currentIdx = stages.indexOf(currentStage);
      if (completed || idx < currentIdx) return "complete" as const;
      if (idx === currentIdx) return "active" as const;
      return "pending" as const;
    })(),
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-section">
      <div className="mb-8">
        <Badge variant={warning ? "cream" : "primary"} className="mb-3">
          {completed ? "Complete" : "Processing"}
        </Badge>
        <h1 className="text-h1-display font-display text-ink mb-2">
          Pipeline Progress
        </h1>
        <p className="text-body-sm text-steel font-mono">Job ID: {jobId}</p>
      </div>

      <Card variant="feature" className="mb-6">
        <PipelineProgress steps={orderedSteps} />
      </Card>

      {error && (
        <Card variant="base" className="border-error mb-6">
          <p className="text-body-sm text-error">{error}</p>
        </Card>
      )}

      {warning && !error && (
        <Card variant="base" className="border-warning mb-6">
          <p className="text-body-sm text-warning">
            Pipeline deployed with warnings — eval score was below threshold.
          </p>
        </Card>
      )}

      {evalScore !== undefined && (
        <Card variant="cream" className="mb-6">
          <ScoreBar label="Eval Score" score={Math.round(evalScore * 100)} />
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-body-sm text-steel">
          Status: {completed ? "Completed" : STAGE_LABELS[currentStage] || currentStage}
        </p>
        {completed && (
          <button
            onClick={() => router.push("/dashboard")}
            className="text-body-sm-medium text-primary hover:text-primary-deep text-left"
          >
            View dashboard →
          </button>
        )}
      </div>
    </div>
  );
}

export default PipelineProgressPage;
