"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { TextArea } from "../../components/ui/TextArea";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { FileUpload, type UploadFileItem } from "../../components/ui/FileUpload";
import { createPipeline, uploadFiles } from "../../lib/api";

type Step = "api-key" | "use-case" | "target-user" | "documents";

const STEP_ORDER: Step[] = ["api-key", "use-case", "target-user", "documents"];

const STEP_LABELS: Record<Step, string> = {
  "api-key": "API Key",
  "use-case": "Use Case",
  "target-user": "Target User",
  "documents": "Documents",
};

interface FormData {
  apiKey: string;
  useCase: string;
  targetUser: string;
  urls: string[];
}

let fileIdCounter = 0;
function nextFileId(): string {
  fileIdCounter += 1;
  return `file-${fileIdCounter}-${Date.now()}`;
}

function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("api-key");
  const [form, setForm] = useState<FormData>({
    apiKey: "",
    useCase: "",
    targetUser: "",
    urls: [""],
  });
  const [uploadFilesList, setUploadFilesList] = useState<UploadFileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = step === "documents";

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateUrl(index: number, value: string) {
    const urls = [...form.urls];
    urls[index] = value;
    if (value && index === urls.length - 1) {
      urls.push("");
    }
    updateField("urls", urls.filter((u, i) => i === urls.length - 1 || u));
  }

  function removeUrl(index: number) {
    if (form.urls.length <= 1) return;
    updateField("urls", form.urls.filter((_, i) => i !== index));
  }

  function handleAddFiles(files: File[]) {
    const items: UploadFileItem[] = files.map((file) => ({
      id: nextFileId(),
      file,
      status: "pending" as const,
    }));
    setUploadFilesList((prev) => [...prev, ...items]);
  }

  function handleRemoveFile(id: string) {
    setUploadFilesList((prev) => prev.filter((f) => f.id !== id));
  }

  function canProceed(): boolean {
    switch (step) {
      case "api-key":
        return form.apiKey.trim().length > 0;
      case "use-case":
        return form.useCase.trim().length > 0;
      case "target-user":
        return form.targetUser.trim().length > 0;
      case "documents":
        return form.urls.some((u) => u.trim().length > 0) || uploadFilesList.length > 0;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isLastStep) {
      setStep(STEP_ORDER[stepIndex + 1]);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const validUrls = form.urls.filter((u) => u.trim().length > 0);
      const pendingFiles = uploadFilesList.filter((f) => f.status === "pending");

      let filePaths: string[] = [];

      if (pendingFiles.length > 0) {
        setUploadFilesList((prev) =>
          prev.map((f) =>
            f.status === "pending" ? { ...f, status: "uploading" as const } : f,
          ),
        );

        filePaths = await uploadFiles(pendingFiles.map((f) => f.file));

        setUploadFilesList((prev) =>
          prev.map((f) =>
            f.status === "uploading" ? { ...f, status: "done" as const } : f,
          ),
        );
      }

      const { tenantId, jobId } = await createPipeline(
        form.apiKey,
        form.useCase,
        form.targetUser,
        { urls: validUrls, files: filePaths },
      );
      localStorage.setItem("cymek_tenant", tenantId);
      router.push(`/pipeline/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pipeline");
      setUploadFilesList((prev) =>
        prev.map((f) =>
          f.status === "uploading" ? { ...f, status: "error" as const, error: "Upload failed" } : f,
        ),
      );
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (stepIndex > 0) {
      setStep(STEP_ORDER[stepIndex - 1]);
    }
  }

  const submitLabel = (() => {
    if (!isLastStep) return "Continue";
    const pending = uploadFilesList.filter((f) => f.status === "pending").length;
    if (pending > 0 && submitting) return "Uploading files...";
    if (submitting) return "Starting pipeline...";
    return "Start Pipeline";
  })();

  return (
    <div className="mx-auto max-w-2xl px-6 py-section">
      <div className="mb-8 text-center">
        <Badge variant="cream" className="mb-3">Getting Started</Badge>
        <h1 className="text-h1-display font-display text-ink mb-2">
          Set up your pipeline
        </h1>
        <p className="text-body-md text-steel">
          Step {stepIndex + 1} of {STEP_ORDER.length}: {STEP_LABELS[step]}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-8">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-micro transition-colors ${
                i <= stepIndex
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-steel border border-hairline"
              }`}
            >
              {i + 1}
            </div>
            {i < STEP_ORDER.length - 1 && (
              <div
                className={`h-0.5 w-8 transition-colors ${
                  i < stepIndex ? "bg-primary" : "bg-hairline"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card variant="cream">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {step === "api-key" && (
            <div className="flex flex-col gap-2">
              <h2 className="text-h4 text-ink">Enter your OpenAI API Key</h2>
              <p className="text-body-sm text-steel mb-2">
                Your key is encrypted and stored securely on our server.
              </p>
              <TextInput
                label="OpenAI API Key"
                type="password"
                placeholder="sk-..."
                value={form.apiKey}
                onChange={(e) => updateField("apiKey", e.target.value)}
              />
            </div>
          )}

          {step === "use-case" && (
            <div className="flex flex-col gap-2">
              <h2 className="text-h4 text-ink">Describe your use case</h2>
              <p className="text-body-sm text-steel mb-2">
                What kind of documents are you working with? What questions should the AI answer?
              </p>
              <TextArea
                label="Use Case"
                placeholder="e.g., I want to build a Q&A bot for my product documentation..."
                value={form.useCase}
                onChange={(e) => updateField("useCase", e.target.value)}
                rows={4}
              />
            </div>
          )}

          {step === "target-user" && (
            <div className="flex flex-col gap-2">
              <h2 className="text-h4 text-ink">Who is this for?</h2>
              <p className="text-body-sm text-steel mb-2">
                Describe your target users so we can tailor the response style.
              </p>
              <TextInput
                label="Target User"
                placeholder="e.g., Developers integrating our API"
                value={form.targetUser}
                onChange={(e) => updateField("targetUser", e.target.value)}
              />
            </div>
          )}

          {step === "documents" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-h4 text-ink mb-2">Upload your documents</h2>
                <p className="text-body-sm text-steel mb-4">
                  Upload files or add URLs to your documentation or data sources.
                </p>
                <FileUpload
                  files={uploadFilesList}
                  onAdd={handleAddFiles}
                  onRemove={handleRemoveFile}
                  disabled={submitting}
                />
              </div>

              <div className="border-t border-beige-deep pt-4">
                <p className="text-body-sm-medium text-ink mb-3">Or add document URLs</p>
                <div className="flex flex-col gap-3">
                  {form.urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <TextInput
                          placeholder="https://docs.example.com/page"
                          value={url}
                          onChange={(e) => updateUrl(index, e.target.value)}
                        />
                      </div>
                      {form.urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrl(index)}
                          className="text-body-sm text-error hover:text-error/80 mt-6"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-error bg-error/5 p-3">
              <p className="text-body-sm text-error">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="link"
              onClick={handleBack}
              className={stepIndex === 0 ? "invisible" : ""}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canProceed() || submitting}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default OnboardPage;
