"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#0B0B0C] border-t border-white/5 text-stone-400 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">

        <Link href="/" className="text-xs tracking-[0.35em] text-white mb-4 md:mb-0">
          POM POMM
        </Link>

        <div className="flex gap-6 text-sm">
          <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition">Terms</Link>
          <Link href="/contact" className="hover:text-white transition">Contact</Link>
        </div>

        <div className="text-xs mt-4 md:mt-0">
          © 2026 Pom Pomm. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
