"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { RankBadge } from "@/components/RankBadge";

export type TopEarnerEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  profile_image_url: string | null;
  amount: number;
};

type TopEarnersRes = { period: string; entries: TopEarnerEntry[] };

const PERIODS = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
] as const;

export function TopEarners() {
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const [data, setData] = useState<TopEarnersRes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/leaderboard/top-earners?period=${period}&limit=10`)
      .then((r) => r.json())
      .then((res: TopEarnersRes) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData({ period, entries: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [period]);

  const entries = data?.entries ?? [];

  return (
    <section className="glass-card p-6 rounded-2xl border border-white/10">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Top earners</h2>
      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-white/5 border border-white/10 text-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">No earners in this period yet. Be the first!</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.user_id}
              className="flex items-center gap-4 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
            >
              <RankBadge rank={e.rank} />
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold text-primary">
                {e.profile_image_url ? (
                  <img
                    src={`/api${e.profile_image_url.startsWith("/") ? e.profile_image_url : "/" + e.profile_image_url}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (e.display_name || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.display_name}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold gold-reward">₹{Number(e.amount).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
