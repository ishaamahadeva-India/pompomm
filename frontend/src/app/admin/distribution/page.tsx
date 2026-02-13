"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type DistCampaign = {
  id: string;
  title: string;
  sponsor_name: string;
  total_budget: number;
  payout_model: string;
  status: string;
  start_time: string;
  end_time: string;
};

export default function AdminDistributionPage() {
  const token = useAuthStore((s) => s.token);
  const [campaigns, setCampaigns] = useState<DistCampaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    sponsor_name: "",
    preset: "" as "" | "starter" | "growth" | "boost",
    total_budget: 5000,
    payout_model: "fixed_milestone" as "fixed_milestone" | "tier_based",
    min_unique_views_required: 100,
    min_engagement_rate_required: 5,
    payout_per_milestone: 10,
    max_daily_payout_per_user: 500,
    tier_config_raw: '{"100":10,"500":75,"1000":200}',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    platform_margin_percentage: 25,
    fraud_buffer_percentage: 5,
  });

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/admin/distribution/campaigns`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r: { campaigns: DistCampaign[] }) => setCampaigns(r.campaigns ?? []))
      .catch(() => setError("Failed to load"));
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        sponsor_name: form.sponsor_name,
        total_budget: form.total_budget,
        payout_model: form.payout_model,
        min_unique_views_required: form.min_unique_views_required,
        min_engagement_rate_required: form.min_engagement_rate_required,
        max_daily_payout_per_user: form.max_daily_payout_per_user,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        platform_margin_percentage: form.platform_margin_percentage,
        fraud_buffer_percentage: form.fraud_buffer_percentage,
      };
      if (form.preset) body.preset = form.preset;
      if (form.payout_model === "fixed_milestone") {
        body.payout_per_milestone = form.payout_per_milestone;
      } else {
        try {
          body.tier_config = JSON.parse(form.tier_config_raw) as Record<string, number>;
        } catch {
          alert("Invalid tier_config JSON");
          setSubmitting(false);
          return;
        }
      }
      const res = await fetch(`${API_BASE}/admin/distribution/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setCampaigns((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ ...form, title: "", description: "", sponsor_name: "", preset: "", fraud_buffer_percentage: 5 });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">Distribution campaigns</h1>
      <p className="text-muted text-sm mb-8">Verified performance-based distribution. Creators earn from verified engagement via tracked referral links.</p>

      <Button className="mb-6 rounded-xl" onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancel" : "Create distribution campaign"}
      </Button>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-6 sm:p-8 mb-8 max-w-xl rounded-2xl border border-white/10 space-y-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <label className="block text-sm mb-1">Sponsor name</label>
            <input className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.sponsor_name} onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Campaign preset (optional)</label>
            <select className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.preset} onChange={(e) => setForm({ ...form, preset: e.target.value as "" | "starter" | "growth" | "boost" })}>
              <option value="">None (custom)</option>
              <option value="starter">Starter — ₹50k, fixed milestone</option>
              <option value="growth">Growth — ₹1.5L, tier-based</option>
              <option value="boost">Boost — ₹3L, tier-based</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Total budget (₹)</label>
              <input type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.total_budget} onChange={(e) => setForm({ ...form, total_budget: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Max daily payout per user (₹)</label>
              <input type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.max_daily_payout_per_user} onChange={(e) => setForm({ ...form, max_daily_payout_per_user: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Payout model</label>
            <select className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.payout_model} onChange={(e) => setForm({ ...form, payout_model: e.target.value as "fixed_milestone" | "tier_based" })}>
              <option value="fixed_milestone">Fixed per 100 views</option>
              <option value="tier_based">Tier-based</option>
            </select>
          </div>
          {form.payout_model === "fixed_milestone" && (
            <div>
              <label className="block text-sm mb-1">Payout per 100 views (₹)</label>
              <input type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.payout_per_milestone} onChange={(e) => setForm({ ...form, payout_per_milestone: Number(e.target.value) })} />
            </div>
          )}
          {form.payout_model === "tier_based" && (
            <div>
              <label className="block text-sm mb-1">Tier config JSON (e.g. {`{"100":10,"500":75,"1000":200}`})</label>
              <input className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-sm" value={form.tier_config_raw} onChange={(e) => setForm({ ...form, tier_config_raw: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Min unique views required</label>
              <input type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.min_unique_views_required} onChange={(e) => setForm({ ...form, min_unique_views_required: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Min engagement rate (%)</label>
              <input type="number" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.min_engagement_rate_required} onChange={(e) => setForm({ ...form, min_engagement_rate_required: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Platform margin (%)</label>
            <input type="number" min={0} max={100} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm max-w-[120px]" value={form.platform_margin_percentage} onChange={(e) => setForm({ ...form, platform_margin_percentage: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Fraud buffer (%)</label>
            <input type="number" min={0} max={50} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm max-w-[120px]" value={form.fraud_buffer_percentage} onChange={(e) => setForm({ ...form, fraud_buffer_percentage: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Start time</label>
              <input type="datetime-local" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1">End time</label>
              <input type="datetime-local" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="rounded-xl">{submitting ? "Creating…" : "Create"}</Button>
        </form>
      )}

      <div className="glass-card overflow-hidden rounded-2xl border border-white/10 table-scroll">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Title</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Sponsor</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Budget</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Payout model</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Status</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="p-4 font-medium">{c.title}</td>
                <td className="p-4">{c.sponsor_name}</td>
                <td className="p-4">₹{Number(c.total_budget).toLocaleString()}</td>
                <td className="p-4">{c.payout_model}</td>
                <td className="p-4">{c.status}</td>
                <td className="p-4">
                  <Link href={`/admin/distribution/${c.id}`} className="text-primary hover:underline text-sm font-medium">View stats & export</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && !showForm && <p className="p-8 text-muted text-center">No distribution campaigns</p>}
      </div>
    </div>
  );
}
