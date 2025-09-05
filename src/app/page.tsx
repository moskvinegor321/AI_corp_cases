"use client";
import { useEffect, useMemo, useState } from 'react';
import { PostCard, type Post } from '@/components/PostCard';

type CommentDraft = { text: string; isTask: boolean; taskStatus: 'OPEN'|'IN_PROGRESS'|'DONE'|''; dueAt?: string };

export default function Home() {
  const [items, setItems] = useState<Post[]>([]);
  const [adminToken, setAdminToken] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [contextPrompt, setContextPrompt] = useState('');
  const [tovPrompt, setTovPrompt] = useState('');
  const [promptText, setPromptText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [noSearch, setNoSearch] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; topic?: string; pillarId?: string }>({ title: '', body: '' });
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CommentDraft>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const token = useMemo(() => adminToken || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || '', [adminToken]);

  const load = async (overridePillarId?: string) => {
    const params = new URLSearchParams();
    const pid = typeof overridePillarId === 'string' ? overridePillarId : form.pillarId;
    if (pid) params.set('pillarId', pid);
    const r = await fetch(`/api/posts?${params.toString()}`);
    const d = await r.json();
    setItems(d.items || []);
  };

  useEffect(() => {
    load();
    fetch('/api/pillars').then(r=>r.json()).then(d=>setPillars(d.pillars||[]));
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') : '';
    if (saved) setAdminToken(saved);
  }, []);

  useEffect(() => { load(); }, [form.pillarId]);

  const saveToken = (t: string) => { setAdminToken(t); if (typeof window !== 'undefined') localStorage.setItem('aion_admin_token', t); };

  const setDraft = (id: string, patch: Partial<CommentDraft>) => setDrafts((prev) => ({
    ...prev,
    [id]: { ...(prev[id] || { text: '', isTask: false, taskStatus: '' as const }), ...patch },
  }));

  return (
    <div className="p-6 grid gap-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold tracking-tight">Посты</div>
        <div className="flex items-center gap-2">
          <input className="px-2 py-1 rounded btn-glass btn-sm" type="password" placeholder="Admin token" value={adminToken} onChange={(e)=>saveToken(e.target.value)} style={{ width: 160 }} />
          <select className="select-compact-sm" value={form.pillarId||''} onChange={(e)=>{ const v = e.target.value||undefined; setForm(f=>({ ...f, pillarId: v })); }}>
            <option value="">Все страницы</option>
            {pillars.map(p=> (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <button className="btn-glass btn-sm" onClick={async ()=>{
            const name = typeof window!=='undefined' ? window.prompt('Название новой страницы/столпа') : '';
            if (!name || !name.trim()) return;
            const res = await fetch('/api/pillars', { method:'POST', headers:{ 'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ name: name.trim() }) });
            if (!res.ok) { alert('Не удалось создать страницу'); return; }
            const created = (await res.json()).pillar as { id: string; name: string };
            setPillars(prev=>[...prev, created]);
            setForm(f=>({ ...f, pillarId: created.id }));
          }}>Создать страницу</button>
          <button className="btn-glass btn-sm" onClick={()=>setModalOpen(true)}>Добавить пост</button>
          <button className="btn-glass btn-sm" onClick={async ()=>{
            try { const r = await fetch('/api/settings/prompts',{cache:'no-store'}); if(r.ok){const d=await r.json(); setContextPrompt(d.contextPrompt||''); setTovPrompt(d.toneOfVoicePrompt||''); }} catch {}
            setPromptOpen(true);
          }}>Промпт и поиск</button>
          <button className="btn-glass btn-sm" onClick={async ()=>{ const res=await fetch('/api/generate',{ method:'POST', headers:{'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ pillarId: form.pillarId||undefined, n:5, searchQuery, noSearch, promptOverride: promptText }) }); if(!res.ok){ alert('Не удалось сгенерировать'); return;} await load(); }}>Сгенерировать 5 постов</button>
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((p)=> (
          <div key={p.id} className="grid gap-2">
            <PostCard post={p} onChanged={load} onToggleComments={()=>setOpenComments(prev=>({ ...prev, [p.id]: !prev[p.id] }))} />
            {openComments[p.id] && (
            <div className="panel rounded-lg p-3 grid gap-2">
              <div className="font-semibold text-sm">Комментарий / задача</div>
              <textarea className="bg-background rounded p-2 h-20" value={drafts[p.id]?.text||''} onChange={(e)=>setDraft(p.id,{ text: e.target.value })} placeholder="Текст комментария" />
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!drafts[p.id]?.isTask} onChange={(e)=>setDraft(p.id,{ isTask: e.target.checked })} /> это задача</label>
                <select className="select-compact-sm" value={drafts[p.id]?.taskStatus||''} onChange={(e)=>setDraft(p.id,{ taskStatus: e.target.value as 'OPEN'|'IN_PROGRESS'|'DONE'|'' })} disabled={!drafts[p.id]?.isTask}>
                  <option value="">Статус задачи…</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="DONE">DONE</option>
                </select>
                <input className="select-compact-sm" type="datetime-local" value={drafts[p.id]?.dueAt||''} onChange={(e)=>setDraft(p.id,{ dueAt: e.target.value ? new Date(e.target.value).toISOString(): undefined })} disabled={!drafts[p.id]?.isTask} />
                <button className="btn-glass btn-sm" onClick={async ()=>{
                  const d = drafts[p.id];
                  if (!d?.text || !d.text.trim()) { alert('Введите текст'); return; }
                  await fetch(`/api/posts/${p.id}/comments`, { method:'POST', headers:{ 'content-type':'application/json', 'x-admin-token': token }, body: JSON.stringify({ text: d.text, isTask: !!d.isTask, taskStatus: d.taskStatus || undefined, dueAt: d.dueAt }) });
                  setDraft(p.id, { text: '', isTask: false, taskStatus: '', dueAt: undefined });
                  await load();
                }}>Добавить</button>
              </div>
            </div>
            )}
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="glass rounded-xl p-4 w-[min(700px,95vw)] grid gap-3">
            <div className="text-lg font-semibold">Новый пост</div>
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
              <button className="btn-glass btn-sm" onClick={()=>setModalOpen(false)}>Отмена</button>
              <button className="btn-glass btn-sm" disabled={!form.title.trim()} onClick={async ()=>{
                // duplicate hint (soft)
                if (form.title.trim().length > 3) {
                  const q = encodeURIComponent(form.title.trim());
                  const r = await fetch(`/api/posts?search=${q}&pillarId=${encodeURIComponent(form.pillarId||'')}&pageSize=5`);
                  const d = await r.json().catch(()=>({ items: [] }));
                  if (Array.isArray(d.items) && d.items.length) {
                    const proceed = typeof window!=='undefined' ? window.confirm(`Найдены похожие посты (${d.items.length}). Все равно создать?`) : true;
                    if (!proceed) return;
                  }
                }
                const res = await fetch('/api/posts', { method: 'POST', headers: { 'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ ...form, source: 'manual' }) });
                if (!res.ok) { alert('Не удалось создать пост'); return; }
                setModalOpen(false); setForm({ title:'', body:'' }); await load();
              }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {promptOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="glass rounded-xl p-4 w-[min(900px,95vw)]">
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
            <textarea value={promptText} onChange={(e)=>setPromptText(e.target.value)} className="w-full h-48 rounded p-2 bg-background mt-2" />
            <div className="mt-3 font-semibold">Поисковый запрос</div>
            <input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full h-10 rounded p-2 bg-background" placeholder="Например: scientific B2B sales AND AI last 90 days" disabled={noSearch} />
            <label className="mt-2 flex items-center gap-2 text-sm opacity-80">
              <input type="checkbox" checked={noSearch} onChange={(e)=>setNoSearch(e.target.checked)} />
              Исключить поисковый запрос (генерация только по промпту)
            </label>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="btn-glass btn-sm" onClick={()=>setPromptOpen(false)}>Закрыть</button>
              <button className="btn-glass btn-sm" onClick={async ()=>{ await fetch('/api/settings/prompts',{ method:'POST', headers:{'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ contextPrompt, toneOfVoicePrompt: tovPrompt }) }); }}>Сохранить контекст и TOV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
