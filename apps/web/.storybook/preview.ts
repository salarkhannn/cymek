import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "canvas",
      values: [
        { name: "canvas", value: "#ffffff" },
        { name: "surface", value: "#fafafa" },
        { name: "cream", value: "#fff8e0" },
        { name: "dark", value: "#1c1c1e" },
      ],
    },
  },
};

export default preview;
