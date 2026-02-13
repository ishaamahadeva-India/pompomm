"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { API_BASE } from "@/lib/utils";
import { getDeviceHash } from "@/lib/deviceHash";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = mobile.replace(/\D/g, "");
    if (normalized.length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const device_hash = await getDeviceHash();
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mobile_number: `+91${normalized.slice(-10)}`,
          otp: "0000",
          ...(device_hash ? { device_hash } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Login failed");
      const accessToken = data.accessToken ?? data.token;
      setAuth(
        data.user,
        accessToken,
        data.refreshToken,
        data.expiresIn ?? 7 * 24 * 60 * 60
      );
      router.push("/");
      router.refresh();
    } catch (e) {
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        setError(`Cannot reach the API at ${API_BASE}. Is the backend running?`);
      } else {
        setError(e instanceof Error ? e.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="glass-card p-8 sm:p-10 w-full max-w-md rounded-2xl border border-white/10">
        <h1 className="text-2xl font-bold mb-2 tracking-tight">Log in</h1>
        <p className="text-muted text-sm mb-8">
          Enter your mobile number. For demo, any 10-digit number works.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-muted mb-2">
              Mobile number
            </label>
            <input
              id="mobile"
              type="tel"
              placeholder="9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-colors"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
