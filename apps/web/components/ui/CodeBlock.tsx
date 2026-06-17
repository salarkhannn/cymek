import { twMerge } from "tailwind-merge";

interface CodeBlockProps {
  header?: string;
  code: string;
  language?: string;
  className?: string;
}

function CodeBlock({ header, code, className }: CodeBlockProps) {
  return (
    <div className={twMerge("rounded-md overflow-hidden", className)}>
      {header && (
        <div className="flex items-center justify-between bg-surface-code px-4 py-2 border-b border-white/10">
          <span className="text-caption text-on-dark-muted">{header}</span>
        </div>
      )}
      <div className="bg-surface-code p-4 overflow-x-auto">
        <pre className="text-code-md text-on-dark font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export { CodeBlock };
export type { CodeBlockProps };
