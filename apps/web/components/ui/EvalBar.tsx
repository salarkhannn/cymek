import { twMerge } from "tailwind-merge";
import { ScoreBar } from "./ScoreBar";

interface EvalMetric {
  label: string;
  score: number;
  maxScore?: number;
}

interface EvalBarProps {
  metrics: EvalMetric[];
  className?: string;
}

function EvalBar({ metrics, className }: EvalBarProps) {
  const averageScore = Math.round(
    metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length,
  );

  return (
    <div className={twMerge("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between">
        <span className="text-h5 text-ink">Evaluation</span>
        <span className="text-h5 text-primary">{averageScore}%</span>
      </div>
      <div className="flex flex-col gap-4">
        {metrics.map((metric, index) => (
          <ScoreBar
            key={index}
            label={metric.label}
            score={metric.score}
            maxScore={metric.maxScore}
          />
        ))}
      </div>
    </div>
  );
}

export { EvalBar };
export type { EvalBarProps };
