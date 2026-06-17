import type { Meta, StoryObj } from "@storybook/react";
import { TwilightStripe } from "./TwilightStripe";

const meta: Meta<typeof TwilightStripe> = {
  title: "Layout/TwilightStripe",
  component: TwilightStripe,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TwilightStripe>;

export const Default: Story = {
  render: () => (
    <div>
      <div className="h-32 bg-surface flex items-center justify-center">
        <p className="text-body-md text-muted">Page content above the stripe</p>
      </div>
      <TwilightStripe />
    </div>
  ),
};
