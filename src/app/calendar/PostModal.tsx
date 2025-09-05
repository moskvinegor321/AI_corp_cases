"use client";
import React, { useEffect, useMemo, useState } from "react";
import { PostCard, type Post } from "@/components/PostCard";

export default function PostModal({ post, onClose, onChanged, adminToken }: { post: Post; onClose: ()=>void; onChanged: ()=>void; adminToken?: string }){
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; topic?: string; pillarId?: string }>({ title: post.title, body: post.body || "", topic: post.topic || undefined, pillarId: post.pillar?.id || undefined });
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const token = useMemo(() => adminToken || (typeof window !== 'undefined' ? (localStorage.getItem('aion_admin_token') || '') : '') || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "", [adminToken]);

  useEffect(() => { fetch('/api/pillars').then(r=>r.json()).then(d=> setPillars(d.pillars || [])); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="relative max-w-[1100px] w-[95vw]" onClick={(e)=> e.stopPropagation()}>
        <button
          aria-label="Закрыть"
          className="btn-glass btn-sm absolute -top-3 -right-3"
          onClick={onClose}
        >
          ✕
        </button>
        <PostCard post={post} onChanged={onChanged} onEdit={() => { setEditing(true); setForm({ title: post.title, body: post.body || "", topic: post.topic || undefined, pillarId: post.pillar?.id || undefined }); }} adminToken={adminToken} />

        {editing && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center">
            <div className="panel rounded-xl p-4 w-[min(700px,95vw)] grid gap-3">
              <div className="text-lg font-semibold">Редактировать пост</div>
              <label className="grid gap-1 text-sm">
                <span>Заголовок</span>
                <input className="bg-background rounded p-2" value={form.title} onChange={(e)=> setForm(f=>({ ...f, title: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Текст</span>
                <textarea className="bg-background rounded p-2 h-40" value={form.body} onChange={(e)=> setForm(f=> ({ ...f, body: e.target.value }))} />
              </label>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span>Тема</span>
                  <input className="bg-background rounded p-2" value={form.topic||''} onChange={(e)=> setForm(f=> ({ ...f, topic: e.target.value }))} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>Страница/Столп</span>
                  <select className="bg-background rounded p-2" value={form.pillarId||''} onChange={(e)=> setForm(f=> ({ ...f, pillarId: e.target.value || undefined }))}>
                    <option value="">—</option>
                    {pillars.map(p=> (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn-glass btn-sm" onClick={()=> setEditing(false)}>Отмена</button>
                <button className="btn-glass btn-sm" disabled={!form.title.trim()} onClick={async ()=>{
                  const res = await fetch(`/api/posts/${post.id}`, { method:'PATCH', headers: { 'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ title: form.title, body: form.body, topic: form.topic, pillarId: form.pillarId }) });
                  if (!res.ok) { alert('Не удалось обновить пост'); return; }
                  setEditing(false);
                  onChanged();
                }}>Сохранить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


