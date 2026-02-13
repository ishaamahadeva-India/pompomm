"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { API_BASE } from "@/lib/utils";

type DistCampaign = {
  id: string;
  title: string;
  description: string | null;
  sponsor_name: string;
  total_budget: number;
  payout_model: string;
  status: string;
  end_time: string;
};

export default function DistributionListPage() {
  const [campaigns, setCampaigns] = useState<DistCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/distribution/campaigns`)
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) {
          let msg = `Failed to load (${r.status})`;
          try {
            const data = JSON.parse(text);
            if (data?.error) msg = data.error;
          } catch {
            if (text) msg = text.slice(0, 100);
          }
          throw new Error(msg);
        }
        try {
          return JSON.parse(text) as { campaigns: DistCampaign[] };
        } catch {
          throw new Error("Invalid response from server");
        }
      })
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="page-container max-w-3xl">
        <Skeleton className="h-10 w-64 mb-4 rounded-xl" />
        <Skeleton className="h-5 w-full mb-8 rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container max-w-xl">
        <div className="glass-card p-8 text-center rounded-2xl border border-white/10">
          <p className="text-destructive mb-4">{error}</p>
          <p className="text-muted text-sm mb-4">Ensure the API is running (e.g. npm run dev in backend) and reachable at {API_BASE}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetch(`${API_BASE}/distribution/campaigns`)
                .then(async (r) => {
                  const text = await r.text();
                  if (!r.ok) throw new Error(`Failed to load (${r.status})`);
                  return JSON.parse(text) as { campaigns: DistCampaign[] };
                })
                .then((data) => setCampaigns(data.campaigns ?? []))
                .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
                .finally(() => setLoading(false));
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container max-w-3xl">
      <h1 className="text-2xl font-bold mb-2 tracking-tight">Verified Performance-Based Distribution</h1>
      <p className="text-muted text-sm mb-8">Performance-based distribution campaigns. Share your unique link; rewards based on verified engagement. Payments require admin approval.</p>

      {campaigns.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted rounded-2xl border border-white/10">
          No active distribution campaigns at the moment.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/distribution/${c.id}`}>
              <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-white/15 hover:bg-white/[0.06] transition-all cursor-pointer h-full">
                <h2 className="font-semibold text-lg mb-1">{c.title}</h2>
                <p className="text-sm text-muted mb-2">by {c.sponsor_name}</p>
                <p className="text-sm text-muted line-clamp-2 mb-4">{c.description || ""}</p>
                <p className="text-xs text-muted">Budget ₹{Number(c.total_budget).toLocaleString()} · {c.payout_model}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
