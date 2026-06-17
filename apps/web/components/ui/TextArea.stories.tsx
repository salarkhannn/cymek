import type { Meta, StoryObj } from "@storybook/react";
import { TextArea } from "./TextArea";

const meta: Meta<typeof TextArea> = {
  title: "UI/TextArea",
  component: TextArea,
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    label: { control: "text" },
    error: { control: "text" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  args: {
    placeholder: "Describe your use case...",
    rows: 4,
  },
};

export const WithLabel: Story = {
  args: {
    label: "Description",
    placeholder: "Describe your use case...",
    rows: 4,
  },
};

export const WithError: Story = {
  args: {
    label: "Description",
    placeholder: "Describe your use case...",
    error: "This field is required",
    rows: 4,
  },
};
