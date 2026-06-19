import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type BadgeVariant = "primary" | "cream" | "dark" | "error";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary text-on-primary",
  cream: "bg-cream-deeper text-ink",
  dark: "bg-ink text-on-dark",
  error: "bg-error text-on-primary",
};

function Badge({ variant = "primary", children, className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full px-xs py-xxs text-caption-bold",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
