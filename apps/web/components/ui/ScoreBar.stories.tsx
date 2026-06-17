import type { Meta, StoryObj } from "@storybook/react";
import { ScoreBar } from "./ScoreBar";

const meta: Meta<typeof ScoreBar> = {
  title: "Pipeline/ScoreBar",
  component: ScoreBar,
  tags: ["autodocs"],
  argTypes: {
    score: { control: { type: "range", min: 0, max: 100 } },
  },
};

export default meta;
type Story = StoryObj<typeof ScoreBar>;

export const High: Story = {
  args: {
    label: "Accuracy",
    score: 92,
  },
};

export const Medium: Story = {
  args: {
    label: "Precision",
    score: 65,
  },
};

export const Low: Story = {
  args: {
    label: "Bleu Score",
    score: 32,
  },
};
