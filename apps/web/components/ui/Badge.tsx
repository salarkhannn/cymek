import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type BadgeVariant = "primary" | "cream" | "dark";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary text-on-primary",
  cream: "bg-cream-deeper text-ink",
  dark: "bg-ink text-on-dark",
};

function Badge({ variant = "primary", children, className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full px-[10px] py-[4px] text-caption-bold",
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
