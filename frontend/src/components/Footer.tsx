"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-background/50">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <Link href="/" className="font-semibold text-foreground">
              Pom Pomm
            </Link>
            <p className="text-sm text-muted mt-1">
              Creator performance platform
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/about" className="text-muted hover:text-foreground transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="text-muted hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link href="/terms" className="text-muted hover:text-foreground transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/privacy" className="text-muted hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/refund" className="text-muted hover:text-foreground transition-colors">
              Refund Policy
            </Link>
          </nav>
        </div>
        <p className="text-xs text-muted mt-6 pt-6 border-t border-white/5">
          © {new Date().getFullYear()} Pom Pomm. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
