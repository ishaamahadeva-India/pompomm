"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { refreshAuth } from "@/lib/utils";

const REFRESH_BEFORE_MS = 60 * 1000; // refresh when within 1 min of expiry
const CHECK_INTERVAL_MS = 30 * 1000; // check every 30 s

/** When user is logged in, refresh access token shortly before it expires. */
export function AuthRefreshProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token || !expiresAt) return;
    const check = () => {
      const now = Date.now();
      if (expiresAt - now <= REFRESH_BEFORE_MS) {
        refreshAuth();
      }
    };
    check();
    ref.current = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [token, expiresAt]);

  return <>{children}</>;
}
