import { type ButtonHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface PillTabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const PillTab = forwardRef<HTMLButtonElement, PillTabProps>(
  ({ active = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          "inline-flex items-center rounded-full px-4 py-2 text-body-sm-medium transition-all duration-150 ease-out",
          active
            ? "bg-ink text-on-dark border border-ink"
            : "bg-canvas text-steel border border-hairline hover:border-hairline-strong hover:text-ink-tint",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

PillTab.displayName = "PillTab";

export { PillTab };
export type { PillTabProps };
