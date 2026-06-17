import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cymek",
  description: "Your docs, your data, your edge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
