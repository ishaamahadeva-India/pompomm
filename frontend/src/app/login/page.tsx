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
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const normalizedMobile = mobile.replace(/\D/g, "").slice(-10);
  const fullMobile = normalizedMobile.length >= 10 ? `+91${normalizedMobile}` : "";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (normalizedMobile.length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobile_number: fullMobile }),
      });
      const data = await res.json().catch(() => ({}));
      const message = data?.error ?? data?.message ?? "Failed to send OTP";
      if (!res.ok) throw new Error(message);
      setStep("otp");
      setOtp("");
      setResendCooldown(60);
      const id = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) {
            clearInterval(id);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp || otp.length < 4) {
      setError("Enter the 6-digit code we sent you");
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
          mobile_number: fullMobile,
          otp: otp.trim(),
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
      router.push("/dashboard");
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

        {step === "mobile" ? (
          <>
            <p className="text-muted text-sm mb-8">
              Enter your mobile number. We’ll send you a one-time code to verify.
            </p>
            <form onSubmit={handleSendOtp} className="space-y-5">
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
                {loading ? "Sending…" : "Send OTP"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-muted text-sm mb-8">
              Enter the 6-digit code sent to {fullMobile || "your number"}.
            </p>
            <form onSubmit={handleVerifyAndLogin} className="space-y-5">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-muted mb-2">
                  Verification code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-colors text-center tracking-widest"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full rounded-xl h-11" disabled={loading || otp.length < 4}>
                {loading ? "Verifying…" : "Verify & log in"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-sm text-muted hover:text-foreground disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend OTP"}
                </button>
                <span className="mx-2 text-muted">·</span>
                <button
                  type="button"
                  onClick={() => { setStep("mobile"); setError(null); setOtp(""); }}
                  className="text-sm text-muted hover:text-foreground"
                >
                  Change number
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
