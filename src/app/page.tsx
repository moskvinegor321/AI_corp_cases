"use client";
import { useEffect, useMemo, useState } from 'react';
import { PostCard, type Post } from '@/components/PostCard';

type CommentDraft = { text: string; isTask: boolean; taskStatus: 'OPEN'|'IN_PROGRESS'|'DONE'|''; dueAt?: string };

export default function Home() {
  const [items, setItems] = useState<Post[]>([]);
  const [adminToken, setAdminToken] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; topic?: string; pillarId?: string }>({ title: '', body: '' });
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CommentDraft>>({});

  const token = useMemo(() => adminToken || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || '', [adminToken]);

  const load = async () => {
    const r = await fetch(`/api/posts`);
    const d = await r.json();
    setItems(d.items || []);
  };

  useEffect(() => {
    load();
    fetch('/api/pillars').then(r=>r.json()).then(d=>setPillars(d.pillars||[]));
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') : '';
    if (saved) setAdminToken(saved);
  }, []);

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
          <button className="btn-glass btn-sm" onClick={()=>setModalOpen(true)}>Добавить пост</button>
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((p)=> (
          <div key={p.id} className="grid gap-2">
            <PostCard post={p} onChanged={load} />
            <div className="panel rounded-lg p-3 grid gap-2">
              <div className="font-semibold text-sm">Комментарий / задача</div>
              <textarea className="bg-background rounded p-2 h-20" value={drafts[p.id]?.text||''} onChange={(e)=>setDraft(p.id,{ text: e.target.value })} placeholder="Текст комментария" />
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!drafts[p.id]?.isTask} onChange={(e)=>setDraft(p.id,{ isTask: e.target.checked })} /> это задача</label>
                <select className="select-compact-sm" value={drafts[p.id]?.taskStatus||''} onChange={(e)=>setDraft(p.id,{ taskStatus: (e.target.value as any) })} disabled={!drafts[p.id]?.isTask}>
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
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="glass rounded-xl p-4 w-[min(700px,95vw)] grid gap-3">
            <div className="text-lg font-semibold">Новый пост</div>
            <label className="grid gap-1 text-sm">
              <span>Заголовок</span>
              <input className="bg-background rounded p-2" value={form.title} onChange={(e)=>setForm(f=>({...f, title: e.target.value}))} />
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
                const res = await fetch('/api/posts', { method: 'POST', headers: { 'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ ...form, source: 'manual' }) });
                if (!res.ok) { alert('Не удалось создать пост'); return; }
                setModalOpen(false); setForm({ title:'', body:'' }); await load();
              }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
