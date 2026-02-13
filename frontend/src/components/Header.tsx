"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "./ui/Button";
import { CreatorTierBadge } from "./CreatorTierBadge";

const navLinkClass = "block text-sm px-4 py-3 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors tap-target w-full text-left";

export function Header() {
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onResize = () => {
      if (window.innerWidth >= 640) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/90 backdrop-blur-xl safe-area-padding">
      <div className="container mx-auto flex h-14 min-h-[44px] items-center justify-between px-4 max-w-6xl">
        <Link href="/" className="font-semibold text-lg tracking-tight shrink-0 py-2">
          Pom Pomm
        </Link>
        <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
          <Link href="/" className="text-sm px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors min-h-[44px] inline-flex items-center">
            Campaigns
          </Link>
          {user ? (
            <>
              <Link href="/distribution" className="text-sm px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors min-h-[44px] inline-flex items-center">
                Verified Performance
              </Link>
              <Link href="/subscription" className="text-sm px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors min-h-[44px] inline-flex items-center">
                Subscription
              </Link>
              <Link href="/profile" className="text-sm px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors flex items-center gap-1.5 min-h-[44px]">
                Profile
                {user.creator_tier && user.creator_tier !== "bronze" && (
                  <CreatorTierBadge tier={user.creator_tier} size="sm" />
                )}
              </Link>
              {(user.role === "admin" || user.role === "brand_admin") && (
                <Link href="/admin" className="text-sm px-3 py-2 rounded-lg text-primary font-medium min-h-[44px] inline-flex items-center">
                  {user.role === "brand_admin" ? "Brand" : "Admin"}
                </Link>
              )}
              <Button variant="ghost" size="sm" className="rounded-lg ml-1 min-h-[44px]" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Logging out…" : "Log out"}
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" className="rounded-xl min-h-[44px]">Log in</Button>
            </Link>
          )}
        </nav>
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
          className="sm:hidden p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          onClick={() => setMobileMenuOpen((o) => !o)}
        >
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-background/95 backdrop-blur-xl px-4 py-3 flex flex-col gap-1">
          <Link href="/" className={navLinkClass}>Campaigns</Link>
          {user ? (
            <>
              <Link href="/distribution" className={navLinkClass}>Verified Performance</Link>
              <Link href="/subscription" className={navLinkClass}>Subscription</Link>
              <Link href="/profile" className={`${navLinkClass} flex items-center gap-1.5`}>
                Profile
                {user.creator_tier && user.creator_tier !== "bronze" && (
                  <CreatorTierBadge tier={user.creator_tier} size="sm" />
                )}
              </Link>
              {(user.role === "admin" || user.role === "brand_admin") && (
                <Link href="/admin" className={navLinkClass}>{user.role === "brand_admin" ? "Brand" : "Admin"}</Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className={navLinkClass}
              >
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </>
          ) : (
            <Link href="/login" className={navLinkClass}>
              <span className="font-medium text-primary">Log in</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
