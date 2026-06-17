import type { Meta, StoryObj } from "@storybook/react";
import { HeroBand } from "./HeroBand";

const meta: Meta<typeof HeroBand> = {
  title: "Layout/HeroBand",
  component: HeroBand,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof HeroBand>;

export const Default: Story = {
  args: {
    children: (
      <div className="text-center">
        <h1 className="text-hero-display font-display text-on-primary mb-4">
          Your docs, your data, your edge.
        </h1>
        <p className="text-subtitle text-on-dark-muted max-w-xl mx-auto">
          Build custom RAG pipelines on your docs. Deploy in minutes.
        </p>
      </div>
    ),
  },
};
