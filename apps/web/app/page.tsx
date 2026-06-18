"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignUpButton } from "@clerk/nextjs";
import { Button } from "../components/ui/Button";

type ExtractionResult = {
  useCase: string | null;
  targetUser: string | null;
  missingInfo: string[];
};

export default function HomePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingStored, setProcessingStored] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleProcessPrompt = useCallback(async (text: string, storedUrls?: string[]) => {
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

      if (storedUrls && storedUrls.length > 0) {
        localStorage.setItem("cymek_urls", JSON.stringify(storedUrls));
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
      const storedUrlsRaw = localStorage.getItem("cymek_urls");
      const storedUrls = storedUrlsRaw ? JSON.parse(storedUrlsRaw) as string[] : undefined;
      setPrompt(storedPrompt);
      handleProcessPrompt(storedPrompt, storedUrls);
    }
  }, [isLoaded, isSignedIn, handleProcessPrompt, processingStored]);

  const handleSubmit = async () => {
    if (!prompt.trim() || submitting) return;

    if (!isSignedIn) {
      localStorage.setItem("cymek_prompt", prompt);
      if (urls.length > 0) {
        localStorage.setItem("cymek_urls", JSON.stringify(urls));
      }
      await router.push("/sign-in");
      return;
    }

    await handleProcessPrompt(prompt);
  };

  const handleAddUrl = () => {
    const input = urlInputRef.current;
    if (input && input.value.trim()) {
      setUrls((prev) => [...prev, input.value.trim()]);
      input.value = "";
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral selection:bg-tertiary selection:text-primary">
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="mb-12 space-y-6">
            <h1 className="text-[48px] font-bold leading-[1.05] tracking-[-0.02em] text-primary">
              Your AI Pipeline, <br/>
              One Prompt Away
            </h1>
            <p className="font-mono text-[16px] leading-[24px] text-secondary mx-auto max-w-2xl">
              Describe what you want to build. Cymek extracts your use case,
              sets up the pipeline, and deploys a production-ready AI endpoint — no engineering needed.
            </p>
          </div>

          <div className="mx-auto w-full max-w-3xl">
            <div className="group relative">
              <div className="relative flex min-h-[88px] items-center gap-4 rounded-md border border-border bg-surface p-4 transition-colors focus-within:border-primary">
                <button
                  onClick={() => setShowAddPanel(!showAddPanel)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm text-[23px] text-primary transition-colors hover:bg-tertiary"
                  title="Add files, etc for the pipeline"
                >
                  +
                </button>
                <div className="flex-1 py-2">
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
                    className="h-12 w-full resize-none bg-transparent text-[16px] leading-[24px] text-primary outline-none placeholder:text-secondary flex items-center pt-3"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || submitting}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-surface text-primary border border-border transition-colors hover:bg-tertiary hover:border-secondary disabled:opacity-40"
                  title="Send prompt"
                >
                  {submitting ? (
                    <span className="font-mono text-[12px] uppercase">Wait</span>
                  ) : (
                    <span className="text-[23px]">&rarr;</span>
                  )}
                </button>
              </div>
            </div>

            {/* Helper text matching wireframe context */}
            <div className="mt-4 flex items-center justify-between px-2 font-mono text-[12px] leading-[16px] tracking-[0.02em] text-secondary">
              <span className="flex items-center gap-2">
                <span className="h-[1px] w-4 bg-tertiary" />
                Add files or URLs for context
              </span>
              <span className="flex items-center gap-2">
                Sign in to save and process
                <span className="h-[1px] w-4 bg-tertiary" />
              </span>
            </div>

            {/* URLs Panel */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAddPanel ? 'mt-6 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="rounded-lg border border-border bg-neutral p-4 text-left">
                <div className="flex flex-col gap-4">
                  <p className="text-[14px] font-medium leading-[20px] text-primary">Add document URLs for your pipeline</p>
                  <div className="flex gap-3">
                    <input
                      ref={urlInputRef}
                      type="url"
                      placeholder="https://docs.example.com/page"
                      className="h-12 flex-1 rounded-md border border-border bg-surface px-3 text-[16px] text-primary outline-none transition-colors focus:border-primary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddUrl();
                      }}
                    />
                    <Button variant="secondary" onClick={handleAddUrl} className="h-12 px-6 rounded-md border-border">
                      Add
                    </Button>
                  </div>
                  {urls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {urls.map((url, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 font-mono text-[12px] text-primary border border-border"
                        >
                          {url}
                          <button
                            onClick={() => setUrls((prev) => prev.filter((_, j) => j !== i))}
                            className="text-secondary transition-colors hover:text-error ml-1"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected URLs Pills (when panel is closed) */}
            {urls.length > 0 && !showAddPanel && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {urls.map((url, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-surface border border-border px-3 py-1 font-mono text-[12px] text-primary"
                  >
                    {url}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
