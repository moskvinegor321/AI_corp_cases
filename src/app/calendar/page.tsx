"use client";
import { useEffect, useMemo, useState } from "react";
import { usePostFilters, type PostStatus } from "@/lib/filters/posts";
import type { Post } from "@/components/PostCard";
import PostModal from "./PostModal";

function startOfMonth(d: Date) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); return x; }
function endOfMonth(d: Date) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)); return x; }
function addMonths(d: Date, m: number) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, d.getUTCDate())); return x; }

export default function CalendarPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [adminToken, setAdminToken] = useState<string>("");
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const { filters, setStatuses, setRange, setPillar } = usePostFilters({ statuses: ["READY_TO_PUBLISH", "PUBLISHED"] as PostStatus[] });
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [pillarsOpen, setPillarsOpen] = useState(false);
  const [pillarIds, setPillarIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aion_admin_token') : '';
    if (saved) setAdminToken(saved);
  }, []);

  // keep filters range in sync with selected month when user didn't set a manual range
  useEffect(() => {
    const from = startOfMonth(month).toISOString();
    const to = endOfMonth(month).toISOString();
    setRange(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const load = async () => {
    const params = new URLSearchParams();
    if (filters.statuses?.length) params.set("status", JSON.stringify(filters.statuses));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (pillarIds.length) params.set('pillarId', JSON.stringify(pillarIds));
    document.dispatchEvent(new Event('aion:load:start'));
    try {
      const r = await fetch(`/api/posts?${params.toString()}`);
      const d = await r.json();
      setItems(d.items || []);
      const rp = await fetch('/api/pillars'); const dp = await rp.json(); setPillars(dp.pillars||[]);
    } finally {
      document.dispatchEvent(new Event('aion:load:end'));
    }
  };
  useEffect(() => { load(); }, [JSON.stringify(filters)]);

  // Build month grid days
  const days = useMemo(() => {
    const first = startOfMonth(month); // UTC
    const startWeekday = (first.getUTCDay() + 6) % 7; // make Monday=0
    const start = new Date(first);
    start.setUTCDate(first.getUTCDate() - startWeekday);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      out.push(d);
    }
    return out;
  }, [month]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of items) {
      const dateIso = (p.status === 'PUBLISHED' ? p.publishedAt : p.scheduledAt) || null;
      if (!dateIso) continue;
      const key = new Date(dateIso).toISOString().slice(0, 10);
      const arr = map.get(key) || [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const tokenHeader = () => ({ 'x-admin-token': (adminToken || (process.env as unknown as { NEXT_PUBLIC_ADMIN_TOKEN?: string }).NEXT_PUBLIC_ADMIN_TOKEN || '') });

  return (
    <div className="p-6 grid gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xl font-semibold">Календарь</div>
        <button className="btn-glass btn-sm" onClick={()=>setMonth(prev=>addMonths(prev,-1))}>{"<"}</button>
        <div className="chip px-3 py-1 rounded">{month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
        <button className="btn-glass btn-sm" onClick={()=>setMonth(prev=>addMonths(prev,1))}>{">"}</button>
        <div className="relative">
          <button className="btn-glass btn-sm" onClick={()=> setStatusOpen(v=>!v)}>
            {filters.statuses?.length ? `Статусы (${filters.statuses.length})` : 'Статусы'}
          </button>
          {statusOpen && (
            <div className="absolute top-full left-0 mt-2 popover-panel p-3 z-10 min-w-[240px] grid gap-2">
              {([
                {code:'READY_TO_PUBLISH', label:'Запланирован'},
                {code:'PUBLISHED', label:'Опубликован'},
                {code:'NEEDS_REVIEW', label:'Ревью'},
                {code:'DRAFT', label:'Разбор'},
                {code:'REJECTED', label:'Отклонён'},
              ] as Array<{code: PostStatus; label: string}>).map(({code,label}) => (
                <label key={code} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={filters.statuses.includes(code)} onChange={(e)=>{
                    const next = e.target.checked ? [...filters.statuses, code] : filters.statuses.filter(x=>x!==code);
                    setStatuses(next);
                  }} /> {label}
                </label>
              ))}
              <div className="flex gap-2 justify-end pt-1">
                <button className="btn-glass btn-sm" onClick={()=>{ setStatuses([]); setStatusOpen(false); }}>Сбросить</button>
                <button className="btn-glass btn-sm" onClick={()=> setStatusOpen(false)}>Готово</button>
              </div>
            </div>
          )}
        </div>
        <select className="select-compact-sm" value={filters.pillarId||''} onChange={(e)=> setPillar(e.target.value||undefined)}>
          <option value="">Все страницы</option>
          {pillars.map(p=> (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <div className="relative">
          <button className="btn-glass btn-sm" onClick={()=> setPillarsOpen(v=>!v)}>
            {pillarIds.length ? `Страницы (${pillarIds.length})` : 'Все страницы'}
          </button>
          {pillarsOpen && (
            <div className="absolute top-full left-0 mt-2 popover-panel p-3 z-10 min-w-[240px] grid gap-2">
              {pillars.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pillarIds.includes(p.id)} onChange={(e)=>{
                    setPillarIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(x=>x!==p.id));
                  }} /> {p.name}
                </label>
              ))}
              <div className="flex gap-2 justify-end pt-1">
                <button className="btn-glass btn-sm" onClick={()=>{ setPillarIds([]); setPillarsOpen(false); }}>Сбросить</button>
                <button className="btn-glass btn-sm" onClick={()=> setPillarsOpen(false)}>Готово</button>
              </div>
            </div>
          )}
        </div>
        <input className="select-compact-sm" type="date" value={filters.from?.slice(0,10) || ""} onChange={(e) => setRange(e.target.value? new Date(e.target.value).toISOString(): undefined, filters.to)} />
        <input className="select-compact-sm" type="date" value={filters.to?.slice(0,10) || ""} onChange={(e) => setRange(filters.from, e.target.value? new Date(e.target.value).toISOString(): undefined)} />
      </div>

      <div className="glass rounded-xl p-3">
        <div className="grid grid-cols-7 gap-2 text-xs opacity-80 mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (<div key={d} className="px-1">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d,i)=>{
            const isoDay = d.toISOString().slice(0,10);
            const inMonth = d.getUTCMonth() === month.getUTCMonth();
            const posts = postsByDay.get(isoDay) || [];
            return (
              <div key={i} className={`rounded border chip p-2 min-h-[110px] flex flex-col gap-1 ${inMonth? 'opacity-100':'opacity-50'}`}
                   onDragOver={(e)=>{e.preventDefault();}}
                   onDrop={async (e)=>{
                     try {
                       const data = JSON.parse(e.dataTransfer.getData('text/plain')) as { id: string };
                       const ok = typeof window!=='undefined' ? window.confirm('Перенести публикацию на этот день?') : true;
                       if (!ok) return;
                       const schedule = new Date(`${isoDay}T09:00:00.000Z`);
                       document.dispatchEvent(new Event('aion:load:start'));
                       await fetch(`/api/posts/${data.id}/status`, { method:'POST', headers: { 'content-type':'application/json', ...tokenHeader() }, body: JSON.stringify({ status:'READY_TO_PUBLISH', scheduledAt: schedule.toISOString() }) });
                       await load();
                     } catch {} finally { document.dispatchEvent(new Event('aion:load:end')); }
                   }}>
                <div className="text-xs font-medium opacity-80">{d.getUTCDate()}</div>
                <div className="flex flex-col gap-1">
                  {posts.slice(0,3).map((p)=> (
                    <div key={p.id} className={`text-[11px] px-2 py-1 rounded ${p.status==='PUBLISHED'?'border-green-600 text-green-500':'border-yellow-600 text-yellow-500'} chip cursor-pointer`}
                      draggable={p.status==='READY_TO_PUBLISH'}
                      onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', JSON.stringify({ id: p.id })); }}
                      onClick={()=> setOpenPost(p)}
                    >
                      {p.title}
                      {p.pillar?.name ? ` — ${p.pillar.name}` : ''}
                    </div>
                  ))}
                  {posts.length>3 && (<div className="text-[10px] opacity-70">+{posts.length-3} ещё</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {openPost && (
        <>
          <div className="fixed inset-0 bg-black/70 z-40" onClick={()=> setOpenPost(null)} />
          <PostModal post={openPost} onClose={()=> setOpenPost(null)} onChanged={()=>{ setOpenPost(null); load(); }} />
        </>
      )}
    </div>
  );
}


