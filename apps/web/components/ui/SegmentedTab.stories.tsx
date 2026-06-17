import type { Meta, StoryObj } from "@storybook/react";
import { SegmentedTab } from "./SegmentedTab";

const meta: Meta<typeof SegmentedTab> = {
  title: "UI/SegmentedTab",
  component: SegmentedTab,
  tags: ["autodocs"],
  argTypes: {
    active: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof SegmentedTab>;

export const Inactive: Story = {
  args: {
    active: false,
    children: "Overview",
  },
};

export const Active: Story = {
  args: {
    active: true,
    children: "Overview",
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex border-b border-hairline">
      <SegmentedTab active>Active</SegmentedTab>
      <SegmentedTab>Inactive</SegmentedTab>
      <SegmentedTab>Another</SegmentedTab>
    </div>
  ),
};
