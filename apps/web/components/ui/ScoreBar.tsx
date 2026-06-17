import { twMerge } from "tailwind-merge";

interface ScoreBarProps {
  score: number;
  label?: string;
  maxScore?: number;
  className?: string;
}

function ScoreBar({ score, label, maxScore = 100, className }: ScoreBarProps) {
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  const scoreColor =
    percentage >= 80 ? "text-primary" : percentage >= 50 ? "text-twilight-800" : "text-twilight-900";

  return (
    <div className={twMerge("flex flex-col gap-2", className)}>
      {label && <span className="text-body-sm text-steel">{label}</span>}
      <div className="flex items-center gap-3">
        <span className={twMerge("text-stat-display font-display", scoreColor)}>
          {score}
        </span>
        {maxScore && <span className="text-body-md text-muted">/ {maxScore}</span>}
      </div>
      <div className="w-full h-2 bg-cream rounded-full overflow-hidden">
        <div
          className={twMerge(
            "h-full rounded-full transition-all duration-300 ease-out",
            percentage >= 80 ? "bg-primary" : percentage >= 50 ? "bg-twilight-800" : "bg-twilight-900",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export { ScoreBar };
export type { ScoreBarProps };
