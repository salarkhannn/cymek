import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "./CodeBlock";

const meta: Meta<typeof CodeBlock> = {
  title: "UI/CodeBlock",
  component: CodeBlock,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

const sampleCode = `import { Cymek } from "@cymek/embed";

const cymek = new Cymek({
  tenantId: "your-tenant-id",
  apiKey: "sk-...",
});

cymk.init();`;

export const Default: Story = {
  args: {
    code: sampleCode,
  },
};

export const WithHeader: Story = {
  args: {
    header: "embed.ts",
    code: sampleCode,
  },
};

export const JavaScript: Story = {
  args: {
    header: "index.html",
    code: `<script src="https://cdn.cymek.ai/embed.js"></script>
<script>
  Cymek.init({
    tenantId: "your-tenant-id",
    apiKey: "sk-...",
  });
</script>`,
  },
};
