import type { Meta, StoryObj } from "@storybook/react";
import { PipelineStep } from "./PipelineStep";

const meta: Meta<typeof PipelineStep> = {
  title: "Pipeline/PipelineStep",
  component: PipelineStep,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["active", "pending", "complete"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof PipelineStep>;

export const Active: Story = {
  args: {
    status: "active",
    label: "Extracting documents",
    stepNumber: 1,
  },
};

export const Pending: Story = {
  args: {
    status: "pending",
    label: "Chunking content",
    stepNumber: 2,
  },
};

export const Complete: Story = {
  args: {
    status: "complete",
    label: "Ingesting vectors",
    stepNumber: 3,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <PipelineStep status="complete" label="Document extraction" stepNumber={1} />
      <PipelineStep status="active" label="Content chunking" stepNumber={2} />
      <PipelineStep status="pending" label="Vector indexing" stepNumber={3} />
      <PipelineStep status="pending" label="Deployment" stepNumber={4} />
    </div>
  ),
};
