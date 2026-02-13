"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LeaderboardRow, type LeaderboardEntry } from "@/components/LeaderboardRow";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";

type CampaignBasic = { id: string; title: string };

export default function LeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const userId = useAuthStore((s) => s.user?.id);
  const token = useAuthStore((s) => s.token);

  const [campaign, setCampaign] = useState<CampaignBasic | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        const [campRes, lbRes] = await Promise.all([
          fetch(`${API_BASE}/campaigns/${campaignId}`).then((r) => {
            if (!r.ok) throw new Error("Campaign not found");
            return r.json();
          }) as Promise<CampaignBasic>,
          fetch(`${API_BASE}/leaderboard/${campaignId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then((r) => r.json()) as Promise<{ entries: LeaderboardEntry[] }>,
        ]);
        if (cancelled) return;
        setCampaign(campRes);
        setEntries(lbRes.entries ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [campaignId, token]);

  if (loading) {
    return (
      <main className="page-container max-w-2xl">
        <Skeleton className="h-9 w-24 mb-6 rounded-xl" />
        <Skeleton className="h-6 w-64 mb-8 rounded" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="page-container max-w-xl">
        <div className="glass-card p-8 text-center rounded-2xl border border-white/10">
          <p className="text-destructive mb-4">{error || "Campaign not found"}</p>
          <Button onClick={() => router.push("/dashboard")} className="rounded-xl">Back to campaigns</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container max-w-2xl">
      <Button variant="ghost" size="sm" className="rounded-lg mb-6" onClick={() => router.push(`/campaign/${campaignId}`)}>
        ← Back to campaign
      </Button>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">Leaderboard</h1>
      <p className="text-muted text-sm mb-8">{campaign.title}</p>

      {entries.length === 0 ? (
        <div className="glass-card p-10 text-center text-muted rounded-2xl border border-white/10">
          No entries yet. Participate in the campaign to appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <LeaderboardRow
              key={e.user_id}
              entry={e}
              isCurrentUser={userId === e.user_id}
              animate={true}
            />
          ))}
        </div>
      )}
    </main>
  );
}
