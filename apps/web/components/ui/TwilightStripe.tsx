import { twMerge } from "tailwind-merge";

interface TwilightStripeProps {
  className?: string;
}

function TwilightStripe({ className }: TwilightStripeProps) {
  return (
    <div
      className={twMerge(
        "w-full h-2 bg-gradient-to-r from-primary via-twilight-800 via-blue-saturated via-twilight-300 to-cream",
        className,
      )}
    />
  );
}

export { TwilightStripe };
export type { TwilightStripeProps };
