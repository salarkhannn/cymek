import type { Meta, StoryObj } from "@storybook/react";
import { EvalBar } from "./EvalBar";

const meta: Meta<typeof EvalBar> = {
  title: "Pipeline/EvalBar",
  component: EvalBar,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EvalBar>;

export const Default: Story = {
  args: {
    metrics: [
      { label: "Accuracy", score: 94 },
      { label: "Precision", score: 87 },
      { label: "Recall", score: 76 },
      { label: "F1 Score", score: 81 },
    ],
  },
};

export const LowPerformer: Story = {
  args: {
    metrics: [
      { label: "Accuracy", score: 45 },
      { label: "Precision", score: 38 },
      { label: "Recall", score: 52 },
      { label: "F1 Score", score: 42 },
    ],
  },
};
