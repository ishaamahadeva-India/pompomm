"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sponsor_name: string;
  associate_sponsor: string | null;
  reward_pool: number;
  start_time: string;
  end_time: string;
  status: string;
  max_creatives_allowed: number;
  content_type: string | null;
  banner_image_url: string | null;
  media_url: string | null;
  narrative_text: string | null;
  question_text: string | null;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null;
  cta_url: string | null;
};

const CONTENT_TYPES = ["image", "video", "narrative", "question"] as const;

type CampaignCreative = {
  id: string;
  media_url: string;
  engagement_score: number;
  unique_views?: number;
  total_views?: number;
  total_likes?: number;
  shares: number;
  is_campaign_creative?: boolean;
};

export default function AdminCampaignEditPage() {
  const params = useParams();
  const id = params?.id as string;
  const token = useAuthStore((s) => s.token);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignCreative, setCampaignCreative] = useState<CampaignCreative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creativeUploading, setCreativeUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const [form, setForm] = useState<Partial<Campaign>>({});
  const [contentForm, setContentForm] = useState<Partial<Campaign>>({});

  useEffect(() => {
    if (!id || !token) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`${API_BASE}/campaigns/${id}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found")))) as Promise<Campaign>,
      fetch(`${API_BASE}/campaigns/${id}/creatives`).then((r) => r.json()) as Promise<{ creatives: CampaignCreative[] }>,
    ])
      .then(([c, { creatives }]) => {
        setCampaign(c);
        setForm({
          title: c.title,
          description: c.description ?? "",
          category: c.category,
          sponsor_name: c.sponsor_name,
          associate_sponsor: c.associate_sponsor ?? "",
          reward_pool: c.reward_pool,
          start_time: c.start_time?.slice(0, 16),
          end_time: c.end_time?.slice(0, 16),
          status: c.status,
          max_creatives_allowed: c.max_creatives_allowed ?? 1,
        });
        setContentForm({
          content_type: c.content_type ?? "",
          banner_image_url: c.banner_image_url ?? "",
          media_url: c.media_url ?? "",
          narrative_text: c.narrative_text ?? "",
          question_text: c.question_text ?? "",
          option_a: c.option_a ?? "",
          option_b: c.option_b ?? "",
          option_c: c.option_c ?? "",
          option_d: c.option_d ?? "",
          correct_answer: c.correct_answer ?? "",
          cta_url: c.cta_url ?? "",
        });
        const brand = creatives?.find((x) => x.is_campaign_creative) ?? creatives?.[0] ?? null;
        setCampaignCreative(brand);
      })
      .catch(() => setError("Failed to load campaign"))
      .finally(() => setLoading(false));
  }, [id, token]);

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description || null,
        associate_sponsor: form.associate_sponsor || null,
      };
      const res = await fetch(`${API_BASE}/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Save failed");
      }
      const updated = await res.json();
      setCampaign(updated);
      setForm({ ...form, ...updated });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setSaving(true);
    try {
      const payload = {
        content_type: contentForm.content_type || null,
        banner_image_url: contentForm.banner_image_url?.trim() || null,
        media_url: contentForm.media_url?.trim() || null,
        narrative_text: contentForm.narrative_text?.trim() || null,
        question_text: contentForm.question_text?.trim() || null,
        option_a: contentForm.option_a?.trim() || null,
        option_b: contentForm.option_b?.trim() || null,
        option_c: contentForm.option_c?.trim() || null,
        option_d: contentForm.option_d?.trim() || null,
        correct_answer: contentForm.correct_answer || null,
        cta_url: contentForm.cta_url?.trim() || null,
      };
      const res = await fetch(`${API_BASE}/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Save failed");
      }
      const updated = await res.json();
      setCampaign(updated);
      setContentForm({
        content_type: updated.content_type ?? "",
        banner_image_url: updated.banner_image_url ?? "",
        media_url: updated.media_url ?? "",
        narrative_text: updated.narrative_text ?? "",
        question_text: updated.question_text ?? "",
        option_a: updated.option_a ?? "",
        option_b: updated.option_b ?? "",
        option_c: updated.option_c ?? "",
        option_d: updated.option_d ?? "",
        correct_answer: updated.correct_answer ?? "",
        cta_url: updated.cta_url ?? "",
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const ct = contentForm.content_type || null;

  if (loading) return <p className="text-muted">Loading…</p>;
  if (error || !campaign) {
    return (
      <div>
        <p className="text-destructive mb-4">{error || "Campaign not found"}</p>
        <Link href="/admin/campaigns" className="text-primary hover:underline">← Back to campaigns</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/campaigns" className="text-sm text-muted hover:text-foreground mb-6 inline-block">← Back to campaigns</Link>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">Edit campaign</h1>
      <p className="text-muted text-sm mb-8">{campaign.title}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="creative">Brand creative</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <form onSubmit={saveDetails} className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Title</label>
              <input
                type="text"
                value={form.title ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Description</label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Category</label>
              <select
                value={form.category ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              >
                <option value="direct_ad">Direct Ad</option>
                <option value="sponsored_knowledge">Sponsored Knowledge</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Sponsor name</label>
              <input
                type="text"
                value={form.sponsor_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, sponsor_name: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Associate sponsor</label>
              <input
                type="text"
                value={form.associate_sponsor ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, associate_sponsor: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Reward pool</label>
              <input
                type="number"
                value={form.reward_pool ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, reward_pool: Number(e.target.value) }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Start time</label>
                <input
                  type="datetime-local"
                  value={form.start_time ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">End time</label>
                <input
                  type="datetime-local"
                  value={form.end_time ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Status</label>
              <select
                value={form.status ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Max creatives allowed</label>
              <input
                type="number"
                min={1}
                max={3}
                value={form.max_creatives_allowed ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, max_creatives_allowed: Number(e.target.value) }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              />
            </div>
            <Button type="submit" disabled={saving} className="rounded-xl">Save details</Button>
          </form>
        </TabsContent>

        <TabsContent value="creative" className="mt-6">
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 max-w-2xl">
            <h2 className="text-lg font-semibold mb-2">Official brand creative</h2>
            <p className="text-muted text-sm mb-6">One creative per campaign. Users can only watch, share and like it — no creator uploads. This keeps one viral creative for the brand.</p>
            {campaignCreative ? (
              <div>
                <div className="aspect-video bg-black/30 rounded-xl overflow-hidden mb-4 max-w-md">
                  {campaignCreative.media_url.match(/\.(mp4|webm)/i) ? (
                    <video src={campaignCreative.media_url.startsWith("http") ? campaignCreative.media_url : `${API_BASE}${campaignCreative.media_url}`} controls className="w-full h-full" />
                  ) : (
                    <img src={campaignCreative.media_url.startsWith("http") ? campaignCreative.media_url : `${API_BASE}${campaignCreative.media_url}`} alt="" className="w-full h-full object-contain" />
                  )}
                </div>
                <p className="text-sm text-muted">
                  {(campaignCreative.total_views ?? campaignCreative.unique_views) ?? 0} views · {(campaignCreative.total_likes ?? 0)} likes · {campaignCreative.shares} shares · Score {campaignCreative.engagement_score}
                </p>
                <Link href={`/campaign/${id}`} className="inline-block mt-3 text-sm text-primary hover:underline">View on campaign page →</Link>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const input = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('input[type="file"]');
                  const file = input?.files?.[0];
                  if (!file || !token || !id) return;
                  setCreativeUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append("media", file);
                    const res = await fetch(`${API_BASE}/admin/campaigns/${id}/creative`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err?.error ?? err?.message ?? "Upload failed");
                    }
                    const created = await res.json();
                    setCampaignCreative(created);
                    input.value = "";
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setCreativeUploading(false);
                  }
                }}
                className="space-y-4"
              >
                <label className="block text-sm font-medium text-muted mb-1">Image or video</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  required
                  className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-primary-foreground"
                />
                <Button type="submit" disabled={creativeUploading} className="rounded-xl">{creativeUploading ? "Uploading…" : "Upload campaign creative"}</Button>
              </form>
            )}
          </div>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <form onSubmit={saveContent} className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Banner image URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={contentForm.banner_image_url ?? ""}
                onChange={(e) => setContentForm((f) => ({ ...f, banner_image_url: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              />
              <p className="text-xs text-muted mt-1">Used for og:image and campaign header.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Content type</label>
              <select
                value={contentForm.content_type ?? ""}
                onChange={(e) => setContentForm((f) => ({ ...f, content_type: e.target.value || null }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              >
                <option value="">None</option>
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {ct === "image" && (
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={contentForm.media_url ?? ""}
                  onChange={(e) => setContentForm((f) => ({ ...f, media_url: e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                />
              </div>
            )}

            {ct === "video" && (
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Video URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={contentForm.media_url ?? ""}
                  onChange={(e) => setContentForm((f) => ({ ...f, media_url: e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                />
              </div>
            )}

            {ct === "narrative" && (
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Narrative text</label>
                <textarea
                  rows={6}
                  value={contentForm.narrative_text ?? ""}
                  onChange={(e) => setContentForm((f) => ({ ...f, narrative_text: e.target.value }))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                />
              </div>
            )}

            {ct === "question" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Question text</label>
                  <input
                    type="text"
                    value={contentForm.question_text ?? ""}
                    onChange={(e) => setContentForm((f) => ({ ...f, question_text: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Option A</label>
                  <input
                    type="text"
                    value={contentForm.option_a ?? ""}
                    onChange={(e) => setContentForm((f) => ({ ...f, option_a: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Option B</label>
                  <input
                    type="text"
                    value={contentForm.option_b ?? ""}
                    onChange={(e) => setContentForm((f) => ({ ...f, option_b: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Option C (optional)</label>
                  <input
                    type="text"
                    value={contentForm.option_c ?? ""}
                    onChange={(e) => setContentForm((f) => ({ ...f, option_c: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Option D (optional)</label>
                  <input
                    type="text"
                    value={contentForm.option_d ?? ""}
                    onChange={(e) => setContentForm((f) => ({ ...f, option_d: e.target.value }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Correct answer</label>
                  <select
                    value={contentForm.correct_answer ?? ""}
                    onChange={(e) => setContentForm((f) => ({ ...f, correct_answer: e.target.value || null }))}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
                  >
                    <option value="">—</option>
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                    <option value="d">D</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-muted mb-1">CTA URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={contentForm.cta_url ?? ""}
                onChange={(e) => setContentForm((f) => ({ ...f, cta_url: e.target.value }))}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm"
              />
            </div>

            <Button type="submit" disabled={saving} className="rounded-xl">Save content</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
