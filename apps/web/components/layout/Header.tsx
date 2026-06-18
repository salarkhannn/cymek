"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "../ui/Button";

function Header() {
  return (
    <header className="w-full bg-neutral">
      <div className="mx-auto flex h-[80px] max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[23px] font-bold text-primary">Cymek</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-[14px] font-medium text-primary hover:text-secondary transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="secondary" className="h-[48px] w-[166px] px-0 rounded-md border border-border text-[16px] font-medium text-primary bg-transparent hover:bg-tertiary">
                Get started
              </Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="text-[14px] font-medium text-primary hover:text-secondary transition-colors"
            >
              Dashboard
            </Link>
            <Link href="/onboard">
              <Button variant="secondary" className="h-[48px] w-[166px] px-0 rounded-md border border-border text-[16px] font-medium text-primary bg-transparent hover:bg-tertiary">
                New Pipeline
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-md",
                },
              }}
            />
          </Show>
        </nav>
      </div>
    </header>
  );
}

export { Header };
