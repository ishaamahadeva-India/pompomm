import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function api<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...init } = options ?? {};
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

/** Call auth/refresh and update store. Returns new access token or null. */
export async function refreshAuth(): Promise<string | null> {
  const { useAuthStore } = await import("@/store/useAuthStore");
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    useAuthStore.getState().setTokens(
      data.accessToken,
      data.refreshToken ?? refreshToken,
      data.expiresIn ?? 7 * 24 * 60 * 60
    );
    return data.accessToken;
  } catch {
    return null;
  }
}
