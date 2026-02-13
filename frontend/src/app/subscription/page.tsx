"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { API_BASE } from "@/lib/utils";

type Status = {
  subscription_status: string;
  subscription_expiry: string | null;
  total_events_participated: number;
  total_earnings: number;
};

export default function SubscriptionPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/subscription/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then(setStatus)
      .catch(() => setError("Failed to load subscription"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleActivate = () => {
    if (!token) {
      router.push("/login");
      return;
    }
    setActivating(true);
    setError(null);
    fetch(`${API_BASE}/subscription/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Activation failed"))))
      .then(() => window.location.reload())
      .catch(() => {
        setError("Activation failed");
        setActivating(false);
      });
  };

  if (!token && !loading) {
    return (
      <main className="page-container max-w-md">
        <div className="glass-card p-10 text-center rounded-2xl border border-white/10">
          <p className="text-muted mb-6">Log in to view your subscription.</p>
          <Button onClick={() => router.push("/login")} className="rounded-xl">Log in</Button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page-container max-w-lg">
        <Skeleton className="h-10 w-48 mb-6 rounded-xl" />
        <Skeleton className="h-40 rounded-2xl mb-4" />
        <Skeleton className="h-12 w-56 rounded-xl" />
      </main>
    );
  }

  const isActive = status?.subscription_status === "active" && status?.subscription_expiry && new Date(status.subscription_expiry) > new Date();

  return (
    <main className="page-container max-w-lg">
      <h1 className="text-2xl font-bold mb-2 tracking-tight">Subscription</h1>
      <p className="text-muted text-sm mb-8">Manage your creator subscription to participate in campaigns.</p>
      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-5">
        <div className="flex justify-between items-center py-3 border-b border-white/5">
          <span className="text-muted text-sm">Plan</span>
          <span className={isActive ? "text-accent-green font-semibold" : "text-muted"}>{isActive ? "Active" : "Inactive"}</span>
        </div>
        {status?.subscription_expiry && (
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-muted text-sm">Expiry date</span>
            <span className="font-medium">{new Date(status.subscription_expiry).toLocaleDateString()}</span>
          </div>
        )}
        <div className="flex justify-between items-center py-3 border-b border-white/5">
          <span className="text-muted text-sm">Events participated</span>
          <span className="font-medium">{status?.total_events_participated ?? 0}</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="text-muted text-sm">Total earnings</span>
          <span className="gold-reward font-bold text-lg">₹{Number(status?.total_earnings ?? 0).toLocaleString()}</span>
        </div>
      </div>
      {!isActive && (
        <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-white/5">
          <p className="text-sm text-muted mb-4">Active subscription is required to participate in campaigns (upload, view, share).</p>
          <Button onClick={handleActivate} disabled={activating} className="rounded-xl">
            {activating ? "Activating…" : "Activate subscription (30 days)"}
          </Button>
        </div>
      )}
    </main>
  );
}
