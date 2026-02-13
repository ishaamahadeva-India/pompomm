"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setAllowed(false);
      return;
    }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((user: { role?: string }) => setAllowed(user?.role === "admin"))
      .catch(() => setAllowed(false));
  }, [token]);

  useEffect(() => {
    if (allowed === false) router.replace("/");
  }, [allowed, router]);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }
  if (!allowed) return null;

  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/campaigns", label: "Campaigns" },
    { href: "/admin/distribution", label: "Distribution" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/fraud", label: "Fraud" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-6xl">
          <Link href="/admin" className="font-semibold tracking-tight">Admin</Link>
          <nav className="flex items-center gap-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm px-3 py-2 rounded-lg transition-colors ${pathname === href ? "text-primary font-medium bg-primary/10" : "text-muted hover:text-foreground hover:bg-white/5"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="text-sm px-3 py-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5">← App</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
