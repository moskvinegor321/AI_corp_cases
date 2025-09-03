"use client";
import { useCallback, useEffect, useState } from 'react';
import { HeaderStats } from '@/components/HeaderStats';
import { Filters, StoryStatus } from '@/components/Filters';
import { StoryCard, type Story } from '@/components/StoryCard';

export default function Home() {
  const [status, setStatus] = useState<StoryStatus>('all');
  const [items, setItems] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') : '';
    if (saved) setAdminToken(saved);
  }, []);

  const saveToken = useCallback((t: string) => {
    setAdminToken(t);
    if (typeof window !== 'undefined') localStorage.setItem('aion_admin_token', t);
  }, []);

  const fetchStories = useCallback(async (s: StoryStatus) => {
    const q = s === 'all' ? '' : `?status=${s}`;
    const res = await fetch(`/api/stories${q}`);
    const data = await res.json();
    setItems((data.items || []) as Story[]);
    setSelectedIds({});
  }, []);

  useEffect(() => {
    fetchStories(status);
  }, [status, fetchStories]);

  const onAction = useCallback(async (id: string, action: 'publish' | 'reject' | 'triage') => {
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    // optimistic UI
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status: action === 'publish' ? 'published' : action === 'reject' ? 'rejected' : 'triage' } : s)));
    await fetch(`/api/stories/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-admin-token': token || '',
      },
      body: JSON.stringify({ action }),
    });
    fetchStories(status);
  }, [status, fetchStories, adminToken]);

  const generate = useCallback(async () => {
    setLoading(true);
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    await fetch('/api/generate', { method: 'POST', headers: { 'x-admin-token': token || '' } });
    setLoading(false);
    fetchStories(status);
  }, [status, fetchStories, adminToken]);

  const onSelect = useCallback((id: string, v: boolean) => {
    setSelectedIds((prev) => ({ ...prev, [id]: v }));
  }, []);

  const deleteSelected = useCallback(async () => {
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    if (ids.length === 0) return;
    // optimistic
    setItems((prev) => prev.filter((s) => !ids.includes(s.id)));
    await fetch('/api/stories', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', 'x-admin-token': token || '' },
      body: JSON.stringify({ ids }),
    });
    fetchStories(status);
  }, [selectedIds, adminToken, status, fetchStories]);

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="glass rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tracking-tight">AION</div>
          <HeaderStats />
        </div>
        <div className="flex items-center gap-3">
          <Filters value={status} onChange={setStatus} />
          <input
            className="px-2 py-1 rounded btn-glass"
            type="password"
            placeholder="Admin token"
            value={adminToken}
            onChange={(e) => saveToken(e.target.value)}
            style={{ width: 180 }}
          />
          <button className="px-3 py-2 rounded btn-glass" onClick={deleteSelected} disabled={Object.values(selectedIds).every((v) => !v)}>
            Удалить выбранные
          </button>
          <button className="px-4 py-2 rounded btn-glass" onClick={generate} disabled={loading}>
            {loading ? 'Генерация…' : 'Сгенерировать 5 новых историй'}
          </button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 grid-cols-1">
        {items.map((it) => (
          <StoryCard key={it.id} story={it} onAction={onAction} selected={!!selectedIds[it.id]} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
