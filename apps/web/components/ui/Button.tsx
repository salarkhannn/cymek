import { type ButtonHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "primary" | "cream" | "dark" | "secondary" | "on-cream" | "link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-deep active:bg-primary-deep disabled:bg-hairline disabled:text-muted",
  cream:
    "bg-cream text-ink border border-beige-deep hover:bg-cream-deeper disabled:opacity-40",
  dark:
    "bg-ink text-on-dark hover:bg-ink-tint disabled:opacity-40",
  secondary:
    "bg-transparent text-ink border border-hairline-strong hover:bg-surface disabled:opacity-40",
  "on-cream":
    "bg-canvas text-ink border border-beige-deep hover:bg-cream-light disabled:opacity-40",
  link:
    "bg-transparent text-primary hover:text-primary-deep p-0 h-auto",
};

const sizeStyles: Record<ButtonVariant, string> = {
  primary: "h-10 px-5",
  cream: "h-10 px-5",
  dark: "h-10 px-5",
  secondary: "h-10 px-5",
  "on-cream": "h-10 px-5",
  link: "",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, disabled, children, ...props }, ref) => {
    const isLink = variant === "link";
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={twMerge(
          "inline-flex items-center justify-center gap-2 text-button-md transition-all duration-150 ease-out focus:outline-none focus:shadow-focus-ring",
          isLink ? variantStyles[variant] : `rounded-md ${variantStyles[variant]} ${sizeStyles[variant]}`,
          disabled && "cursor-not-allowed opacity-40",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant };
