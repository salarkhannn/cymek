import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["base", "feature", "cream", "cream-soft", "feature-product", "photographic"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Base: Story = {
  args: {
    variant: "base",
    children: <p>This is a base card with a border and white background.</p>,
  },
};

export const Feature: Story = {
  args: {
    variant: "feature",
    children: (
      <div>
        <h3 className="text-h4 text-ink mb-2">Feature Title</h3>
        <p className="text-body-md text-steel">Feature description with more padding for emphasis.</p>
      </div>
    ),
  },
};

export const Cream: Story = {
  args: {
    variant: "cream",
    children: (
      <div>
        <h3 className="text-h4 text-ink mb-2">Cream Card</h3>
        <p className="text-body-md text-steel">Warm cream surface with beige border.</p>
      </div>
    ),
  },
};

export const Photographic: Story = {
  args: {
    variant: "photographic",
    children: (
      <div className="p-6">
        <p className="text-on-dark">Dark surface for code mockups and photographic content.</p>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Card variant="base"><p>Base</p></Card>
      <Card variant="feature"><p>Feature</p></Card>
      <Card variant="cream"><p>Cream</p></Card>
      <Card variant="cream-soft"><p>Cream Soft</p></Card>
      <Card variant="feature-product"><p>Feature Product</p></Card>
    </div>
  ),
};
