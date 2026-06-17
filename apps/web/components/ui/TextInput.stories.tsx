import type { Meta, StoryObj } from "@storybook/react";
import { TextInput } from "./TextInput";

const meta: Meta<typeof TextInput> = {
  title: "UI/TextInput",
  component: TextInput,
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    label: { control: "text" },
    error: { control: "text" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
  args: {
    placeholder: "Enter your API key...",
  },
};

export const WithLabel: Story = {
  args: {
    label: "API Key",
    placeholder: "sk-...",
  },
};

export const WithError: Story = {
  args: {
    label: "Email",
    placeholder: "you@example.com",
    error: "Please enter a valid email address",
  },
};

export const Disabled: Story = {
  args: {
    label: "Read-only field",
    value: "Pre-filled content",
    disabled: true,
  },
};
