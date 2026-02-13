"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";

type Campaign = {
  id: string;
  title: string;
  status: string;
  category: string;
  max_creatives_allowed: number;
};

export default function AdminCampaignsPage() {
  const token = useAuthStore((s) => s.token);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/admin/campaigns`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r: { campaigns: Campaign[] }) => setCampaigns(r.campaigns ?? []))
      .catch(() => setError("Failed to load"));
  }, [token]);

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">Campaign management</h1>
      <p className="text-muted text-sm mb-8">View and manage all campaigns.</p>
      <div className="glass-card overflow-hidden rounded-2xl border border-white/10 table-scroll">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Title</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Actions</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Status</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Category</th>
              <th className="p-4 font-medium text-sm text-muted uppercase tracking-wider">Max creatives</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="p-4 font-medium">
                  <Link href={`/admin/campaigns/${c.id}`} className="text-primary hover:underline">{c.title}</Link>
                </td>
                <td className="p-4">{c.status}</td>
                <td className="p-4">{c.category}</td>
                <td className="p-4">{c.max_creatives_allowed ?? 1}</td>
                <td className="p-4">
                  <Link href={`/admin/campaigns/${c.id}`} className="text-sm text-primary hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && <p className="p-8 text-muted text-center">No campaigns</p>}
      </div>
    </div>
  );
}
