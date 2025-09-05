"use client";
import { useCallback, useEffect, useState } from 'react';
import { HeaderStats } from '@/components/HeaderStats';
import { Filters, StoryStatus } from '@/components/Filters';
import { StoryCard, type Story } from '@/components/StoryCard';

export default function StoriesPage() {
  const [status, setStatus] = useState<StoryStatus>('all');
  const [items, setItems] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [noSearch, setNoSearch] = useState(false);
  const [contextPrompt, setContextPrompt] = useState('');
  const [tovPrompt, setTovPrompt] = useState('');
  const [pages, setPages] = useState<Array<{ id: string; name: string; meta?: { triage: number; total: number; lastPublishedAt: string | null } }>>([]);
  const [pageId, setPageId] = useState<string | ''>('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') : '';
    if (saved) setAdminToken(saved);
  }, []);

  const saveToken = useCallback((t: string) => {
    setAdminToken(t);
    if (typeof window !== 'undefined') localStorage.setItem('aion_admin_token', t);
  }, []);

  const fetchStories = useCallback(async (s: StoryStatus) => {
    const params = new URLSearchParams();
    if (s !== 'all') params.set('status', s);
    if (pageId) params.set('pageId', pageId);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/stories${q}`);
    const data = await res.json();
    setItems((data.items || []) as Story[]);
    setSelectedIds({});
  }, [pageId]);

  useEffect(() => {
    fetchStories(status);
  }, [status, fetchStories]);

  const onAction = useCallback(async (id: string, action: 'publish' | 'reject' | 'triage') => {
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
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
    await fetch('/api/generate', { method: 'POST', headers: { 'x-admin-token': token || '', 'content-type': 'application/json' }, body: JSON.stringify({ pageId: pageId || undefined, noSearch }) });
    setLoading(false);
    fetchStories(status);
  }, [status, fetchStories, adminToken, pageId, noSearch]);

  const onSelect = useCallback((id: string, v: boolean) => {
    setSelectedIds((prev) => ({ ...prev, [id]: v }));
  }, []);

  const deleteSelected = useCallback(async () => {
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    if (ids.length === 0) return;
    setItems((prev) => prev.filter((s) => !ids.includes(s.id)));
    await fetch('/api/stories', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', 'x-admin-token': token || '' },
      body: JSON.stringify({ ids }),
    });
    fetchStories(status);
  }, [selectedIds, adminToken, status, fetchStories]);

  const openPrompt = useCallback(async () => {
    try {
      const r = await fetch('/api/settings/prompts', { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        setContextPrompt(d.contextPrompt || '');
        setTovPrompt(d.toneOfVoicePrompt || '');
      }
    } catch {}
    if (pageId) {
      const res = await fetch(`/api/pages/${pageId}`, { cache: 'no-store' });
      const data = await res.json();
      setPromptText(data.page?.prompt || '');
      setSearchQuery(data.page?.searchQuery || '');
      setNoSearch(!data.page?.searchQuery);
    } else {
      const res = await fetch('/api/prompt', { cache: 'no-store' });
      const data = await res.json();
      setPromptText(data.prompt || '');
      setSearchQuery(data.searchQuery || '');
      setNoSearch(!data.searchQuery);
    }
    setPromptOpen(true);
  }, [pageId]);

  const savePrompt = useCallback(async (andGenerate = false) => {
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    let res: Response | null = null;
    const payload = {
      prompt: (promptText || '').trim() === '' ? null : promptText,
      searchQuery: (searchQuery || '').trim() === '' ? null : searchQuery,
    } as { prompt: string | null; searchQuery: string | null };
    if (pageId) {
      res = await fetch(`/api/pages/${pageId}`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-admin-token': token || '' }, body: JSON.stringify(payload) });
    } else {
      res = await fetch('/api/prompt', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-admin-token': token || '' }, body: JSON.stringify(payload) });
    }
    if (!res?.ok) {
      if (typeof window !== 'undefined') alert('Не удалось сохранить промпт. Проверьте admin token.');
      return;
    }
    setPromptOpen(false);
    if (andGenerate) await generate();
  }, [adminToken, promptText, searchQuery, generate, pageId]);

  useEffect(() => {
    fetch('/api/pages')
      .then((r) => r.json())
      .then(async (d) => {
        const list = (d.pages || []) as Array<{ id: string; name: string; meta?: { triage: number; total: number; lastPublishedAt: string | null } }>;
        if (!list.length) {
          const created = await createPage();
          setPages([created]);
          setPageId(created.id);
        } else {
          setPages(list);
          if (!pageId) setPageId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const createPage = useCallback(async () => {
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    const res = await fetch('/api/pages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-token': token || '' }, body: JSON.stringify({ name: 'Новый столп' }) });
    const data = await res.json();
    setPages((prev) => [...prev, data.page]);
    setPageId(data.page.id as string);
    return data.page as { id: string; name: string };
  }, [adminToken]);

  const renamePage = useCallback(async () => {
    let targetId = pageId;
    if (!targetId) {
      const created = await createPage();
      if (!created) return;
      targetId = created.id;
    }
    const name = typeof window !== 'undefined' ? window.prompt('Новое название столпа') : '';
    if (!name || !name.trim()) return;
    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
    const res = await fetch(`/api/pages/${targetId}`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-admin-token': token || '' }, body: JSON.stringify({ name: name.trim() }) });
    const data = await res.json();
    setPages((prev) => prev.map((p) => (p.id === targetId ? { ...p, name: data.page?.name || name.trim() } : p)));
    setPageId(targetId);
  }, [pageId, adminToken, createPage]);

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="glass rounded-2xl p-4 header-bar">
        <div className="header-top">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight">Генерация</div>
            <HeaderStats pageId={pageId || undefined} />
          </div>
          <div className="flex items-center justify-center">
            <Filters value={status} onChange={setStatus} />
          </div>
          <div className="header-actions justify-end">
            <input
              className="px-2 py-1 rounded btn-glass btn-sm"
              type="password"
              placeholder="Admin token"
              value={adminToken}
              onChange={(e) => saveToken(e.target.value)}
              style={{ width: 160 }}
            />
          </div>
        </div>
        <div className="header-bottom">
          <div className="header-actions">
            <select className="select-compact-sm" value={pageId} onChange={(e) => setPageId(e.target.value)}>
              {pages.map((p) => {
                const color = !p.meta || p.meta.total === 0 ? '⚪' : (p.meta.triage > 0 ? '🟡' : '🟢');
                const date = p.meta?.lastPublishedAt ? new Date(p.meta.lastPublishedAt).toLocaleDateString() : '';
                const label = `${color} ${p.name}${date ? ` · ${date}` : ''}`;
                return (
                  <option key={p.id} value={p.id}>{label}</option>
                );
              })}
            </select>
            <button className="btn-glass btn-sm" onClick={createPage}>Создать</button>
            <button className="btn-glass btn-sm" onClick={renamePage}>Переименовать</button>
            <button className="btn-glass btn-sm" onClick={async () => {
              if (!pageId) return;
              const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
              const cascade = typeof window !== 'undefined' && window.confirm('Удалить столп и все её истории?');
              const params = cascade ? '?cascade=true' : '';
              await fetch(`/api/pages/${pageId}${params}`, { method: 'DELETE', headers: { 'x-admin-token': token || '' } });
              const res = await fetch('/api/pages', { cache: 'no-store' });
              const data = await res.json();
              const list = (data.pages || []) as Array<{ id: string; name: string }>;
              setPages(list);
              setPageId(list[0]?.id || '');
              fetchStories(status);
            }}>Удалить</button>
          </div>
          <button className="btn-glass btn-sm" onClick={deleteSelected} disabled={Object.values(selectedIds).every((v) => !v)}>
            Удалить выбранные
          </button>
          <div className="header-actions justify-end">
            <button className="btn-glass btn-sm" onClick={openPrompt}>Промпт и поиск</button>
            <button className="btn-glass btn-sm" onClick={generate} disabled={loading}>
              {loading ? 'Генерация…' : 'Сгенерировать 5 постов'}
            </button>
          </div>
        </div>
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
            <div className="mb-2 text-sm opacity-80">Контекст и тон сохраняются глобально и будут добавляться к задаче.</div>
            <div className="grid gap-2">
              <div>
                <div className="font-semibold text-sm mb-1">Context Prompt</div>
                <textarea value={contextPrompt} onChange={(e) => setContextPrompt(e.target.value)} className="w-full h-24 rounded p-2 bg-background" />
              </div>
              <div>
                <div className="font-semibold text-sm mb-1">Tone of Voice Prompt</div>
                <textarea value={tovPrompt} onChange={(e) => setTovPrompt(e.target.value)} className="w-full h-20 rounded p-2 bg-background" />
              </div>
              <div className="flex justify-end">
                <button
                  className="btn-glass btn-sm"
                  onClick={async () => {
                    const token = adminToken || process.env.NEXT_PUBLIC_ADMIN_TOKEN;
                    await fetch('/api/settings/prompts', { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-token': token || '' }, body: JSON.stringify({ contextPrompt, toneOfVoicePrompt: tovPrompt }) });
                  }}
                >Сохранить контекст и TOV</button>
              </div>
            </div>
            <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} className="w-full h-72 rounded p-2 bg-background" />
            <div className="mt-3 font-semibold">Поисковый запрос</div>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 rounded p-2 bg-background" placeholder="Например: scientific B2B sales AND AI last 90 days" disabled={noSearch} />
            <label className="mt-2 flex items-center gap-2 text-sm opacity-80">
              <input type="checkbox" checked={noSearch} onChange={(e) => setNoSearch(e.target.checked)} />
              Исключить поисковый запрос (генерация только по промпту)
            </label>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="btn-glass btn-sm" onClick={() => setPromptOpen(false)}>Закрыть</button>
              <button className="btn-glass btn-sm" onClick={() => savePrompt(false)}>Сохранить</button>
              <button className="btn-glass btn-sm" onClick={() => savePrompt(true)}>Сохранить и сгенерировать</button>
              <button
                className="btn-glass btn-sm"
                onClick={async () => {
                  setPromptText('');
                  setSearchQuery('');
                  await savePrompt(false);
                }}
              >Сбросить на дефолт</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


