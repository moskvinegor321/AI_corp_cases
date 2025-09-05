"use client";
import { useEffect, useMemo, useState } from "react";
import { usePostFilters, type PostStatus } from "@/lib/filters/posts";
import type { Post } from "@/components/PostCard";

export default function TablePage() {
  const [items, setItems] = useState<Post[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const [view, setView] = useState<'matrix'|'list'>('matrix');
  const { filters, setStatuses, setRange } = usePostFilters();

  const load = async () => {
    const params = new URLSearchParams();
    if (filters.statuses?.length) params.set('status', JSON.stringify(filters.statuses));
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const r = await fetch(`/api/posts?${params.toString()}`); const d = await r.json(); setItems(d.items || []);
    const rp = await fetch(`/api/pillars`); const dp = await rp.json(); setPillars(dp.pillars || []);
  };
  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  const topics = useMemo(() => {
    return Array.from(new Set(items.map(i => i.topic || '').filter(Boolean))).sort();
  }, [items]);

  return (
    <div className="p-6 grid gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xl font-semibold">Таблица</div>
        <select className="select-compact-sm" value={view} onChange={(e)=>setView(e.target.value as 'matrix'|'list')}>
          <option value="matrix">Матрица</option>
          <option value="list">Список</option>
        </select>
        <select className="select-compact-sm" multiple value={filters.statuses as unknown as string[]} onChange={(e)=>{
          const opts = Array.from(e.target.selectedOptions).map(o=>o.value as PostStatus);
          setStatuses(opts);
        }}>
          <option value="READY_TO_PUBLISH">READY_TO_PUBLISH</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
          <option value="DRAFT">DRAFT</option>
        </select>
        <input className="select-compact-sm" type="date" value={filters.from?.slice(0,10) || ""} onChange={(e)=>setRange(e.target.value? new Date(e.target.value).toISOString(): undefined, filters.to)} />
        <input className="select-compact-sm" type="date" value={filters.to?.slice(0,10) || ""} onChange={(e)=>setRange(filters.from, e.target.value? new Date(e.target.value).toISOString(): undefined)} />
      </div>

      {view === 'matrix' ? (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Тема</th>
                {pillars.map(p => (<th key={p.id} className="text-left p-2">{p.name}</th>))}
              </tr>
            </thead>
            <tbody>
              {topics.map(topic => (
                <tr key={topic} className="align-top">
                  <td className="p-2 font-medium">{topic}</td>
                  {pillars.map(p => (
                    <td key={p.id} className="p-2">
                      <div className="grid gap-1">
                        {items.filter(i => (i.pillar?.id===p.id) && (i.topic===topic)).map(i => (
                          <div key={i.id} className="text-xs chip rounded px-2 py-1">{i.title} — {i.status} {i.scheduledAt? new Date(i.scheduledAt).toLocaleDateString(): i.publishedAt? new Date(i.publishedAt).toLocaleDateString(): ''}</div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Страница</th>
                <th className="text-left p-2">Тема</th>
                <th className="text-left p-2">Заголовок</th>
                <th className="text-left p-2">Статус</th>
                <th className="text-left p-2">Дата</th>
                <th className="text-left p-2">Обновлён</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td className="p-2">{i.pillar?.name || ''}</td>
                  <td className="p-2">{i.topic || ''}</td>
                  <td className="p-2">{i.title}</td>
                  <td className="p-2">{i.status}</td>
                  <td className="p-2">{i.scheduledAt? new Date(i.scheduledAt).toLocaleString(): i.publishedAt? new Date(i.publishedAt).toLocaleString(): ''}</td>
                  <td className="p-2">{new Date().toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


