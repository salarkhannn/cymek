import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "cream", "dark", "secondary", "on-cream", "link"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Get Started",
  },
};

export const Cream: Story = {
  args: {
    variant: "cream",
    children: "Learn More",
  },
};

export const Dark: Story = {
  args: {
    variant: "dark",
    children: "Dashboard",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Cancel",
  },
};

export const OnCream: Story = {
  args: {
    variant: "on-cream",
    children: "Submit",
  },
  parameters: { backgrounds: { default: "cream" } },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "View documentation →",
  },
};

export const Disabled: Story = {
  args: {
    variant: "primary",
    children: "Disabled",
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="cream">Cream</Button>
      <Button variant="dark">Dark</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};
