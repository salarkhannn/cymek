import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type CardVariant =
  | "base"
  | "feature"
  | "cream"
  | "cream-soft"
  | "feature-product"
  | "photographic";

interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<CardVariant, string> = {
  base: "bg-canvas border border-hairline-soft rounded-lg p-xl",
  feature: "bg-canvas border border-hairline-soft rounded-lg p-xxl",
  cream: "bg-cream text-ink border border-beige-deep rounded-lg p-xxl",
  "cream-soft": "bg-surface-cream-soft text-ink rounded-lg p-xxl",
  "feature-product":
    "bg-canvas border border-hairline-soft rounded-lg p-xxl shadow-md",
  photographic: "bg-surface-code text-on-dark rounded-lg p-0",
};

function Card({ variant = "base", children, className }: CardProps) {
  return (
    <div className={twMerge(variantStyles[variant], className)}>
      {children}
    </div>
  );
}

export { Card };
export type { CardProps, CardVariant };
