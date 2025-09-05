"use client";
import { useRef, useState } from "react";

export type Post = {
  id: string;
  title: string;
  status: "DRAFT" | "NEEDS_REVIEW" | "READY_TO_PUBLISH" | "PUBLISHED" | "REJECTED";
  scheduledAt?: string | null;
  publishedAt?: string | null;
  reviewDueAt?: string | null;
  topic?: string | null;
  pillar?: { id: string; name: string } | null;
  body?: string | null;
  source?: string | null;
  attachments?: Array<{ id: string; name: string; url: string; mimeType?: string | null; sizeBytes?: number | null }>;
  comments?: Array<{ id: string; text: string; isTask: boolean; taskStatus?: 'OPEN'|'IN_PROGRESS'|'DONE'|null; dueAt?: string | null; createdAt: string; assignee?: string | null }>;
};

export function PostCard({ post, onChanged, onToggleComments: _onToggleComments, onEdit, adminToken }: { post: Post; onChanged?: () => void; onToggleComments?: () => void; onEdit?: (post: Post) => void; adminToken?: string }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [picker, setPicker] = useState<null | 'review' | 'schedule' | 'publish'>(null);
  const [dt, setDt] = useState<string>('');
  const [editSchedule, setEditSchedule] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isTask, setIsTask] = useState(false);
  const [taskStatus, setTaskStatus] = useState<''|'OPEN'|'IN_PROGRESS'|'DONE'>('');
  const [taskDueAt, setTaskDueAt] = useState<string>('');
  const [assignee, setAssignee] = useState<string>('');
  const [statusEdit, setStatusEdit] = useState<{ id: string; value: 'OPEN'|'IN_PROGRESS'|'DONE' } | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const statusLabel: Record<Post["status"], string> = {
    DRAFT: 'Разбор',
    NEEDS_REVIEW: 'Ревью',
    READY_TO_PUBLISH: 'Запланирован',
    PUBLISHED: 'Опубликован',
    REJECTED: 'Отклонён',
  } as const;
  const statusClass: Record<Post["status"], string> = {
    DRAFT: 'bg-gray-500/30 text-gray-300',
    NEEDS_REVIEW: 'bg-indigo-500/20 text-indigo-300',
    READY_TO_PUBLISH: 'bg-amber-500/20 text-amber-300',
    PUBLISHED: 'bg-green-600/20 text-green-400',
    REJECTED: 'bg-red-600/20 text-red-400',
  } as const;

  const resolveKind = (mime?: string | null, name?: string) => {
    const ext = (name || '').split('.').pop()?.toLowerCase() || '';
    if ((mime||'').startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return 'image';
    if ((mime||'').startsWith('video/') || ['mp4','mov','webm','avi','mkv'].includes(ext)) return 'video';
    if ((mime||'').startsWith('audio/') || ['mp3','wav','aac','ogg'].includes(ext)) return 'audio';
    if ((mime||'').startsWith('text/') || ['txt','md','csv','ts','js','json'].includes(ext)) return 'text';
    if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
    return 'file';
  };
  const callStatus = async (status: Post["status"], extra?: { scheduledAt?: string; reviewDueAt?: string; publishedAt?: string }) => {
    setLoading(true);
    try {
      const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') || '' : '') || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "";
      const res = await fetch(`/api/posts/${post.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) {
        let msg = 'Не удалось изменить статус';
        try { const j = await res.json(); if (j?.error) msg = j.error as string; } catch {}
        alert(msg);
      } else {
        onChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const onChooseFile = () => fileInputRef.current?.click();
  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // basic validation: 100MB limit
    const maxBytes = 100 * 1024 * 1024;
    if (f.size > maxBytes) { alert('Файл больше 100MB'); e.currentTarget.value = ''; return; }
    setLoading(true);
    try {
      const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') || '' : '') || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "";
      document.dispatchEvent(new Event('aion:load:start'));
      const signRes = await fetch(`/api/uploads/supabase`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ filename: f.name, contentType: f.type || "application/octet-stream", prefix: `posts/${post.id}` }),
      });
      const { url, publicUrl } = await signRes.json();
      if (!url) throw new Error("签名 не получен");
      // Try PUT first (S3-like); if 400/405, fallback to POST
      let uploaded = false;
      try {
        const putRes = await fetch(url, { method: "PUT", headers: { "content-type": f.type || "application/octet-stream" }, body: f });
        if (putRes.ok) uploaded = true;
      } catch {}
      if (!uploaded) {
        const postRes = await fetch(url, { method: "POST", headers: { "content-type": f.type || "application/octet-stream" }, body: f });
        if (!postRes.ok) throw new Error('upload failed');
      }
      await fetch(`/api/posts/${post.id}/attachments`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ name: f.name, url: publicUrl, mimeType: f.type, sizeBytes: f.size }),
      });
      onChanged?.();
    } catch {
      alert("Не удалось загрузить файл");
    } finally {
      document.dispatchEvent(new Event('aion:load:end'));
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="glass rounded-xl p-3 grid grid-cols-1 md:grid-cols-[1fr_380px] gap-3 items-start">
      <div className="panel rounded-lg p-3 grid gap-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">{post.title}</div>
          <div className="text-xs opacity-70 flex items-center gap-2 relative">
            <span className={`chip px-2 py-0.5 rounded ${statusClass[post.status]}`}>{statusLabel[post.status]}</span>
            {post.status === 'READY_TO_PUBLISH' && !editSchedule && (
              <>
                <span
                  className="opacity-60 cursor-pointer hover:underline"
                  title="Изменить дату/время публикации"
                  onClick={() => {
                    const base = post.scheduledAt ? new Date(post.scheduledAt) : new Date();
                    const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16);
                    setDt(local);
                    setEditSchedule(true);
                  }}
                >{post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : '—'}</span>
              </>
            )}
            {post.status === 'READY_TO_PUBLISH' && editSchedule && null}
          </div>
        </div>
        <div className="text-xs opacity-80 flex gap-3 flex-wrap">
          {post.source && <span className="chip px-2 py-0.5 rounded text-xs">{post.source}</span>}
          {post.pillar?.name && <span>Столп: {post.pillar.name}</span>}
          {post.topic && <span>Тема: {post.topic}</span>}
          {post.scheduledAt && <span>Запланировано: {new Date(post.scheduledAt).toLocaleString()}</span>}
          {post.publishedAt && <span>Опубликовано: {new Date(post.publishedAt).toLocaleString()}</span>}
          {post.reviewDueAt && <span>Разбор до: {new Date(post.reviewDueAt).toLocaleString()}</span>}
        </div>
        {post.body && (
          <div className="text-sm opacity-90 whitespace-pre-line" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.body}</div>
        )}
        <div className={`grid gap-2 mt-2 ${((post.comments && post.comments.length) || commentsOpen) ? 'border-t border-white/10 pt-2' : ''}`}>
          {!!(post.comments && post.comments.length) && (
            <div className="panel rounded-lg p-2 grid gap-1">
              {post.comments.slice(0, 10).map((c) => {
                const currentVal = (statusEdit?.id === c.id ? statusEdit.value : (c.taskStatus || 'OPEN')) as 'OPEN'|'IN_PROGRESS'|'DONE';
                return (
                  <div key={c.id} className="text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="chip px-2 py-0.5 rounded text-[10px]">{c.isTask ? currentVal : 'comment'}</span>
                      <span className="truncate">{c.text}</span>
                      {c.assignee && <span className="opacity-60 whitespace-nowrap">→ {c.assignee}</span>}
                      <span className="opacity-60 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</span>
                      {c.dueAt && <span className="opacity-60 whitespace-nowrap">⏰ {new Date(c.dueAt).toLocaleString()}</span>}
                    </div>
                    {c.isTask && (
                      <span className="flex items-center gap-1">
                        <select className="select-compact-sm" value={currentVal} onChange={(e)=> setStatusEdit({ id: c.id, value: e.target.value as 'OPEN'|'IN_PROGRESS'|'DONE' })}>
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="DONE">DONE</option>
                        </select>
                        <button className="btn-glass btn-sm" onClick={async ()=>{
                          const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') || '' : '') || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "";
                          const val = (statusEdit?.id === c.id ? statusEdit.value : (c.taskStatus || 'OPEN')) as 'OPEN'|'IN_PROGRESS'|'DONE';
                          await fetch(`/api/posts/${post.id}/comments/${c.id}`, { method:'PATCH', headers:{ 'content-type':'application/json','x-admin-token': token }, body: JSON.stringify({ taskStatus: val }) });
                          setStatusEdit(null);
                          onChanged?.();
                        }}>OK</button>
                        <button className="btn-glass btn-sm" style={{ color: '#f87171' }} title="Удалить" onClick={async ()=>{
                          const ok = typeof window !== 'undefined' ? window.confirm('Удалить задачу?') : true;
                          if (!ok) return;
                          const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') || '' : '') || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "";
                          await fetch(`/api/posts/${post.id}/comments/${c.id}`, { method:'DELETE', headers:{ 'x-admin-token': token } });
                          onChanged?.();
                        }}>🗑</button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {commentsOpen && (
            <div className="grid gap-2">
              <div className="font-semibold text-sm">Комментарий / задача</div>
              <textarea className="bg-background rounded p-2 h-20" value={commentText} onChange={(e)=>setCommentText(e.target.value)} placeholder="Текст комментария" />
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={isTask} onChange={(e)=>setIsTask(e.target.checked)} /> это задача</label>
                <select className="select-compact-sm" value={taskStatus} onChange={(e)=>setTaskStatus(e.target.value as 'OPEN'|'IN_PROGRESS'|'DONE'|'')} disabled={!isTask}>
                  <option value="">Статус задачи…</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="DONE">DONE</option>
                </select>
                <select className="select-compact-sm" value={assignee} onChange={(e)=> setAssignee(e.target.value)} disabled={!isTask}>
                  <option value="">Исполнитель…</option>
                  <option value="Егор">Егор</option>
                  <option value="Коля">Коля</option>
                  <option value="Лена">Лена</option>
                </select>
                <input className="select-compact-sm" type="datetime-local" value={taskDueAt} onChange={(e)=>setTaskDueAt(e.target.value)} disabled={!isTask} />
                <button className="btn-glass btn-sm" disabled={addingTask} onClick={async ()=>{
                  if (addingTask) return;
                  if (!commentText.trim()) { alert('Введите текст'); return; }
                  setAddingTask(true);
                  const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') || '' : '') || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "";
                  const payload: Record<string, unknown> = { text: commentText, isTask };
                  if (taskStatus) payload.taskStatus = taskStatus;
                  if (taskDueAt) payload.dueAt = new Date(taskDueAt).toISOString();
                  if (assignee) payload.assignee = assignee;
                  try {
                    await fetch(`/api/posts/${post.id}/comments`, { method:'POST', headers:{ 'content-type':'application/json', 'x-admin-token': token }, body: JSON.stringify(payload) });
                    setCommentText(''); setIsTask(false); setTaskStatus(''); setTaskDueAt(''); setAssignee('');
                    onChanged?.();
                  } finally {
                    setAddingTask(false);
                  }
                }}>{addingTask ? 'Добавление…' : 'Добавить'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="relative flex flex-col gap-2 md:items-end">
        <div className="flex gap-2 flex-wrap md:justify-end text-[10px]">
        <button className="btn-glass bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 whitespace-nowrap" disabled={loading} onClick={() => {
          // default now + 1 hour
          const base = new Date();
          base.setMinutes(base.getMinutes() + 60);
          const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0,16);
          setDt(local);
          setPicker('review');
        }}>На ревью</button>
        <button className="btn-glass bg-amber-500/20 text-amber-300 px-1.5 py-0.5 whitespace-nowrap" disabled={loading} onClick={() => {
          const base = post.scheduledAt ? new Date(post.scheduledAt) : new Date();
          const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0,16);
          setDt(local);
          setPicker('schedule');
        }}>Запланировать</button>
        <button className="btn-glass bg-green-600/20 text-green-400 px-1.5 py-0.5 whitespace-nowrap" disabled={loading} onClick={() => {
          const base = new Date();
          const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0,16);
          setDt(local);
          setPicker('publish');
        }}>Опубликовано</button>
        <button className="btn-glass bg-red-600/20 text-red-400 px-1.5 py-0.5 whitespace-nowrap" disabled={loading} onClick={async () => { await callStatus('REJECTED'); }}>Отклонить</button>
        
        </div>
        {picker && (
          <>
            <div className="fixed inset-0 bg-black/90 z-40" />
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="panel rounded-xl p-3 w-64 grid gap-2">
                <div className="text-xs opacity-80">{picker === 'schedule' ? 'Дата/время публикации' : picker === 'publish' ? 'Дата/время публикации' : 'Крайний срок ревью'}</div>
                <input className="bg-background rounded p-2" type="datetime-local" value={dt} onChange={(e)=>setDt(e.target.value)} />
                <div className="flex gap-2 justify-end">
                  <button className="btn-glass btn-sm" onClick={()=>setPicker(null)}>Отмена</button>
                  <button className="btn-glass btn-sm" onClick={async ()=>{
                    if (!dt) return;
                    const iso = new Date(dt).toISOString();
                    if (picker === 'schedule') await callStatus('READY_TO_PUBLISH', { scheduledAt: iso });
                    if (picker === 'review') await callStatus('NEEDS_REVIEW', { reviewDueAt: iso });
                    if (picker === 'publish') await callStatus('PUBLISHED', { publishedAt: iso });
                    setPicker(null);
                  }}>Сохранить</button>
                </div>
              </div>
            </div>
          </>
        )}
        {editSchedule && (
          <>
            <div className="fixed inset-0 bg-black/90 z-[100]" />
            <div className="fixed inset-0 z-[110] flex items-center justify-center">
              <div className="panel rounded-xl p-3 w-64 grid gap-2">
                <div className="text-xs opacity-80">Дата/время публикации</div>
                <input className="bg-background rounded p-2" type="datetime-local" value={dt} onChange={(e)=>setDt(e.target.value)} />
                <div className="flex gap-2 justify-end">
                  <button className="btn-glass btn-sm" onClick={()=>setEditSchedule(false)}>Отмена</button>
                  <button className="btn-glass btn-sm" onClick={async ()=>{
                    if (!dt) return;
                    const iso = new Date(dt).toISOString();
                    await callStatus('READY_TO_PUBLISH', { scheduledAt: iso });
                    setEditSchedule(false);
                  }}>Сохранить</button>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="flex gap-2 flex-wrap md:justify-end opacity-90">
          <button className="btn-glass text-[10px] px-2 py-0.5 whitespace-nowrap" onClick={()=>setCommentsOpen((v)=>!v)}>Комментарии</button>
          <button className="btn-glass text-[10px] px-2 py-0.5 whitespace-nowrap" disabled={loading} onClick={onChooseFile}>Добавить файл</button>
          <button className="btn-glass text-[10px] px-2 py-0.5 whitespace-nowrap" onClick={() => onEdit?.(post)}>Редактировать</button>
          <button className="btn-glass text-[10px] px-2 py-0.5 whitespace-nowrap" onClick={async ()=>{
            const ok = typeof window!=='undefined' ? window.confirm('Удалить пост? Это действие необратимо.') : true;
            if (!ok) return;
            setLoading(true);
            try {
              const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') || '' : '') || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "";
              await fetch(`/api/posts/${post.id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
              onChanged?.();
            } finally { setLoading(false); }
          }}>Удалить</button>
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={onFileSelected} />
        </div>
      </div>
      {post.attachments && post.attachments.length > 0 && (
        <div className="panel rounded-lg p-2 grid gap-1">
          {post.attachments.map((a) => (
            <div key={a.id} className="text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="chip px-2 py-0.5 rounded text-[10px]">{resolveKind(a.mimeType, a.name)}</span>
                <a href={a.url} target="_blank" rel="noreferrer" className="truncate hover:underline">{a.name}</a>
                {typeof a.sizeBytes === 'number' && <span className="opacity-60 whitespace-nowrap">{(a.sizeBytes/1024/1024).toFixed(1)} MB</span>}
              </div>
              <button className="btn-glass btn-sm" onClick={async ()=>{
                const token = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') || '' : '') || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || "";
                const ok = typeof window !== 'undefined' ? window.confirm('Удалить файл?') : true;
                if (!ok) return;
                await fetch(`/api/posts/${post.id}/attachments/${a.id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
                onChanged?.();
              }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


