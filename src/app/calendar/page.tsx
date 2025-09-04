"use client";
import { useEffect, useMemo, useState } from "react";
import { PostCard, type Post } from "@/components/PostCard";

type Filters = { statuses: (Post["status"])[]; from?: string; to?: string };

export default function CalendarPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [filters, setFilters] = useState<Filters>({ statuses: ["READY_TO_PUBLISH", "PUBLISHED"] });

  const load = async () => {
    const params = new URLSearchParams();
    if (filters.statuses?.length) params.set("status", JSON.stringify(filters.statuses));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const r = await fetch(`/api/posts?${params.toString()}`);
    const d = await r.json();
    setItems(d.items || []);
  };
  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const groups = useMemo(() => {
    const map: Record<string, Post[]> = {};
    for (const p of items) {
      const d = p.status === "PUBLISHED" ? p.publishedAt : p.scheduledAt;
      const key = d ? new Date(d).toISOString().slice(0, 10) : "Без даты";
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [items]);

  return (
    <div className="p-6 grid gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xl font-semibold">Календарь</div>
        <select className="select-compact-sm" multiple value={filters.statuses as any}
          onChange={(e) => {
            const opts = Array.from(e.target.selectedOptions).map(o => o.value as Post["status"]);
            setFilters(prev => ({ ...prev, statuses: opts }));
          }}>
          <option value="READY_TO_PUBLISH">READY_TO_PUBLISH</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
          <option value="DRAFT">DRAFT</option>
        </select>
        <input className="select-compact-sm" type="date" value={filters.from?.slice(0,10) || ""} onChange={(e) => setFilters(p=>({ ...p, from: e.target.value? new Date(e.target.value).toISOString(): undefined }))} />
        <input className="select-compact-sm" type="date" value={filters.to?.slice(0,10) || ""} onChange={(e) => setFilters(p=>({ ...p, to: e.target.value? new Date(e.target.value).toISOString(): undefined }))} />
      </div>

      {groups.map(([date, posts]) => (
        <div key={date} className="glass rounded-xl p-3 grid gap-2">
          <div className="font-semibold opacity-80">{date}</div>
          <div className="grid gap-2">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onChanged={load} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


