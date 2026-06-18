"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { twMerge } from "tailwind-merge";

export interface UploadFileItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface FileUploadProps {
  files: UploadFileItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
      <path d="M10 2.5L10 13.5M10 2.5C9.32641 3.5 8 5 8 5M10 2.5C10.6736 3.5 12 5 12 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.33334 12.5V15.8333C3.33334 16.7538 4.07917 17.5 5.00001 17.5H15C15.9208 17.5 16.6667 16.7538 16.6667 15.8333V12.5" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/60">
      <path d="M16 21.3333V4M16 4C14.6667 5.66667 12 8.66667 12 8.66667M16 4C17.3333 5.66667 20 8.66667 20 8.66667" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 21.3333V26.6667C4 27.7712 4.89533 28.6667 6 28.6667H26C27.1047 28.6667 28 27.7712 28 26.6667V21.3333" strokeLinecap="round" />
    </svg>
  );
}

function FileUpload({
  files,
  onAdd,
  onRemove,
  accept = ".pdf,.docx,.txt,.md,.html,.csv",
  maxSizeMB = 10,
  multiple = true,
  disabled = false,
  error,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const valid = arr.filter((f) => {
        if (f.size > maxSizeMB * 1024 * 1024) return false;
        return true;
      });
      if (valid.length > 0) onAdd(valid);
    },
    [onAdd, maxSizeMB],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (disabled) return;
      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.target.value = "";
      }
    },
    [handleFiles],
  );

  return (
    <div className={twMerge("flex flex-col gap-3", className)}>
      <div
        ref={dropRef}
        role="button"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
        className={twMerge(
          "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-all duration-150 ease-out",
          dragging
            ? "border-primary bg-primary/5"
            : "border-hairline-strong bg-canvas hover:border-primary/50 hover:bg-surface",
          disabled && "cursor-not-allowed opacity-40",
        )}
      >
        <UploadIcon />
        <div className="text-center">
          <p className="text-body-md-medium text-ink">
            {dragging ? "Drop files here" : "Drag files here or click to browse"}
          </p>
          <p className="text-caption text-steel mt-1">
            {accept.replace(/\./g, "").toUpperCase()} — up to {maxSizeMB}MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((item) => (
            <li
              key={item.id}
              className={twMerge(
                "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                item.status === "error"
                  ? "border-error/30 bg-error/5"
                  : "border-hairline-soft bg-canvas",
              )}
            >
              <FileIcon />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm text-ink truncate">{item.file.name}</p>
                <p className="text-micro text-steel">{formatSize(item.file.size)}</p>
              </div>
              {item.status === "done" && (
                <span className="text-micro text-success">Uploaded</span>
              )}
              {item.status === "uploading" && (
                <span className="text-micro text-primary">Uploading...</span>
              )}
              {item.status === "error" && (
                <span className="text-micro text-error" title={item.error}>
                  {item.error || "Failed"}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={disabled}
                className="flex h-6 w-6 items-center justify-center rounded text-muted hover:text-error hover:bg-error/5 transition-colors disabled:opacity-30"
                aria-label={`Remove ${item.file.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 3L11 11M11 3L3 11" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}

export { FileUpload };
export type { FileUploadProps };
