import { twMerge } from "tailwind-merge";

type PipelineStepStatus = "active" | "pending" | "complete";

interface PipelineStepProps {
  status: PipelineStepStatus;
  label: string;
  stepNumber?: number;
  className?: string;
}

const statusStyles: Record<PipelineStepStatus, string> = {
  active: "bg-primary text-on-primary border-primary",
  pending: "bg-surface text-steel border-hairline",
  complete: "bg-twilight-300 text-ink border-twilight-300",
};

const dotColors: Record<PipelineStepStatus, string> = {
  active: "bg-on-primary",
  pending: "bg-steel",
  complete: "bg-ink",
};

function PipelineStep({ status, label, stepNumber, className }: PipelineStepProps) {
  return (
    <div className={twMerge("flex items-center gap-3", className)}>
      <div
        className={twMerge(
          "flex items-center gap-2 rounded-full border px-4 py-2 text-body-sm-medium transition-all duration-150",
          statusStyles[status],
        )}
      >
        {stepNumber !== undefined && (
          <span className={twMerge("flex items-center justify-center w-5 h-5 rounded-full text-micro", dotColors[status])}>
            {status === "complete" ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              stepNumber
            )}
          </span>
        )}
        <span>{label}</span>
      </div>
    </div>
  );
}

export { PipelineStep };
export type { PipelineStepProps, PipelineStepStatus };
