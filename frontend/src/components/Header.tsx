"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export function Header() {
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMobileOpen(false), [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const navClass = "text-muted-foreground text-sm hover:text-foreground transition";
  const navClassMobile = "block py-3 text-muted-foreground hover:text-foreground transition";

  return (
    <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-background/90 border-b border-border">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        <Link href="/" className="text-xs tracking-[0.35em] text-foreground font-medium">
          POM POMM
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#features" className={navClass} title="How Pom Pomm works — features and value">Product</Link>
          <Link href="/subscription" className={navClass}>Pricing</Link>
          <Link href="/dashboard" className={navClass} title="Your campaigns and activity">Dashboard</Link>
          <Link href="/about" className={navClass}>Brands</Link>
          {user ? (
            <>
              <Link href="/profile" className={navClass}>Profile</Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-4 py-2 rounded-full text-sm border border-border text-foreground hover:bg-muted transition disabled:opacity-50"
              >
                {loggingOut ? "…" : "Log out"}
              </button>
            </>
          ) : (
            <Link href="/login">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition">
                Login
              </button>
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={mobileOpen}
          className="md:hidden p-2 text-white"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md px-6 py-4">
          <Link href="/#features" className={navClassMobile} title="How Pom Pomm works">Product</Link>
          <Link href="/subscription" className={navClassMobile}>Pricing</Link>
          <Link href="/dashboard" className={navClassMobile}>Dashboard</Link>
          <Link href="/about" className={navClassMobile}>Brands</Link>
          {user ? (
            <>
              <Link href="/profile" className={navClassMobile}>Profile</Link>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className={navClassMobile + " w-full text-left"}>
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </>
          ) : (
            <Link href="/login" className={navClassMobile + " font-medium text-primary"}>Login</Link>
          )}
        </div>
      )}
    </header>
  );
}
