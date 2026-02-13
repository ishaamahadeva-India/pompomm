import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  id: string;
  mobile_number: string;
  role: string;
  creator_tier?: string;
};

type AuthState = {
  user: User | null;
  /** Access token (JWT). Same as legacy token for backward compatibility. */
  token: string | null;
  refreshToken: string | null;
  /** When the access token expires (ms). */
  expiresAt: number | null;
  setAuth: (user: User, accessToken: string, refreshToken?: string, expiresInSeconds?: number) => void;
  setTokens: (accessToken: string, refreshToken: string, expiresInSeconds: number) => void;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      expiresAt: null,
      setAuth: (user, accessToken, refreshToken, expiresInSeconds) => {
        const expiresAt =
          typeof expiresInSeconds === "number"
            ? Date.now() + expiresInSeconds * 1000
            : null;
        set({
          user,
          token: accessToken,
          refreshToken: refreshToken ?? null,
          expiresAt,
        });
      },
      setTokens: (accessToken, refreshToken, expiresInSeconds) => {
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        set({ token: accessToken, refreshToken, expiresAt });
      },
      setUser: (user) => set({ user }),
      logout: async () => {
        const { refreshToken } = get();
        try {
          await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refreshToken ?? undefined }),
            credentials: "include",
          });
        } catch {
          // ignore network errors; clear local state anyway
        }
        set({ user: null, token: null, refreshToken: null, expiresAt: null });
      },
    }),
    { name: "poolmarket-auth" }
  )
);
