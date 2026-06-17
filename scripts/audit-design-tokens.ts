import { readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

const ROOT = new URL("..", import.meta.url).pathname

const DESIGN_TOKENS = {
  colors: [
    "#6B4FF5", "#5538D6", "#8B7BF7",
    "#F8F6F0", "#EDE9E0",
    "#1A1525", "#6B6580",
    "#D4CFC8",
    "#22C55E", "#F59E0B", "#EF4444",
  ],
  radii: ["4px", "8px", "12px", "16px"],
  families: ["PP Editorial Old", "Inter", "JetBrains Mono"],
}

const SKIP_DIRS = new Set(["node_modules", "dist", ".next", "__tests__"])

const VIOLATIONS: string[] = []
const CHECKED_FILES: string[] = []

function isSourceFile(file: string): boolean {
  return (
    (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".css")) &&
    !file.includes("node_modules") &&
    !file.includes("dist") &&
    !file.includes(".next") &&
    !file.includes("__tests__")
  )
}

function checkHardcodedColors(content: string, filePath: string): void {
  const hexColor = /#[0-9A-Fa-f]{3,8}/g
  let match: RegExpExecArray | null
  while ((match = hexColor.exec(content)) !== null) {
    if (!DESIGN_TOKENS.colors.includes(match[0].toUpperCase()) &&
        !DESIGN_TOKENS.colors.includes(match[0].toLowerCase())) {
      VIOLATIONS.push(`${filePath}:${lineNumber(content, match.index)} — hardcoded color ${match[0]} not in design tokens`)
    }
  }
}

function checkTwilightStripe(content: string, filePath: string): void {
  if (filePath.includes("layout.tsx") || filePath.includes("globals.css")) {
    if (!content.includes("6B4FF5") && !content.includes("purple") && !content.includes("indigo")) {
      VIOLATIONS.push(`${filePath} — twilight stripe missing (no purple-blue color/gradient found)`)
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
