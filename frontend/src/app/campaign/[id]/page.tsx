"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { type Campaign } from "@/components/CampaignCard";
import { SponsorBadge } from "@/components/SponsorBadge";
import { CountdownTimer } from "@/components/CountdownTimer";
import { LeaderboardRow, type LeaderboardEntry } from "@/components/LeaderboardRow";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";

type Sponsor = { id: string; sponsor_type: string; sponsor_name: string; sponsor_logo?: string; sponsor_url?: string };
type Creative = {
  id: string;
  campaign_id: string;
  user_id: string;
  media_url: string;
  engagement_score: number;
  unique_views?: number;
  total_views?: number;
  total_unique_views?: number;
  total_likes?: number;
  shares: number;
  rank?: number;
  created_at: string;
};
type CampaignWithSponsors = Campaign & {
  sponsors?: Sponsor[];
  max_creatives_allowed?: number;
  content_type?: string | null;
  banner_image_url?: string | null;
  media_url?: string | null;
  narrative_text?: string | null;
  question_text?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_answer?: string | null;
  cta_url?: string | null;
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  const [campaign, setCampaign] = useState<CampaignWithSponsors | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingCreative, setViewingCreative] = useState<Creative | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mcqSelected, setMcqSelected] = useState<string | null>(null);
  const [mcqRecorded, setMcqRecorded] = useState(false);

  const isEnded = campaign ? (campaign.status === "completed" || new Date(campaign.end_time) < new Date()) : false;
  const mediaSrc = (url: string) => (url.startsWith("http") ? url : `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`);
  const maxCreatives = campaign?.max_creatives_allowed ?? 1;
  const userCreativeCount = creatives.filter((c) => c.user_id === userId).length;
  const canUpload = token && !isEnded && userCreativeCount < maxCreatives;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        const [campRes, creativesRes, lbRes] = await Promise.all([
          fetch(`${API_BASE}/campaigns/${id}`).then((r) => {
            if (!r.ok) throw new Error("Campaign not found");
            return r.json();
          }) as Promise<CampaignWithSponsors>,
          fetch(`${API_BASE}/campaigns/${id}/creatives`).then((r) => r.json()) as Promise<{ creatives: Creative[] }>,
          fetch(`${API_BASE}/leaderboard/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then((r) => r.json()) as Promise<{ entries: LeaderboardEntry[] }>,
        ]);
        if (cancelled) return;
        setCampaign(campRes);
        setCreatives(creativesRes.creatives ?? []);
        setLeaderboard(lbRes.entries ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, token]);

  useEffect(() => {
    if (!viewingCreative) return;
    const t = setInterval(() => setWatchSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [viewingCreative]);

  const handleRecordView = async () => {
    if (!token || !viewingCreative) return;
    try {
      const res = await fetch(`${API_BASE}/creative/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          creative_id: viewingCreative.id,
          watched_seconds: watchSeconds,
          device_hash: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 32) : "",
        }),
      });
      const data = await res.json();
      if (data.accepted) {
        setViewingCreative(null);
        setWatchSeconds(0);
        setLeaderboard((prev) => prev.slice());
        window.location.reload();
      } else {
        alert(data.message || "View not counted");
      }
    } catch {
      alert("Failed to record view");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !id) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("media", file);
      form.append("campaign_id", id);
      const res = await fetch(`${API_BASE}/creative/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Upload failed");
      }
      window.location.reload();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleShare = async (creativeId: string) => {
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/creative/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creative_id: creativeId }),
      });
      const data = await res.json();
      if (data.accepted) window.location.reload();
    } catch {
      // share not accepted or network error
    }
  };

  if (!id) {
    return (
      <main className="page-container max-w-xl">
        <div className="glass-card p-8 text-center rounded-2xl border border-white/10">
          <p className="text-muted mb-4">Invalid campaign link.</p>
          <Button onClick={() => router.push("/")} className="rounded-xl">Back to campaigns</Button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page-container">
        <Skeleton className="h-9 w-24 mb-6 rounded-xl" />
        <Skeleton className="h-44 rounded-2xl mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="page-container max-w-xl">
        <div className="glass-card p-8 text-center rounded-2xl border border-white/10">
          <p className="text-destructive mb-4">{error || "Campaign not found"}</p>
          <Button onClick={() => router.push("/")} className="rounded-xl">Back to campaigns</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => router.push("/")}>
          ← Back
        </Button>
      </div>

      <div className="glass-card p-6 sm:p-8 mb-8 rounded-2xl border border-white/10">
        <h1 className="text-2xl font-bold mb-2">{campaign.title}</h1>
        <p className="text-muted mb-4">{campaign.description || ""}</p>
        {campaign.sponsors && campaign.sponsors.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-2">
            {campaign.sponsors.filter((s) => s.sponsor_type === "main_sponsor").map((s) => (
              <span key={s.id} className="inline-flex items-center rounded-full bg-primary/30 px-3 py-1 text-sm font-medium text-primary">
                Main: {s.sponsor_name}
              </span>
            ))}
            {campaign.sponsors.filter((s) => s.sponsor_type === "associate_sponsor").map((s) => (
              <span key={s.id} className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm text-foreground">
                Associate: {s.sponsor_name}
              </span>
            ))}
            {campaign.sponsors.filter((s) => s.sponsor_type === "co_sponsor").map((s) => (
              <span key={s.id} className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm text-muted">
                Co-sponsor: {s.sponsor_name}
              </span>
            ))}
          </div>
        ) : (
          <SponsorBadge sponsorName={campaign.sponsor_name} associateSponsor={campaign.associate_sponsor} />
        )}
        <div className="flex flex-wrap items-center gap-6 mt-4">
          <div>
            <p className="text-xs text-muted">Reward pool</p>
            <p className="gold-reward text-xl font-bold">₹{Number(campaign.reward_pool).toLocaleString()}</p>
          </div>
          {!isEnded ? (
            <CountdownTimer endTime={campaign.end_time} />
          ) : (
            <span className="text-muted">Campaign ended</span>
          )}
        </div>
      </div>

      {(campaign.banner_image_url || campaign.content_type || campaign.cta_url) && (
        <div className="glass-card p-6 sm:p-8 mb-8 rounded-2xl border border-white/10 space-y-6">
          {campaign.banner_image_url && (
            <div className="rounded-xl overflow-hidden bg-black/20">
              <img
                src={campaign.banner_image_url.startsWith("http") ? campaign.banner_image_url : mediaSrc(campaign.banner_image_url)}
                alt=""
                className="w-full max-h-64 object-cover"
              />
            </div>
          )}
          {campaign.content_type === "image" && campaign.media_url && (
            <div className="rounded-xl overflow-hidden bg-black/20 aspect-video max-w-2xl">
              <img
                src={campaign.media_url.startsWith("http") ? campaign.media_url : mediaSrc(campaign.media_url)}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
          )}
          {campaign.content_type === "video" && campaign.media_url && (
            <div className="rounded-xl overflow-hidden bg-black/30 aspect-video max-w-2xl">
              <video
                src={campaign.media_url.startsWith("http") ? campaign.media_url : mediaSrc(campaign.media_url)}
                controls
                className="w-full h-full"
              />
            </div>
          )}
          {campaign.content_type === "narrative" && campaign.narrative_text && (
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-foreground">{campaign.narrative_text}</p>
            </div>
          )}
          {campaign.content_type === "question" && campaign.question_text && (
            <div className="space-y-3">
              <p className="font-medium">{campaign.question_text}</p>
              <div className="flex flex-col gap-2">
                {[
                  { key: "a", label: campaign.option_a },
                  { key: "b", label: campaign.option_b },
                  campaign.option_c ? { key: "c", label: campaign.option_c } : null,
                  campaign.option_d ? { key: "d", label: campaign.option_d } : null,
                ]
                  .filter(Boolean)
                  .map((opt) => (
                    <button
                      key={opt!.key}
                      type="button"
                      onClick={() => {
                        setMcqSelected(opt!.key);
                        setMcqRecorded(false);
                      }}
                      className={`text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                        mcqSelected === opt!.key
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {String.fromCharCode(64 + opt!.key.charCodeAt(0))}. {String(opt!.label ?? "")}
                    </button>
                  ))}
              </div>
              {mcqSelected && (
                <p className="text-sm text-muted">
                  {mcqRecorded ? "Answer recorded." : "Your selection is not sent to the server (optional)."}
                </p>
              )}
            </div>
          )}
          {campaign.cta_url && (
            <a
              href={campaign.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button className="rounded-xl">Visit link</Button>
            </a>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold">Creatives</h2>
          {canUpload && (
            <div className="glass-card p-5 mb-4 rounded-2xl border border-white/10">
              <label className="block text-sm font-medium text-muted mb-2">
                Upload your creative (image or video) {userCreativeCount >= maxCreatives && `(max ${maxCreatives} per campaign)`}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                onChange={handleUpload}
                disabled={uploading || userCreativeCount >= maxCreatives}
                className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-primary-foreground"
              />
              {uploadError && <p className="text-sm text-destructive mt-2">{uploadError}</p>}
              {uploading && <p className="text-sm text-muted mt-2">Uploading…</p>}
            </div>
          )}
          {creatives.length === 0 ? (
            <div className="glass-card p-10 text-center text-muted rounded-2xl border border-white/10">
              No creatives yet. {token ? "Upload one above to participate." : "Log in to upload."}
            </div>
          ) : (
            <div className="space-y-4">
              {creatives.map((c) => (
                <div key={c.id} className="glass-card p-5 rounded-2xl border border-white/10">
                  <div className="aspect-video bg-black/30 rounded-xl overflow-hidden mb-4">
                    {c.media_url.match(/\.(mp4|webm)/i) ? (
                      <video src={mediaSrc(c.media_url)} controls className="w-full h-full" />
                    ) : (
                      <img src={mediaSrc(c.media_url)} alt="" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-sm text-muted">
                      {c.rank && <span className="font-medium">Rank #{c.rank}</span>}
                      {" · "}
                      {(c.total_views ?? c.unique_views) ?? 0} views · {(c.total_unique_views ?? c.unique_views) ?? 0} unique · {(c.total_likes ?? 0)} likes · {c.shares} shares · Score {c.engagement_score}
                    </span>
                    {canUpload && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl"
                          onClick={() => setViewingCreative(c)}
                          disabled={!!viewingCreative}
                        >
                          Watch & count view
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleShare(c.id)}>
                          Share
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewingCreative && (
            <div className="glass-card p-6 rounded-2xl border border-white/10 fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:max-w-lg">
              <p className="text-sm text-muted mb-4">Watched: {watchSeconds}s (min 7s required)</p>
              <div className="flex gap-3">
                <Button onClick={handleRecordView} disabled={watchSeconds < 7} className="rounded-xl">Submit view</Button>
                <Button variant="secondary" className="rounded-xl" onClick={() => { setViewingCreative(null); setWatchSeconds(0); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-widest">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted text-sm rounded-2xl border border-white/10">
              No entries yet.
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((e) => (
                <LeaderboardRow
                  key={e.user_id}
                  entry={e}
                  isCurrentUser={userId === e.user_id}
                  animate={false}
                />
              ))}
              <Button variant="secondary" className="w-full rounded-xl" onClick={() => router.push(`/leaderboard/${id}`)}>
                Full leaderboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
