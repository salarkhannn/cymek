import { type TextareaHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-body-sm-medium text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={twMerge(
            "w-full rounded-md border border-hairline-strong bg-canvas p-4 text-body-md text-ink placeholder:text-stone transition-all duration-150 ease-out resize-y min-h-[100px]",
            "focus:border-primary focus:outline-none focus:shadow-focus-ring",
            error && "border-error focus:border-error focus:shadow-none",
            className,
          )}
          {...props}
        />
        {error && <p className="text-caption text-error">{error}</p>}
      </div>
    );
  },
);

TextArea.displayName = "TextArea";

export { TextArea };
export type { TextAreaProps };
