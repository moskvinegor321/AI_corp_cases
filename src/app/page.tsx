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
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');

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

  const openPrompt = useCallback(async () => {
    const res = await fetch('/api/prompt');
    const data = await res.json();
    setPromptText(data.prompt || '');
    setPromptOpen(true);
  }, []);

  const savePrompt = useCallback(async (andGenerate = false) => {
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    await fetch('/api/prompt', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-admin-token': token || '' }, body: JSON.stringify({ prompt: promptText }) });
    setPromptOpen(false);
    if (andGenerate) await generate();
  }, [adminToken, promptText, generate]);

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="glass rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto] items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tracking-tight">AION</div>
          <HeaderStats />
        </div>
        <div className="flex items-center justify-center">
          <Filters value={status} onChange={setStatus} />
        </div>
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
        <button className="px-4 py-2 rounded btn-glass" onClick={openPrompt}>
            Промпт
          </button>
        <button className="px-4 py-2 rounded btn-glass" onClick={generate} disabled={loading}>
            {loading ? 'Генерация…' : 'Сгенерировать 5 новых историй'}
          </button>
      </div>
      <div className="mt-6 grid gap-4 grid-cols-1">
        {items.map((it) => (
          <StoryCard key={it.id} story={it} onAction={onAction} selected={!!selectedIds[it.id]} onSelect={onSelect} />
        ))}
      </div>
      {promptOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="glass rounded-xl p-4 w-[min(900px,95vw)]">
            <div className="mb-2 font-semibold">Промпт генерации</div>
            <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} className="w-full h-72 rounded p-2 bg-background" />
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-2 rounded btn-glass" onClick={() => setPromptOpen(false)}>Закрыть</button>
              <button className="px-3 py-2 rounded btn-glass" onClick={() => savePrompt(false)}>Сохранить</button>
              <button className="px-3 py-2 rounded btn-glass" onClick={() => savePrompt(true)}>Сохранить и сгенерировать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
