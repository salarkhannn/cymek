import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

const ROOT = new URL("..", import.meta.url).pathname

const DESIGN_TOKENS = {
  colors: [
    "#7c5cfc", "#5c3dd9", "#ffffff",
    "#c4b5fd", "#a78bfa", "#6366f1", "#4f46e5",
    "#4f8cf7",
    "#fff8e0", "#fffaeb", "#fff0c2", "#e6d5a8",
    "#1f1f1f", "#3d3d3d", "#2c2c2c",
    "#4a4a4a", "#6a6a6a", "#8a8a8a", "#a8a8a8",
    "#e5e5e5", "#ededed", "#c7c7c7",
    "#fafafa", "#1c1c1e",
    "#22C55E", "#F59E0B", "#EF4444",
  ],
  radii: ["4px", "8px", "12px", "16px"],
  families: ["PP Editorial Old", "Inter", "JetBrains Mono"],
}

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", "__tests__", ".storybook"])

const VIOLATIONS: string[] = []
const CHECKED_FILES: string[] = []

function isSourceFile(file: string): boolean {
  return (
    (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".css")) &&
    !file.includes("node_modules") &&
    !file.includes("dist") &&
    !file.includes(".next") &&
    !file.includes("__tests__") &&
    !file.includes(".storybook")
  )
}

function checkHardcodedColors(content: string, filePath: string): void {
  const hexColor = /#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?/g
  const ALLOWLIST = new Set([
    ...DESIGN_TOKENS.colors.map((c) => c.toLowerCase()),
    "#000000", "#000", "#ffffff", "#fff",
    // Tailwind v3 generated values
    "#e5e7eb", "#d1d5db", "#9ca3af", "#6b7280",
    "#374151", "#1f2937", "#111827",
    "#f3f4f6", "#e5e7eb",
    // Group/chip colors
    "#4ade80", "#fbbf24",
  ])
  let match: RegExpExecArray | null
  while ((match = hexColor.exec(content)) !== null) {
    const val = match[0].toLowerCase()
    if (!ALLOWLIST.has(val)) {
      VIOLATIONS.push(`${filePath}:${lineNumber(content, match.index)} — hardcoded color ${match[0]} not in design tokens`)
    }
  }
}

function checkTwilightStripe(content: string, filePath: string): void {
  if (filePath.includes("layout.tsx")) {
    const hasGradient = content.includes("twilight") ||
      content.includes("from-primary") ||
      content.includes("to-cream") ||
      content.includes("TwilightStripe")
    if (!hasGradient) {
      VIOLATIONS.push(`${filePath} — twilight stripe not found in layout`)
    }
  }
}

function lineNumber(content: string, index: number): number {
  return content.substring(0, index).split("\n").length
}

function walkDir(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (!entry.startsWith(".") && !SKIP_DIRS.has(entry)) {
        walkDir(full)
      }
    } else if (isSourceFile(full)) {
      CHECKED_FILES.push(full)
      const content = readFileSync(full, "utf-8")
      checkHardcodedColors(content, relative(ROOT, full))
      checkTwilightStripe(content, relative(ROOT, full))
    }
  }
}

walkDir(join(ROOT, "apps"))
walkDir(join(ROOT, "packages"))

console.log(`\nChecked ${CHECKED_FILES.length} source files`)
console.log(`Found ${VIOLATIONS.length} design token violations\n`)

if (VIOLATIONS.length > 0) {
  for (const v of VIOLATIONS) {
    console.log(`  ❌ ${v}`)
  }
  process.exit(1)
} else {
  console.log("  ✅ All source files use valid design tokens")
}
