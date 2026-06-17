import { type InputHTMLAttributes, forwardRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-body-sm-medium text-ink">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-steel">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              "h-11 w-full rounded-md border border-hairline-strong bg-canvas px-4 text-body-md text-ink placeholder:text-stone transition-all duration-150 ease-out",
              "focus:border-primary focus:outline-none focus:shadow-focus-ring",
              error && "border-error focus:border-error focus:shadow-none",
              icon && "pl-10",
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  },
);

TextInput.displayName = "TextInput";

export { TextInput };
export type { TextInputProps };
