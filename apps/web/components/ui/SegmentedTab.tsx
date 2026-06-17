import { type ButtonHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface SegmentedTabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const SegmentedTab = forwardRef<HTMLButtonElement, SegmentedTabProps>(
  ({ active = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          "inline-flex items-center px-4 py-3 text-body-sm-medium transition-all duration-150 ease-out",
          "bg-transparent border-b-2 border-transparent",
          active
            ? "text-primary border-b-2 border-primary"
            : "text-steel hover:text-ink-tint hover:border-hairline-strong",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

SegmentedTab.displayName = "SegmentedTab";

export { SegmentedTab };
export type { SegmentedTabProps };
