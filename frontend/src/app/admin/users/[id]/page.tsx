"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";

type User = {
  id: string;
  mobile_number: string;
  unique_creator_id: string | null;
  role: string;
  subscription_status: string;
  creator_tier?: string;
  total_score?: number;
  total_earnings?: number;
  total_views_generated?: number;
  total_likes_generated?: number;
  total_shares_generated?: number;
  created_at?: string;
};

type CRS = {
  crs_score: number;
  engagement_quality_score: number;
  geo_diversity_score: number;
  fraud_modifier_score: number;
  stability_score: number;
  last_updated: string | null;
};

type TierHistoryEntry = {
  id: string;
  old_tier: string;
  new_tier: string;
  reason: string;
  crs_score: number | null;
  changed_at: string;
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const token = useAuthStore((s) => s.token);
  const [user, setUser] = useState<User | null>(null);
  const [crs, setCrs] = useState<CRS | null>(null);
  const [tierHistory, setTierHistory] = useState<TierHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tierOverride, setTierOverride] = useState<string>("");
  const [tierSaving, setTierSaving] = useState(false);

  const loadUser = useCallback(() => {
    if (!token || !params.id) return;
    fetch(`${API_BASE}/admin/users/${params.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { user: User; crs: CRS | null; tier_history: TierHistoryEntry[] }) => {
        setUser(data.user);
        setCrs(data.crs);
        setTierHistory(data.tier_history ?? []);
        setTierOverride((data.user as User).creator_tier ?? "bronze");
      })
      .catch(() => setError("Failed to load user"));
  }, [token, params.id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!user) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/users" className="text-muted hover:text-foreground text-sm">← Users</Link>
      </div>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">User detail</h1>
      <p className="text-muted text-sm mb-8">{user.mobile_number} · {user.unique_creator_id ?? "—"}</p>

      <div className="glass-card rounded-2xl border border-white/10 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Profile & tier</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted">Role</dt><dd>{user.role}</dd>
          <dt className="text-muted">Subscription</dt><dd>{user.subscription_status}</dd>
          <dt className="text-muted">Current tier</dt><dd className="capitalize font-medium">{user.creator_tier ?? "—"}</dd>
          <dt className="text-muted">Total views</dt><dd>{user.total_views_generated ?? 0}</dd>
          <dt className="text-muted">Total likes</dt><dd>{user.total_likes_generated ?? 0}</dd>
          <dt className="text-muted">Total shares</dt><dd>{user.total_shares_generated ?? 0}</dd>
          <dt className="text-muted">Total earnings</dt><dd>{user.total_earnings ?? 0}</dd>
        </dl>
        <div className="mt-6 pt-4 border-t border-white/10">
          <label className="text-sm text-muted block mb-2">Override tier (admin)</label>
          <div className="flex gap-3 items-center">
            <select
              value={tierOverride}
              onChange={(e) => setTierOverride(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="verified">Verified</option>
            </select>
            <button
              disabled={tierSaving || tierOverride === (user.creator_tier ?? "bronze")}
              onClick={() => {
                setTierSaving(true);
                fetch(`${API_BASE}/admin/users/${params.id}/tier`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ creator_tier: tierOverride }),
                })
                  .then((r) => (r.ok ? r.json() : Promise.reject()))
                  .then(() => loadUser())
                  .catch(() => setError("Failed to update tier"))
                  .finally(() => setTierSaving(false));
              }}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {tierSaving ? "Saving…" : "Save tier"}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Tier history (last 5)</h2>
        {tierHistory.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 text-muted">
                <th className="py-2">From</th>
                <th className="py-2">To</th>
                <th className="py-2">Reason</th>
                <th className="py-2">CRS</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {tierHistory.map((h) => (
                <tr key={h.id} className="border-b border-white/5">
                  <td className="py-2 capitalize">{h.old_tier}</td>
                  <td className="py-2 capitalize">{h.new_tier}</td>
                  <td className="py-2">{h.reason}</td>
                  <td className="py-2">{h.crs_score != null ? h.crs_score.toFixed(2) : "—"}</td>
                  <td className="py-2 text-muted">{new Date(h.changed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted text-sm">No tier changes recorded.</p>
        )}
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-4">Creator Reliability Score (CRS)</h2>
        {crs ? (
          <>
            <p className="text-3xl font-bold mb-6">{crs.crs_score.toFixed(2)} <span className="text-muted text-base font-normal">/ 100</span></p>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <dt className="text-muted">Engagement quality score</dt>
                <dd>{crs.engagement_quality_score.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <dt className="text-muted">Geo diversity score</dt>
                <dd>{crs.geo_diversity_score.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <dt className="text-muted">Fraud modifier score</dt>
                <dd>{crs.fraud_modifier_score.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <dt className="text-muted">Stability score</dt>
                <dd>{crs.stability_score.toFixed(2)}</dd>
              </div>
            </dl>
            {crs.last_updated && (
              <p className="text-muted text-xs mt-4">Last updated: {new Date(crs.last_updated).toLocaleString()}</p>
            )}
          </>
        ) : (
          <p className="text-muted">No CRS record yet. Run the CRS update job for creators who participated in the last 7 days.</p>
        )}
      </div>
    </div>
  );
}
