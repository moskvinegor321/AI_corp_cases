"use client";
import { useEffect, useMemo, useState } from "react";
import { PostCard, type Post } from "@/components/PostCard";

export default function PostsPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; topic?: string; pillarId?: string }>({ title: "", body: "" });
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const load = async () => {
    const r = await fetch(`/api/posts`);
    const d = await r.json();
    setItems(d.items || []);
  };
  useEffect(() => { load(); fetch('/api/pillars').then(r=>r.json()).then(d=>setPillars(d.pillars||[])); }, []);

  const canSave = useMemo(() => (form.title || '').trim().length > 0, [form.title]);

  return (
    <div className="p-6 grid gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Посты</div>
        <button className="btn-glass btn-sm" onClick={()=>setModalOpen(true)}>Добавить пост</button>
      </div>
      <div className="grid gap-3">
        {items.map((p) => (
          <PostCard key={p.id} post={p} onChanged={load} />
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
              <button className="btn-glass btn-sm" disabled={!canSave} onClick={async ()=>{
                const token = (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || '';
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


