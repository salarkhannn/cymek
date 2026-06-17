import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface HeroBandProps {
  children: ReactNode;
  className?: string;
}

function HeroBand({ children, className }: HeroBandProps) {
  return (
    <section
      className={twMerge(
        "relative overflow-hidden bg-gradient-to-br from-primary via-twilight-800 to-twilight-900 py-hero",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(196,181,253,0.15),transparent_50%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-6">{children}</div>
    </section>
  );
}

export { HeroBand };
export type { HeroBandProps };
