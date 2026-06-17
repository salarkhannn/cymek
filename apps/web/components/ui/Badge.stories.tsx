import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "cream", "dark"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "New",
  },
};

export const Cream: Story = {
  args: {
    variant: "cream",
    children: "Beta",
  },
};

export const Dark: Story = {
  args: {
    variant: "dark",
    children: "Enterprise",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-3">
      <Badge variant="primary">Primary</Badge>
      <Badge variant="cream">Cream</Badge>
      <Badge variant="dark">Dark</Badge>
    </div>
  ),
};
