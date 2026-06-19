"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Plus, ArrowRight, Paperclip } from "@phosphor-icons/react";

type ExtractionResult = {
  useCase: string | null;
  targetUser: string | null;
  missingInfo: string[];
};

type AttachedFile = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
};

export default function HomePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingStored, setProcessingStored] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProcessPrompt = useCallback(async (text: string) => {
    setSubmitting(true);
    setProcessingStored(true);

    try {
      const res = await fetch("/api/extract-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      localStorage.removeItem("cymek_prompt");

      let extracted: ExtractionResult | null = null;
      if (res.ok) {
        extracted = await res.json();
        localStorage.setItem("cymek_extracted", JSON.stringify(extracted));
      }

      if (extracted && extracted.missingInfo && extracted.missingInfo.length === 0) {
        router.push("/onboard?auto=true");
      } else {
        router.push("/onboard");
      }
    } catch {
      localStorage.removeItem("cymek_prompt");
      router.push("/onboard");
    } finally {
      setSubmitting(false);
      setProcessingStored(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoaded || processingStored) return;

    const storedPrompt = localStorage.getItem("cymek_prompt");
    if (storedPrompt && isSignedIn) {
      setPrompt(storedPrompt);
      handleProcessPrompt(storedPrompt);
    }
  }, [isLoaded, isSignedIn, handleProcessPrompt, processingStored]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const allowedExtensions = [".pdf", ".md", ".docx", ".txt"];
    const validFiles = files.filter((file) => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      return allowedExtensions.includes(ext);
    });

    const newItems = validFiles.map((file) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      file,
      status: "pending" as const,
    }));

    setAttachedFiles((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    if ((!prompt.trim() && attachedFiles.length === 0) || submitting) return;

    setSubmitting(true);
    try {
      let filePaths: string[] = [];
      const filesToUpload = attachedFiles.filter((f) => f.status === "pending");

      if (filesToUpload.length > 0) {
        setAttachedFiles((prev) =>
          prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" as const } : f)),
        );

        const { uploadFiles } = await import("../lib/api");
        const paths = await uploadFiles(filesToUpload.map((f) => f.file));
        filePaths = paths;

        setAttachedFiles((prev) =>
          prev.map((f) => (f.status === "uploading" ? { ...f, status: "done" as const } : f)),
        );
      }

      localStorage.setItem("cymek_prompt", prompt);

      const fileData = attachedFiles.map((f, i) => ({
        filename: f.file.name,
        size: f.file.size,
        path: filePaths[i] || "",
      }));
      localStorage.setItem("cymek_files", JSON.stringify(fileData));

      if (!isSignedIn) {
        await router.push("/sign-in");
        return;
      }

      await handleProcessPrompt(prompt);
    } catch (err) {
      console.error("Submission failed:", err);
      setAttachedFiles((prev) =>
        prev.map((f) => (f.status === "uploading" ? { ...f, status: "error" as const } : f)),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral selection:bg-tertiary selection:text-primary">
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="mb-12 space-y-6">
            <h1 className="text-[48px] font-bold leading-[1.05] tracking-[-0.02em] text-primary">
              Your AI Pipeline, <br />
              One Prompt Away
            </h1>
            <p className="font-mono text-[16px] leading-[24px] text-secondary mx-auto max-w-2xl">
              Describe what you want to build. Cymek extracts your use case, sets up the pipeline, and
              deploys a production-ready AI endpoint — no engineering needed.
            </p>
          </div>

          <div className="mx-auto w-full max-w-3xl">
            <div className="relative flex flex-col rounded-md border border-border bg-canvas p-4 focus-within:border-primary transition-all">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachedFiles.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1.5 rounded-full bg-tertiary border border-border px-3 py-1 text-[13px] text-primary"
                    >
                      <Paperclip size={14} className="shrink-0" />
                      <span className="truncate max-w-[150px]">{item.file.name}</span>
                      {item.status === "uploading" && (
                        <span className="text-[10px] text-secondary font-mono">(uploading...)</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachedFile(item.id)}
                        className="text-secondary hover:text-primary transition-colors ml-1 cursor-pointer font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Describe your AI use case..."
                className="w-full resize-none bg-transparent text-[16px] leading-[24px] text-primary outline-none placeholder:text-secondary min-h-[80px]"
              />

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="relative" ref={plusMenuRef}>
                  <button
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-canvas text-primary hover:bg-tertiary hover:border-primary transition-all cursor-pointer"
                    type="button"
                    title="Add attachment"
                  >
                    <Plus size={16} />
                  </button>

                  {showPlusMenu && (
                    <div className="absolute bottom-10 left-0 z-50 w-[160px] rounded-lg border border-border bg-canvas py-1 shadow-sm">
                      <button
                        onClick={() => {
                          setShowPlusMenu(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] text-primary hover:bg-tertiary transition-colors cursor-pointer"
                        type="button"
                      >
                        <Paperclip size={16} />
                        <span>Attach files</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={(!prompt.trim() && attachedFiles.length === 0) || submitting}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-canvas text-primary hover:border-primary disabled:opacity-40 disabled:hover:border-border transition-all cursor-pointer"
                  type="button"
                  title="Send prompt"
                >
                  {submitting ? (
                    <span className="text-[10px] font-mono">...</span>
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
