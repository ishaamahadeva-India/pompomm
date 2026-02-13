"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCounter } from "@/components/StatCounter";
import { CreatorTierBadge } from "@/components/CreatorTierBadge";
import { API_BASE } from "@/lib/utils";

type ProfileRes = {
  id: string;
  mobile_number: string;
  role: string;
  total_score: number;
  total_earnings: number;
  created_at: string;
  display_name: string | null;
  unique_creator_id: string | null;
  subscription_status?: string;
  creator_tier?: string;
  age: number | null;
  gender: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  occupation: string | null;
  hobbies: string | null;
  brands_liked: string | null;
  bio: string | null;
};

const emptyForm = {
  display_name: "",
  unique_creator_id: "",
  age: "" as string | number,
  gender: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  occupation: "",
  hobbies: "",
  brands_liked: "",
  bio: "",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  non_binary: "Non-binary",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export default function ProfilePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<ProfileRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadProfile = useCallback(() => {
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then((data: ProfileRes) => {
        setProfile(data);
        useAuthStore.getState().setUser({
          id: data.id,
          mobile_number: data.mobile_number,
          role: data.role,
          creator_tier: data.creator_tier,
        });
        setForm({
          display_name: data.display_name ?? "",
          unique_creator_id: data.unique_creator_id ?? "",
          age: data.age ?? "",
          gender: data.gender ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          pincode: data.pincode ?? "",
          occupation: data.occupation ?? "",
          hobbies: data.hobbies ?? "",
          brands_liked: data.brands_liked ?? "",
          bio: data.bio ?? "",
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [token, loadProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        display_name: form.display_name.trim() || undefined,
        unique_creator_id: form.unique_creator_id.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        hobbies: form.hobbies.trim() || undefined,
        brands_liked: form.brands_liked.trim() || undefined,
        bio: form.bio.trim() || undefined,
        gender: form.gender.trim() || undefined,
      };
      const ageNum = form.age === "" ? undefined : Number(form.age);
      if (ageNum !== undefined && !Number.isNaN(ageNum)) body.age = ageNum;
      else if (form.age === "") body.age = null;

      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Update failed");
      setProfile(data);
      setForm({
        display_name: data.display_name ?? "",
        unique_creator_id: data.unique_creator_id ?? "",
        age: data.age ?? "",
        gender: data.gender ?? "",
        email: data.email ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        pincode: data.pincode ?? "",
        occupation: data.occupation ?? "",
        hobbies: data.hobbies ?? "",
        brands_liked: data.brands_liked ?? "",
        bio: data.bio ?? "",
      });
      setEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const needsSetup = profile && !profile.display_name?.trim();
  const displayName = profile?.display_name?.trim() || "Creator";
  const initial = displayName.charAt(0).toUpperCase();

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 text-sm transition-colors";

  const FieldView = ({
    label,
    value,
    mono,
  }: {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
  }) => {
    const show = value != null && String(value).trim() !== "";
    return (
      <div className="py-3 border-b border-white/5 last:border-0">
        <p className="text-xs font-medium text-muted/90 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-foreground ${mono ? "font-mono text-sm" : ""}`}>{show ? String(value) : "—"}</p>
      </div>
    );
  };

  if (!user && !loading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="glass-card p-10 text-center max-w-sm rounded-2xl">
          <p className="text-muted mb-6">Log in to view and edit your profile.</p>
          <Button onClick={() => router.push("/login")} size="lg" className="rounded-xl">
            Log in
          </Button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div className="glass-card p-10 text-center max-w-md mx-auto rounded-2xl">
          <p className="text-destructive mb-6">{error}</p>
          <Button onClick={() => { setError(null); setLoading(true); loadProfile(); }} className="rounded-xl">
            Retry
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 primary-gradient opacity-[0.07] pointer-events-none" />
        <div className="container mx-auto px-4 py-10 max-w-3xl relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-bold bg-white/10 border border-white/10 text-primary shrink-0"
                aria-hidden
              >
                {initial}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {profile?.display_name?.trim() || "Your profile"}
                  </h1>
                  {profile?.creator_tier && profile.creator_tier !== "bronze" && (
                    <CreatorTierBadge tier={profile.creator_tier} size="md" />
                  )}
                </div>
                <p className="text-muted mt-0.5">
                  {profile?.occupation?.trim() || "Creator · Pom Pomm"}
                </p>
                {profile?.unique_creator_id && (
                  <p className="text-xs font-mono text-muted mt-1">@{profile.unique_creator_id}</p>
                )}
              </div>
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
              {!editing ? (
                <Button onClick={() => setEditing(true)} variant="secondary" className="rounded-xl" size="sm">
                  Edit profile
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    setForm({
                      ...emptyForm,
                      display_name: profile?.display_name ?? "",
                      unique_creator_id: profile?.unique_creator_id ?? "",
                      age: profile?.age ?? "",
                      gender: profile?.gender ?? "",
                      email: profile?.email ?? "",
                      address: profile?.address ?? "",
                      city: profile?.city ?? "",
                      state: profile?.state ?? "",
                      pincode: profile?.pincode ?? "",
                      occupation: profile?.occupation ?? "",
                      hobbies: profile?.hobbies ?? "",
                      brands_liked: profile?.brands_liked ?? "",
                      bio: profile?.bio ?? "",
                    });
                    setEditing(false);
                    setEditError(null);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {needsSetup && (
            <div className="mt-6 p-4 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-200/95 text-sm flex flex-wrap items-center justify-between gap-3">
              <span>Complete your profile so others can recognise you and you can use distribution links.</span>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)} className="rounded-lg bg-amber-500/20 border-amber-500/30">
                Complete profile
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 max-w-3xl -mt-2 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-white/15 transition-colors">
            <StatCounter value={profile?.total_score ?? 0} label="Total score" animate={true} />
          </div>
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-white/15 transition-colors">
            <p className="text-2xl font-bold gold-reward">₹{Number(profile?.total_earnings ?? 0).toLocaleString()}</p>
            <p className="text-sm text-muted mt-0.5">Total earnings</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 max-w-3xl">
        {editing ? (
          <form onSubmit={handleSaveProfile} className="space-y-8">
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-6">Identity</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Display name</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Creator Name"
                    value={form.display_name}
                    onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Creator ID</label>
                  <input
                    type="text"
                    className={inputClass + " font-mono"}
                    placeholder="e.g. myhandle"
                    value={form.unique_creator_id}
                    onChange={(e) => setForm((f) => ({ ...f, unique_creator_id: e.target.value.replace(/\s/g, "").slice(0, 12) }))}
                    maxLength={12}
                  />
                  <p className="text-xs text-muted mt-1.5">For your sharing link. Letters, numbers, _ - only.</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-6">About you</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Age</label>
                  <input
                    type="number"
                    min={13}
                    max={120}
                    className={inputClass}
                    placeholder="Age"
                    value={form.age}
                    onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Gender</label>
                  <select
                    className={inputClass}
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="mt-5">
                <label className="block text-sm font-medium text-muted mb-2">Occupation</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Student, Designer"
                  value={form.occupation}
                  onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div className="mt-5">
                <label className="block text-sm font-medium text-muted mb-2">Hobbies</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Photography, Travel"
                  value={form.hobbies}
                  onChange={(e) => setForm((f) => ({ ...f, hobbies: e.target.value }))}
                  maxLength={500}
                />
              </div>
              <div className="mt-5">
                <label className="block text-sm font-medium text-muted mb-2">Brands you like</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Brand A, Brand B"
                  value={form.brands_liked}
                  onChange={(e) => setForm((f) => ({ ...f, brands_liked: e.target.value }))}
                  maxLength={500}
                />
              </div>
              <div className="mt-5">
                <label className="block text-sm font-medium text-muted mb-2">Bio</label>
                <textarea
                  className={inputClass + " min-h-[120px] resize-y"}
                  placeholder="A short intro about you"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  maxLength={1000}
                  rows={4}
                />
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-6">Contact</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Email</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Address</label>
                  <textarea
                    className={inputClass + " min-h-[88px] resize-y"}
                    placeholder="Street, area"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    maxLength={1000}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">City</label>
                    <input type="text" className={inputClass} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} maxLength={100} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">State</label>
                    <input type="text" className={inputClass} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} maxLength={100} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">Pincode</label>
                    <input type="text" className={inputClass} value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} maxLength={20} />
                  </div>
                </div>
              </div>
            </div>

            {editError && <p className="text-sm text-destructive text-center">{editError}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="rounded-xl px-8">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Identity</h2>
              <div className="divide-y divide-white/5">
                <FieldView label="Mobile" value={profile?.mobile_number} />
                <FieldView label="Display name" value={profile?.display_name} />
                <FieldView label="Creator ID" value={profile?.unique_creator_id} mono />
                {profile?.creator_tier && (
                  <div className="py-3 border-b border-white/5 last:border-0">
                    <p className="text-xs font-medium text-muted/90 uppercase tracking-widest mb-1">Creator tier</p>
                    <CreatorTierBadge tier={profile.creator_tier} size="md" />
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">About you</h2>
              <div className="divide-y divide-white/5">
                <FieldView label="Age" value={profile?.age != null ? profile.age : null} />
                <FieldView label="Gender" value={profile?.gender ? GENDER_LABELS[profile.gender] ?? profile.gender : null} />
                <FieldView label="Occupation" value={profile?.occupation} />
                <FieldView label="Hobbies" value={profile?.hobbies} />
                <FieldView label="Brands you like" value={profile?.brands_liked} />
                <FieldView label="Bio" value={profile?.bio} />
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Contact</h2>
              <div className="divide-y divide-white/5">
                <FieldView label="Email" value={profile?.email} />
                <FieldView label="Address" value={profile?.address} />
                <FieldView label="City" value={profile?.city} />
                <FieldView label="State" value={profile?.state} />
                <FieldView label="Pincode" value={profile?.pincode} />
              </div>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="mt-10 glass-card p-6 rounded-2xl border border-white/10">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Performance</h2>
          <p className="text-sm text-muted mb-5">
            Your score is based on validated views and shares across campaigns. Earnings come from campaign reward pools based on your ranking.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/">
              <Button variant="secondary" size="sm" className="rounded-xl">
                Campaigns
              </Button>
            </Link>
            <Link href="/distribution">
              <Button variant="secondary" size="sm" className="rounded-xl">
                Verified Performance
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="secondary" size="sm" className="rounded-xl">
                Subscription
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
