import { twMerge } from "tailwind-merge";
import { PipelineStep, type PipelineStepStatus } from "./PipelineStep";

interface PipelineStepData {
  label: string;
  status: PipelineStepStatus;
}

interface PipelineProgressProps {
  steps: PipelineStepData[];
  currentStep?: number;
  className?: string;
}

function PipelineProgress({ steps, className }: PipelineProgressProps) {
  return (
    <div className={twMerge("flex flex-col gap-3", className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div
              className={twMerge(
                "w-3 h-3 rounded-full border-2 transition-all duration-150",
                step.status === "active" && "border-primary bg-primary",
                step.status === "complete" && "border-twilight-500 bg-twilight-500",
                step.status === "pending" && "border-hairline-strong bg-canvas",
              )}
            />
            {index < steps.length - 1 && (
              <div
                className={twMerge(
                  "w-0.5 h-8 transition-all duration-150",
                  step.status === "complete" ? "bg-twilight-500" : "bg-hairline",
                )}
              />
            )}
          </div>
          <PipelineStep status={step.status} label={step.label} stepNumber={index + 1} />
        </div>
      ))}
    </div>
  );
}

export { PipelineProgress };
export type { PipelineProgressProps };
