"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const now = new Date();
const defaultStart = new Date(now);
const defaultEnd = new Date(now);
defaultEnd.setDate(defaultEnd.getDate() + 30);

function toLocalDateTime(d: Date) {
  return d.toISOString().slice(0, 16);
}

export default function AdminCreateCampaignPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "direct_ad" as "direct_ad" | "sponsored_knowledge",
    sponsor_name: "",
    associate_sponsor: "",
    reward_pool: 50000,
    start_time: toLocalDateTime(defaultStart),
    end_time: toLocalDateTime(defaultEnd),
    status: "active" as "upcoming" | "active" | "completed",
    max_creatives_allowed: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          sponsor_name: form.sponsor_name.trim(),
          associate_sponsor: form.associate_sponsor.trim() || null,
          reward_pool: Number(form.reward_pool),
          start_time: form.start_time,
          end_time: form.end_time,
          status: form.status,
          max_creatives_allowed: form.max_creatives_allowed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? data?.error ?? "Create failed");
      router.replace(`/admin/campaigns/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm";

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/campaigns" className="text-muted hover:text-foreground text-sm">← Campaigns</Link>
        <h1 className="text-2xl font-bold tracking-tight">Create campaign</h1>
      </div>
      <p className="text-muted text-sm mb-6">
        Add a new campaign. After creating, you can add content (image, video, narrative, or question) in the Content tab.
      </p>
      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={inputClass}
            placeholder="e.g. Spring 2025 Brand Campaign"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={inputClass}
            placeholder="What creators should do..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Category *</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as "direct_ad" | "sponsored_knowledge" }))}
            className={inputClass}
          >
            <option value="direct_ad">Direct Ad</option>
            <option value="sponsored_knowledge">Sponsored Knowledge</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Sponsor name *</label>
          <input
            type="text"
            required
            value={form.sponsor_name}
            onChange={(e) => setForm((f) => ({ ...f, sponsor_name: e.target.value }))}
            className={inputClass}
            placeholder="Acme Brands"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Associate sponsor</label>
          <input
            type="text"
            value={form.associate_sponsor}
            onChange={(e) => setForm((f) => ({ ...f, associate_sponsor: e.target.value }))}
            className={inputClass}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Reward pool (₹) *</label>
          <input
            type="number"
            min={0}
            value={form.reward_pool}
            onChange={(e) => setForm((f) => ({ ...f, reward_pool: Number(e.target.value) }))}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Start time *</label>
            <input
              type="datetime-local"
              required
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">End time *</label>
            <input
              type="datetime-local"
              required
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Status *</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "upcoming" | "active" | "completed" }))}
            className={inputClass}
          >
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Max creatives per user (1–3)</label>
          <input
            type="number"
            min={1}
            max={3}
            value={form.max_creatives_allowed}
            onChange={(e) => setForm((f) => ({ ...f, max_creatives_allowed: Number(e.target.value) }))}
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="rounded-xl">{saving ? "Creating…" : "Create campaign"}</Button>
          <Link href="/admin/campaigns"><Button type="button" variant="secondary" className="rounded-xl">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
