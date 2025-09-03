"use client";
import { useCallback, useEffect, useState } from 'react';
import { HeaderStats } from '@/components/HeaderStats';
import { Filters, StoryStatus } from '@/components/Filters';
import { StoryCard, type Story } from '@/components/StoryCard';

export default function Home() {
  const [status, setStatus] = useState<StoryStatus>('all');
  const [items, setItems] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStories = useCallback(async (s: StoryStatus) => {
    const q = s === 'all' ? '' : `?status=${s}`;
    const res = await fetch(`/api/stories${q}`);
    const data = await res.json();
    setItems((data.items || []) as Story[]);
  }, []);

  useEffect(() => {
    fetchStories(status);
  }, [status, fetchStories]);

  const onAction = useCallback(async (id: string, action: 'publish' | 'reject' | 'triage') => {
    const token = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    await fetch(`/api/stories/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-admin-token': token || '',
      },
      body: JSON.stringify({ action }),
    });
    fetchStories(status);
  }, [status, fetchStories]);

  const generate = useCallback(async () => {
    setLoading(true);
    const token = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    await fetch('/api/generate', { method: 'POST', headers: { 'x-admin-token': token || '' } });
    setLoading(false);
    fetchStories(status);
  }, [status, fetchStories]);

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">AION</div>
          <HeaderStats />
        </div>
        <div className="flex items-center gap-3">
          <Filters value={status} onChange={setStatus} />
          <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={generate} disabled={loading}>
            {loading ? 'Генерация…' : 'Сгенерировать 5 новых историй'}
          </button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 grid-cols-1 md:grid-cols-2">
        {items.map((it) => (
          <StoryCard key={it.id} story={it} onAction={onAction} />
        ))}
      </div>
    </div>
  );
}
