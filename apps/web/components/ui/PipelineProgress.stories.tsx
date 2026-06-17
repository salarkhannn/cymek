import type { Meta, StoryObj } from "@storybook/react";
import { PipelineProgress } from "./PipelineProgress";

const meta: Meta<typeof PipelineProgress> = {
  title: "Pipeline/PipelineProgress",
  component: PipelineProgress,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PipelineProgress>;

export const InProgress: Story = {
  args: {
    steps: [
      { label: "Document extraction", status: "complete" },
      { label: "Content chunking", status: "active" },
      { label: "Vector indexing", status: "pending" },
      { label: "Deployment", status: "pending" },
    ],
  },
};

export const Complete: Story = {
  args: {
    steps: [
      { label: "Document extraction", status: "complete" },
      { label: "Content chunking", status: "complete" },
      { label: "Vector indexing", status: "complete" },
      { label: "Deployment", status: "complete" },
    ],
  },
};

export const Initial: Story = {
  args: {
    steps: [
      { label: "Document extraction", status: "active" },
      { label: "Content chunking", status: "pending" },
      { label: "Vector indexing", status: "pending" },
      { label: "Deployment", status: "pending" },
    ],
  },
};
