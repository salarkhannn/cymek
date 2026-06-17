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
  rgbColors: [
    { rgb: "196,181,253", name: "twilight.300 (#c4b5fd)" },
    { rgb: "167,139,250", name: "twilight.500 (#a78bfa)" },
    { rgb: "124,92,252", name: "twilight.700 (#7c5cfc)" },
    { rgb: "99,102,241", name: "twilight.800 (#6366f1)" },
    { rgb: "79,70,229", name: "twilight.900 (#4f46e5)" },
    { rgb: "79,140,247", name: "blue-saturated (#4f8cf7)" },
  ],
  radii: ["4px", "8px", "12px", "16px"],
  families: ["PP Editorial Old", "Inter", "JetBrains Mono"],
}

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", "__tests__", ".storybook"])
const SKIP_PACKAGES = new Set(["embed"]) // standalone bundles with own styles

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

  // Check for rgba()/rgb() values that aren't theme() calls
  const rgbMatch = /rgba?\((\d{1,3},\d{1,3},\d{1,3}(?:,\d+(?:\.\d+)?)?)\)/g
  while ((match = rgbMatch.exec(content)) !== null) {
    const rgbVal = match[1].split(",").slice(0, 3).join(",")
    const isInTokens = DESIGN_TOKENS.rgbColors.some((t) => t.rgb === rgbVal)
    if (!isInTokens) {
      VIOLATIONS.push(`${filePath}:${lineNumber(content, match.index)} — hardcoded rgb(${match[1]}) not in design tokens (or use theme() function)`)
    }
  }
}

function checkTwilightStripe(content: string, filePath: string): void {
  if (filePath.endsWith("layout.tsx")) {
    const hasFooter = content.includes("Footer") &&
      content.includes("components/layout/Footer")
    if (!hasFooter) {
      VIOLATIONS.push(`${filePath} — twilight stripe not found (layout should include Footer)`)
    }
  }
}

function checkFontDisplay(content: string, filePath: string): void {
  if (filePath.includes("/app/") && filePath.endsWith("page.tsx") && !filePath.endsWith("layout.tsx")) {
    if (content.includes("font-display") || content.includes("text-hero-display") || content.includes("text-h1-display")) {
      return // has display font
    }
  }
  if (filePath.endsWith("layout.tsx")) {
    const hasDisplayFont = content.includes("Playfair") || content.includes("--font-display")
    if (!hasDisplayFont) {
      VIOLATIONS.push(`${filePath} — layout should load and set --font-display`)
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
      if (!entry.startsWith(".") && !SKIP_DIRS.has(entry) && !SKIP_PACKAGES.has(entry)) {
        walkDir(full)
      }
    } else if (isSourceFile(full)) {
      CHECKED_FILES.push(full)
      const content = readFileSync(full, "utf-8")
      checkHardcodedColors(content, relative(ROOT, full))
      checkTwilightStripe(content, relative(ROOT, full))
      checkFontDisplay(content, relative(ROOT, full))
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
