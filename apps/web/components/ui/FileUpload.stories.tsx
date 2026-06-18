import { useState, useCallback } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FileUpload, type UploadFileItem } from "./FileUpload";

const meta: Meta<typeof FileUpload> = {
  title: "UI/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FileUpload>;

function makeFile(name: string, sizeKB: number, type: string): File {
  const blob = new Blob([new ArrayBuffer(sizeKB * 1024)], { type });
  return new File([blob], name, { type });
}

function InteractiveFileUpload(props: Partial<React.ComponentProps<typeof FileUpload>>) {
  const [files, setFiles] = useState<UploadFileItem[]>([]);

  const handleAdd = useCallback((incoming: File[]) => {
    let id = files.length;
    const items: UploadFileItem[] = incoming.map((f) => ({
      id: `file-${++id}`,
      file: f,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...items]);
  }, [files.length]);

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <FileUpload
      files={files}
      onAdd={handleAdd}
      onRemove={handleRemove}
      {...props}
    />
  );
}

export const Empty: Story = {
  render: () => <InteractiveFileUpload />,
};

export const WithFiles: Story = {
  render: () => {
    const [files, setFiles] = useState<UploadFileItem[]>([
      { id: "1", file: makeFile("documentation.pdf", 240, "application/pdf"), status: "pending" },
      { id: "2", file: makeFile("readme.md", 12, "text/markdown"), status: "pending" },
      { id: "3", file: makeFile("data.csv", 540, "text/csv"), status: "pending" },
    ]);

    return (
      <FileUpload
        files={files}
        onAdd={(incoming) => {
          let id = files.length;
          const items: UploadFileItem[] = incoming.map((f) => ({
            id: `file-${++id}`,
            file: f,
            status: "pending" as const,
          }));
          setFiles((prev) => [...prev, ...items]);
        }}
        onRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
      />
    );
  },
};

export const Uploading: Story = {
  render: () => {
    const [files] = useState<UploadFileItem[]>([
      { id: "1", file: makeFile("guide.pdf", 120, "application/pdf"), status: "uploading" },
      { id: "2", file: makeFile("changelog.md", 8, "text/markdown"), status: "done" },
    ]);

    return (
      <FileUpload
        files={files}
        onAdd={() => {}}
        onRemove={() => {}}
      />
    );
  },
};

export const WithError: Story = {
  render: () => {
    const [files] = useState<UploadFileItem[]>([
      { id: "1", file: makeFile("broken.pdf", 999, "application/pdf"), status: "error", error: "Upload failed" },
      { id: "2", file: makeFile("good.pdf", 45, "application/pdf"), status: "done" },
    ]);

    return (
      <FileUpload
        files={files}
        onAdd={() => {}}
        onRemove={() => {}}
        error="Some files could not be uploaded"
      />
    );
  },
};

export const Disabled: Story = {
  render: () => {
    const [files] = useState<UploadFileItem[]>([
      { id: "1", file: makeFile("locked.pdf", 200, "application/pdf"), status: "done" },
    ]);

    return (
      <FileUpload
        files={files}
        onAdd={() => {}}
        onRemove={() => {}}
        disabled
      />
    );
  },
};
