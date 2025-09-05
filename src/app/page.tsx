"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PostCard, type Post } from '@/components/PostCard';

type PostWithComments = Post;

export default function Home() {
  const [items, setItems] = useState<PostWithComments[]>([]);
  const [adminToken, setAdminToken] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string|undefined>(undefined);
  const [promptOpen, setPromptOpen] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [contextPrompt, setContextPrompt] = useState('');
  const [tovPrompt, setTovPrompt] = useState('');
  const [promptText, setPromptText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [noSearch, setNoSearch] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; topic?: string; pillarId?: string }>({ title: '', body: '' });
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const [filterPillarId, setFilterPillarId] = useState<string|undefined>(undefined);
  const [statuses, setStatuses] = useState<Array<'DRAFT'|'NEEDS_REVIEW'|'READY_TO_PUBLISH'|'PUBLISHED'|'REJECTED'>>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [taskFilterOpen, setTaskFilterOpen] = useState(false);
  const [taskStatus, setTaskStatus] = useState<''|'OPEN'|'IN_PROGRESS'|'DONE'>('');
  const [assignee, setAssignee] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);

  const token = useMemo(() => adminToken || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || '', [adminToken]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterPillarId) params.set('pillarId', filterPillarId);
    if (statuses.length) params.set('status', JSON.stringify(statuses));
    if (taskStatus) params.set('taskStatus', taskStatus);
    if (assignee) params.set('assignee', assignee);
    params.set('pageSize', '20');
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      if (query.trim()) params.set('search', query.trim());
      const r = await fetch(`/api/posts?${params.toString()}`, { signal: controller.signal });
      if (!r.ok) throw new Error('failed');
      const d = await r.json();
      setItems(d.items || []);
    } catch (e) {
      // ignore aborts
    } finally {
      setLoading(false);
    }
  }, [filterPillarId, statuses, query, taskStatus, assignee]);

  useEffect(() => {
    load();
    fetch('/api/pillars').then(r=>r.json()).then(d=>setPillars(d.pillars||[]));
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') : '';
    if (saved) setAdminToken(saved);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 150);
    return () => { clearTimeout(t); abortRef.current?.abort(); };
  }, [load]);

  useEffect(()=>{
    const fetchStats = async () => {
      const p = new URLSearchParams(); if (filterPillarId) p.set('pillarId', filterPillarId);
      const r = await fetch(`/api/posts/stats?${p.toString()}`);
      const d = await r.json();
      setStats(d);
    };
    fetchStats();
  }, [filterPillarId]);

  const saveToken = (t: string) => { setAdminToken(t); if (typeof window !== 'undefined') localStorage.setItem('aion_admin_token', t); };

  return (
    <div className="p-6 grid gap-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold tracking-tight">Посты</div>
        <div className="flex items-center gap-2">
          <input className="px-2 py-1 rounded btn-glass btn-sm" type="password" placeholder="Admin token" value={adminToken} onChange={(e)=>saveToken(e.target.value)} style={{ width: 160 }} />
          <select className="select-compact-sm" value={filterPillarId||''} onChange={(e)=>{ const v = e.target.value||undefined; setFilterPillarId(v); }}>
            <option value="">Все страницы</option>
            {pillars.map(p=> (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <div className="relative">
            <button className="btn-glass btn-sm" onClick={()=>setTaskFilterOpen((v)=>!v)}>
              {taskStatus || assignee ? `Задачи: ${taskStatus || ''} ${assignee? '→ '+assignee: ''}` : 'Задачи'}
            </button>
            {taskFilterOpen && (
              <div className="absolute top-full left-0 mt-2 glass rounded-xl p-3 z-10 min-w-[260px] grid gap-2">
                <div className="text-xs opacity-80">Статус задачи</div>
                <select className="bg-background rounded p-2" value={taskStatus} onChange={(e)=>setTaskStatus(e.target.value as ''|'OPEN'|'IN_PROGRESS'|'DONE')}>
                  <option value="">Любой</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="DONE">DONE</option>
                </select>
                <div className="text-xs opacity-80">Исполнитель</div>
                <select className="bg-background rounded p-2" value={assignee} onChange={(e)=>setAssignee(e.target.value)}>
                  <option value="">Любой</option>
                  <option value="Егор">Егор</option>
                  <option value="Коля">Коля</option>
                  <option value="Лена">Лена</option>
                </select>
                <div className="flex gap-2 justify-end mt-2">
                  <button className="btn-glass btn-sm" onClick={()=>{ setTaskStatus(''); setAssignee(''); setTaskFilterOpen(false); }}>Сбросить</button>
                  <button className="btn-glass btn-sm" onClick={()=>setTaskFilterOpen(false)}>Готово</button>
                </div>
              </div>
            )}
          </div>
          <button className="btn-glass btn-sm" onClick={async ()=>{
            const name = typeof window!=='undefined' ? window.prompt('Название новой страницы/столпа') : '';
            if (!name || !name.trim()) return;
            const res = await fetch('/api/pillars', { method:'POST', headers:{ 'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ name: name.trim() }) });
            if (!res.ok) { alert('Не удалось создать страницу'); return; }
            const created = (await res.json()).pillar as { id: string; name: string };
            setPillars(prev=>[...prev, created]);
            setForm(f=>({ ...f, pillarId: created.id }));
          }}>Создать страницу</button>
          <button className="btn-glass btn-sm" onClick={()=>{ setForm(f=>({ ...f, pillarId: filterPillarId })); setModalOpen(true); }}>Добавить пост</button>
          <button className="btn-glass btn-sm" onClick={async ()=>{
            try {
              // Load page-scoped prompt if pillar selected
              if (filterPillarId) {
                const pr = await fetch(`/api/pages/${filterPillarId}`, { cache: 'no-store' });
                const pd = await pr.json();
                setPromptText(pd.page?.prompt || '');
                setSearchQuery(pd.page?.searchQuery || '');
                setNoSearch(!pd.page?.searchQuery);
              }
              const r = await fetch('/api/settings/prompts',{cache:'no-store'});
              if(r.ok){const d=await r.json(); setContextPrompt(d.contextPrompt||''); setTovPrompt(d.toneOfVoicePrompt||''); }
            } catch {}
            setPromptOpen(true);
          }}>Промпт и поиск</button>
          <button className="btn-glass btn-sm" onClick={async ()=>{ const res=await fetch('/api/generate',{ method:'POST', headers:{'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ pillarId: filterPillarId||undefined, n:5, searchQuery, noSearch, promptOverride: promptText }) }); if(!res.ok){ alert('Не удалось сгенерировать'); return;} await load(); }}>Сгенерировать 5 постов</button>
          {loading && <span className="chip px-2 py-1 rounded text-xs opacity-80">Загрузка…</span>}
        </div>
      </div>

      <div className="mt-2 flex justify-center">
        <input className="w-full max-w-[900px] px-3 py-2 rounded bg-background border border-white/10" placeholder="Поиск по заголовку, теме или тексту" value={query} onChange={(e)=>setQuery(e.target.value)} />
      </div>

      {stats && (
        <div className="flex items-center gap-2 flex-wrap opacity-90">
          <button
            className="chip px-3 py-1 rounded border border-white/10 hover:border-white/30"
            onClick={()=> setStatuses([])}
          >Всего: {stats.total}</button>
          {([
            { code: 'DRAFT', label: 'Разбор', cls: 'bg-gray-500/30 text-gray-200 border-gray-500/40', off: 'text-gray-300 border-gray-500/30' },
            { code: 'NEEDS_REVIEW', label: 'Ревью', cls: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30', off: 'text-indigo-300 border-indigo-500/20' },
            { code: 'READY_TO_PUBLISH', label: 'Запланирован', cls: 'bg-amber-500/20 text-amber-200 border-amber-500/30', off: 'text-amber-300 border-amber-500/20' },
            { code: 'PUBLISHED', label: 'Опубликован', cls: 'bg-green-600/20 text-green-200 border-green-600/30', off: 'text-green-400 border-green-600/20' },
            { code: 'REJECTED', label: 'Отклонён', cls: 'bg-red-600/20 text-red-200 border-red-600/30', off: 'text-red-400 border-red-600/20' },
          ] as Array<{code:'DRAFT'|'NEEDS_REVIEW'|'READY_TO_PUBLISH'|'PUBLISHED'|'REJECTED'; label:string; cls:string; off:string}>).map(s => {
            const active = statuses.includes(s.code);
            const count = (stats.byStatus as Record<string, number>)[s.code] || 0;
            return (
              <button
                key={s.code}
                onClick={()=> setStatuses(prev=> active ? prev.filter(x=>x!==s.code) : [...prev, s.code])}
                className={`chip px-3 py-1 rounded border transition-all ${active? `${s.cls} ring-2 ring-white/70 font-semibold` : `${s.off} opacity-80 hover:opacity-100`}`}
              >{active ? '✓ ' : ''}{s.label}: {count}</button>
            );
          })}
        </div>
      )}

      <div className="grid gap-3">
        {items.map((p)=> (
          <div key={p.id} className="grid gap-2">
            <PostCard post={p} onChanged={load} onEdit={(post)=>{ setEditingId(post.id); setForm({ title: post.title, body: post.body||'', topic: post.topic||undefined, pillarId: post.pillar?.id||undefined }); setModalOpen(true); }} adminToken={token} />
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="glass rounded-xl p-4 w-[min(700px,95vw)] grid gap-3">
            <div className="text-lg font-semibold">{editingId ? 'Редактировать пост' : 'Новый пост'}</div>
            <label className="grid gap-1 text-sm">
              <span>Заголовок</span>
              <input className="bg-background rounded p-2" value={form.title} onChange={async (e)=>{
                const title = e.target.value;
                setForm(f=>({ ...f, title }));
                if (title.trim().length > 3) {
                  try {
                    const q = encodeURIComponent(title.trim());
                    const r = await fetch(`/api/posts?search=${q}&pillarId=${encodeURIComponent(form.pillarId||'')}&pageSize=3`);
                    const d = await r.json();
                    if (Array.isArray(d.items) && d.items.length) {
                      (e.currentTarget as HTMLInputElement).setCustomValidity(`Похожих постов: ${d.items.length}`);
                    } else {
                      (e.currentTarget as HTMLInputElement).setCustomValidity('');
                    }
                  } catch { /* ignore */ }
                }
              }} />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Текст</span>
              <textarea className="bg-background rounded p-2 h-40" value={form.body} onChange={(e)=>setForm(f=>({...f, body: e.target.value}))} />
            </label>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>Тема</span>
                <input className="bg-background rounded p-2" value={form.topic||''} onChange={(e)=>setForm(f=>({...f, topic: e.target.value}))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Страница/Столп</span>
                <select className="bg-background rounded p-2" value={form.pillarId||''} onChange={(e)=>setForm(f=>({...f, pillarId: e.target.value||undefined}))}>
                  <option value="">—</option>
                  {pillars.map(p=> (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-glass btn-sm" onClick={()=>{ setModalOpen(false); setEditingId(undefined); }}>
                Отмена
              </button>
              <button className="btn-glass btn-sm" disabled={!form.title.trim()} onClick={async ()=>{
                // duplicate hint (soft)
                if (!editingId && form.title.trim().length > 3) {
                  const q = encodeURIComponent(form.title.trim());
                  const r = await fetch(`/api/posts?search=${q}&pillarId=${encodeURIComponent(form.pillarId||'')}&pageSize=5`);
                  const d = await r.json().catch(()=>({ items: [] }));
                  if (Array.isArray(d.items) && d.items.length) {
                    const proceed = typeof window!=='undefined' ? window.confirm(`Найдены похожие посты (${d.items.length}). Все равно создать?`) : true;
                    if (!proceed) return;
                  }
                }
                if (editingId) {
                  const res = await fetch(`/api/posts/${editingId}`, { method: 'PATCH', headers: { 'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ title: form.title, body: form.body, topic: form.topic, pillarId: form.pillarId }) });
                  if (!res.ok) { alert('Не удалось обновить пост'); return; }
                } else {
                  const res = await fetch('/api/posts', { method: 'POST', headers: { 'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ ...form, source: 'manual' }) });
                  if (!res.ok) { alert('Не удалось создать пост'); return; }
                }
                setModalOpen(false); setEditingId(undefined); setForm({ title:'', body:'' }); await load();
              }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {promptOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="panel rounded-xl p-4 w-[min(900px,95vw)]">
            <div className="mb-2 font-semibold">Промпт генерации</div>
            <div className="grid gap-2">
              <div>
                <div className="font-semibold text-sm mb-1">Context Prompt</div>
                <textarea value={contextPrompt} onChange={(e)=>setContextPrompt(e.target.value)} className="w-full h-24 rounded p-2 bg-background" />
              </div>
              <div>
                <div className="font-semibold text-sm mb-1">Tone of Voice Prompt</div>
                <textarea value={tovPrompt} onChange={(e)=>setTovPrompt(e.target.value)} className="w-full h-20 rounded p-2 bg-background" />
              </div>
            </div>
            <div className="font-semibold text-sm mb-1 mt-2">Основной промпт (задача)</div>
            <textarea value={promptText} onChange={(e)=>setPromptText(e.target.value)} className="w-full h-48 rounded p-2 bg-background" />
            <div className="mt-3 font-semibold">Поисковый запрос</div>
            <input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full h-10 rounded p-2 bg-background" placeholder="Например: scientific B2B sales AND AI last 90 days" disabled={noSearch} />
            <label className="mt-2 flex items-center gap-2 text-sm opacity-80">
              <input type="checkbox" checked={noSearch} onChange={(e)=>setNoSearch(e.target.checked)} />
              Исключить поисковый запрос (генерация только по промпту)
            </label>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="btn-glass btn-sm" onClick={()=>setPromptOpen(false)}>Закрыть</button>
              <button className="btn-glass btn-sm" disabled={savingPrompts} onClick={async ()=>{
                try {
                  setSavingPrompts(true);
                  const r1 = await fetch('/api/settings/prompts',{ method:'POST', headers:{'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ contextPrompt, toneOfVoicePrompt: tovPrompt }) });
                  let rMain: Response;
                  if (filterPillarId) {
                    rMain = await fetch(`/api/pages/${filterPillarId}`, { method:'PATCH', headers:{'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ prompt: promptText, searchQuery: noSearch ? '' : searchQuery }) });
                  } else {
                    rMain = await fetch('/api/prompt',{ method:'PUT', headers:{'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ prompt: promptText, searchQuery: noSearch ? '' : searchQuery }) });
                  }
                  if (!r1.ok || !rMain.ok) { alert('Не удалось сохранить'); return; }
                  setPromptOpen(false);
                } finally { setSavingPrompts(false); }
              }}>{savingPrompts? 'Сохранение…' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
