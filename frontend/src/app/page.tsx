"use client";

import { useEffect, useState } from "react";
import { CampaignCard, type Campaign } from "@/components/CampaignCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { API_BASE } from "@/lib/utils";
import { LeaderboardRow, type LeaderboardEntry } from "@/components/LeaderboardRow";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import PremiumHero from "@/components/PremiumHero";
import { TopEarners } from "@/components/TopEarners";

type CampaignsRes = { campaigns: Campaign[] };
type LeaderboardRes = { entries: LeaderboardEntry[]; currentUserRank: number | null };

export default function DashboardPage() {
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [directAd, setDirectAd] = useState<Campaign[]>([]);
  const [sponsored, setSponsored] = useState<Campaign[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("direct");
  const token = useAuthStore((s) => s.token);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        const [activeRes, directRes, sponsoredRes] = await Promise.all([
          fetch(`${API_BASE}/campaigns?status=active`).then((r) => r.json()) as Promise<CampaignsRes>,
          fetch(`${API_BASE}/campaigns?status=active&category=direct_ad`).then((r) => r.json()) as Promise<CampaignsRes>,
          fetch(`${API_BASE}/campaigns?status=active&category=sponsored_knowledge`).then((r) => r.json()) as Promise<CampaignsRes>,
        ]);
        if (cancelled) return;
        setActiveCampaigns(activeRes.campaigns ?? []);
        setDirectAd(directRes.campaigns ?? []);
        setSponsored(sponsoredRes.campaigns ?? []);
        const hero = activeRes.campaigns?.[0];
        if (hero?.id) {
          const lb = await fetch(`${API_BASE}/leaderboard/${hero.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()) as LeaderboardRes;
          if (!cancelled) setLeaderboard(lb.entries ?? []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setProfileComplete(null);
      return;
    }
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { display_name?: string | null } | null) => setProfileComplete(p?.display_name != null && p.display_name.trim() !== ""))
      .catch(() => setProfileComplete(null));
  }, [token]);

  // Logged out: show landing hero
  if (!token) {
    return <PremiumHero />;
  }

  if (loading) {
    return (
      <main className="page-container">
        <Skeleton className="h-44 w-full rounded-2xl mb-8" />
        <div className="flex gap-2 mb-6">
          <Skeleton className="h-11 w-28 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container max-w-xl">
        <div className="glass-card p-8 text-center rounded-2xl border border-white/10">
          <p className="text-destructive mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="rounded-xl">Retry</Button>
        </div>
      </main>
    );
  }

  const hero = activeCampaigns[0];

  return (
    <main className="page-container">
      {token && profileComplete === false && (
        <section className="glass-card p-4 mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-amber-200/95">Complete your profile to get your sharing link and appear on leaderboards.</p>
          <Link href="/profile"><Button size="sm" variant="secondary" className="rounded-xl bg-amber-500/20 border-amber-500/30">Complete profile</Button></Link>
        </section>
      )}
      {hero ? (
        <section className="glass-card p-6 sm:p-8 mb-8 overflow-hidden relative rounded-2xl border border-white/10">
          <div className="primary-gradient absolute inset-0 opacity-10 pointer-events-none rounded-2xl" />
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">{hero.title}</h1>
            <p className="text-muted text-sm mb-4 line-clamp-2">{hero.description || "Active campaign"}</p>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider">Reward pool</p>
                <p className="gold-reward text-2xl font-bold">₹{Number(hero.reward_pool).toLocaleString()}</p>
              </div>
            </div>
            <Link href={`/campaign/${hero.id}`} className="inline-block mt-5">
              <Button className="rounded-xl">View campaign</Button>
            </Link>
          </div>
        </section>
      ) : (
        <section className="glass-card p-10 mb-8 text-center rounded-2xl border border-white/10">
          <p className="text-muted">No active campaigns right now.</p>
          <p className="text-sm text-muted mt-2">Check back later for new opportunities.</p>
        </section>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="direct">Direct Ad</TabsTrigger>
          <TabsTrigger value="sponsored">Sponsored Knowledge</TabsTrigger>
          <TabsTrigger value="distribution">Verified Performance</TabsTrigger>
        </TabsList>
        <TabsContent value="direct" className="mt-6">
          {directAd.length === 0 ? (
            <div className="glass-card p-10 text-center text-muted rounded-2xl border border-white/10">
              No direct ad campaigns at the moment.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {directAd.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="sponsored" className="mt-6">
          {sponsored.length === 0 ? (
            <div className="glass-card p-10 text-center text-muted rounded-2xl border border-white/10">
              No sponsored knowledge campaigns at the moment.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sponsored.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="distribution" className="mt-6">
          <div className="glass-card p-6 mb-4 rounded-2xl border border-white/10">
            <p className="text-sm text-muted">
              Verified Performance-Based Distribution. Share your link; rewards based on verified engagement. Payments require admin approval.
            </p>
          </div>
          <Link href="/distribution"><Button variant="secondary" className="rounded-xl">View distribution campaigns</Button></Link>
        </TabsContent>
      </Tabs>

      {hero && (
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Leaderboard preview</h2>
          {leaderboard.length === 0 ? (
            <div className="glass-card p-10 text-center text-muted rounded-2xl border border-white/10">
              No entries yet. Be the first to participate.
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((e) => (
                <LeaderboardRow key={e.user_id} entry={e} animate={false} />
              ))}
              <Link href={`/leaderboard/${hero.id}`} className="block mt-5">
                <Button variant="secondary" className="rounded-xl">View full leaderboard</Button>
              </Link>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <TopEarners />
      </section>
    </main>
  );
}
