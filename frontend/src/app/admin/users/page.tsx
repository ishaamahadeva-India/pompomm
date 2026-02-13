"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";

type User = {
  id: string;
  mobile_number: string;
  unique_creator_id: string | null;
  role: string;
  subscription_status: string;
  total_views_generated: number;
  total_likes_generated: number;
  total_shares_generated: number;
};

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`${API_BASE}/admin/users${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r: { users: User[] }) => setUsers(r.users ?? []))
      .catch(() => setError("Failed to load"));
  }, [token, search]);

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">User management</h1>
      <p className="text-muted text-sm mb-8">Search and view users.</p>
      <input
        type="text"
        placeholder="Search by mobile or creator ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <div className="glass-card overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Mobile</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Creator ID</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Role</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Subscription</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Views</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Likes</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Shares</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="p-4">
                  <Link href={`/admin/users/${u.id}`} className="text-primary hover:underline">{u.mobile_number}</Link>
                </td>
                <td className="p-4 font-mono text-muted">{u.unique_creator_id ?? "—"}</td>
                <td className="p-4">{u.role}</td>
                <td className="p-4">{u.subscription_status}</td>
                <td className="p-4">{u.total_views_generated ?? 0}</td>
                <td className="p-4">{u.total_likes_generated ?? 0}</td>
                <td className="p-4">{u.total_shares_generated ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-8 text-muted text-center">No users</p>}
      </div>
    </div>
  );
}
