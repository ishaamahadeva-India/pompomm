"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type StatRow = {
  user_id: string;
  unique_creator_id: string | null;
  total_unique_views: number;
  total_likes: number;
  total_shares: number;
  verified_engagement_rate: number;
  total_earned: number;
  payout_status: string;
  fraud_score: number | null;
};

export default function AdminDistributionCampaignPage() {
  const params = useParams();
  const id = params.id as string;
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [campaignTitle, setCampaignTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`${API_BASE}/admin/distribution/campaigns/${id}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { stats: StatRow[] }) => {
        setStats(data.stats ?? []);
      })
      .catch(() => setError("Failed to load"));
    fetch(`${API_BASE}/distribution/campaigns/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { title?: string } | null) => c && setCampaignTitle(c.title ?? ""));
  }, [token, id]);

  const setPayoutStatus = async (userId: string, payout_status: string) => {
    setUpdating(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/distribution/campaigns/${id}/stats/${userId}/payout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payout_status }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStats((prev) => prev.map((s) => (s.user_id === userId ? { ...s, payout_status } : s)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  const exportCsv = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/distribution/export/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `distribution-report-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    }
  };

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <Link href="/admin/distribution" className="text-sm text-muted hover:text-foreground mb-6 inline-block">← Back to distribution campaigns</Link>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">{campaignTitle || "Distribution campaign"}</h1>
      <p className="text-muted text-sm mb-8">Creator stats · Approve or hold payouts</p>

      <Button variant="secondary" className="mb-6 rounded-xl" onClick={exportCsv}>
        Export campaign report (CSV)
      </Button>

      <div className="glass-card overflow-x-auto rounded-2xl border border-white/10 table-scroll">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Creator ID</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Views</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Eng. rate %</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Earned</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Fraud score</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Payout status</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.user_id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="p-4 font-mono">{s.unique_creator_id ?? s.user_id.slice(0, 8)}</td>
                <td className="p-4">{s.total_unique_views}</td>
                <td className="p-4">{Number(s.verified_engagement_rate).toFixed(1)}</td>
                <td className="p-4">₹{Number(s.total_earned).toLocaleString()}</td>
                <td className="p-4">{s.fraud_score != null ? s.fraud_score : "—"}</td>
                <td className="p-4">{s.payout_status}</td>
                <td className="p-4 flex gap-3">
                  {s.payout_status !== "approved" && (
                    <button
                      type="button"
                      className="text-primary hover:underline disabled:opacity-50 text-sm font-medium"
                      disabled={updating === s.user_id}
                      onClick={() => setPayoutStatus(s.user_id, "approved")}
                    >
                      Approve
                    </button>
                  )}
                  {s.payout_status !== "held" && (
                    <button
                      type="button"
                      className="text-amber-400 hover:underline disabled:opacity-50 text-sm font-medium"
                      disabled={updating === s.user_id}
                      onClick={() => setPayoutStatus(s.user_id, "held")}
                    >
                      Hold
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stats.length === 0 && <p className="p-8 text-muted text-center">No creator stats yet</p>}
      </div>
    </div>
  );
}
