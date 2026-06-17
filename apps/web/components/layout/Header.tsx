"use client";

import Link from "next/link";
import { Button } from "../ui/Button";

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-hairline bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-h5 font-display text-primary">Cymek</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-body-sm text-steel hover:text-ink transition-colors">
            Dashboard
          </Link>
          <Link href="/onboard">
            <Button variant="primary" className="h-8 px-4 text-micro">
              New Pipeline
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export { Header };
