import type { Meta, StoryObj } from "@storybook/react";
import { PillTab } from "./PillTab";

const meta: Meta<typeof PillTab> = {
  title: "UI/PillTab",
  component: PillTab,
  tags: ["autodocs"],
  argTypes: {
    active: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof PillTab>;

export const Inactive: Story = {
  args: {
    active: false,
    children: "General",
  },
};

export const Active: Story = {
  args: {
    active: true,
    children: "General",
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex gap-2">
      <PillTab active>Active</PillTab>
      <PillTab>Inactive</PillTab>
      <PillTab>Another</PillTab>
    </div>
  ),
};
