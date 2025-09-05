"use client";
import { useEffect, useMemo, useState } from "react";
import { usePostFilters, type PostStatus } from "@/lib/filters/posts";
import type { Post } from "@/components/PostCard";
import PostModal from "@/app/calendar/PostModal";

export default function TablePage() {
  const [items, setItems] = useState<Post[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const [view, setView] = useState<'matrix'|'list'>('matrix');
  const { filters, setStatuses, setRange } = usePostFilters();
  const [statusOpen, setStatusOpen] = useState(false);
  const [pillarsOpen, setPillarsOpen] = useState(false);
  const [pillarIds, setPillarIds] = useState<string[]>([]);
  const [openPost, setOpenPost] = useState<Post | null>(null);

  const load = async () => {
    const params = new URLSearchParams();
    if (filters.statuses?.length) params.set('status', JSON.stringify(filters.statuses));
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (pillarIds.length) params.set('pillarId', JSON.stringify(pillarIds));
    document.dispatchEvent(new Event('aion:load:start'));
    try {
      const r = await fetch(`/api/posts?${params.toString()}`); const d = await r.json(); setItems(d.items || []);
      const rp = await fetch(`/api/pillars`); const dp = await rp.json(); setPillars(dp.pillars || []);
    } finally {
      document.dispatchEvent(new Event('aion:load:end'));
    }
  };
  useEffect(() => { load(); }, [filters.from, filters.to, JSON.stringify(filters.statuses)]);

  // const topics = useMemo(() => {
  //   return Array.from(new Set(items.map(i => i.topic || '').filter(Boolean))).sort();
  // }, [items]);

  return (
    <div className="p-6 grid gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xl font-semibold">Таблица</div>
        <select className="select-compact-sm" value={view} onChange={(e)=>setView(e.target.value as 'matrix'|'list')}>
          <option value="matrix">Матрица</option>
          <option value="list">Список</option>
        </select>
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
        <div className="relative">
          <button className="btn-glass btn-sm" onClick={()=> setPillarsOpen(v=>!v)}>
            {pillarIds.length ? `Столпы (${pillarIds.length})` : 'Все столпы'}
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
        <input className="select-compact-sm" type="date" value={filters.from?.slice(0,10) || ""} onChange={(e)=>setRange(e.target.value? new Date(e.target.value).toISOString(): undefined, filters.to)} />
        <input className="select-compact-sm" type="date" value={filters.to?.slice(0,10) || ""} onChange={(e)=>setRange(filters.from, e.target.value? new Date(e.target.value).toISOString(): undefined)} />
      </div>

      {view === 'matrix' ? (
        <div className="overflow-auto">
          <table className="w-full text-sm glass rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left p-3">Дата</th>
                {pillars.map(p => (<th key={p.id} className="text-left p-3">{p.name}</th>))}
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(items.map(i => (i.scheduledAt || i.publishedAt ? new Date(i.scheduledAt||i.publishedAt!).toISOString().slice(0,10) : '—')))).sort().map(day => (
                <tr key={day} className="align-top border-t border-white/10">
                  <td className="p-3 font-medium">{day}</td>
                  {pillars.map(p => (
                    <td key={p.id} className="p-3">
                      <div className="grid gap-1">
                        {items.filter(i => (i.pillar?.id===p.id) && ((i.scheduledAt||i.publishedAt) && new Date(i.scheduledAt||i.publishedAt!).toISOString().slice(0,10)===day)).map(i => {
                          const statusLabel: Record<NonNullable<Post['status']>, string> = { DRAFT:'Разбор', NEEDS_REVIEW:'Ревью', READY_TO_PUBLISH:'Запланирован', PUBLISHED:'Опубликован', REJECTED:'Отклонён' } as const;
                          const statusCls: Record<NonNullable<Post['status']>, string> = {
                            DRAFT:'bg-gray-500/20 text-gray-300 border-gray-500/30',
                            NEEDS_REVIEW:'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                            READY_TO_PUBLISH:'bg-amber-500/20 text-amber-300 border-amber-500/30',
                            PUBLISHED:'bg-green-600/20 text-green-400 border-green-600/30',
                            REJECTED:'bg-red-600/20 text-red-400 border-red-600/30',
                          } as const;
                          return (
                            <div key={i.id} className="panel rounded px-2 py-1 hover:bg-white/10 cursor-pointer grid gap-1" onClick={()=> setOpenPost(i)}>
                              <div className="flex items-center justify-between gap-2">
                                <span className={`chip px-1.5 py-0.5 rounded text-[10px] ${statusCls[i.status]}`}>{statusLabel[i.status]}</span>
                              </div>
                              <div className="text-xs font-medium truncate" title={i.title}>{i.title}</div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm glass rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left p-3">Столп</th>
                <th className="text-left p-3">Тема</th>
                <th className="text-left p-3">Заголовок</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Дата</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="p-3">{i.pillar?.name || ''}</td>
                  <td className="p-3">{i.topic || ''}</td>
                  <td className="p-3"><span className="hover:underline cursor-pointer" onClick={()=> setOpenPost(i)}>{i.title}</span></td>
                  <td className="p-3">
                    {({
                      DRAFT:'Разбор',
                      NEEDS_REVIEW:'Ревью',
                      READY_TO_PUBLISH:'Запланирован',
                      PUBLISHED:'Опубликован',
                      REJECTED:'Отклонён'
                    } as Record<string,string>)[i.status]}
                  </td>
                  <td className="p-3">{i.scheduledAt? new Date(i.scheduledAt).toLocaleString(): i.publishedAt? new Date(i.publishedAt).toLocaleString(): ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openPost && (
        <>
          <div className="fixed inset-0 bg-black/90 z-40" onClick={()=> setOpenPost(null)} />
          <PostModal post={openPost} onClose={()=> setOpenPost(null)} onChanged={()=>{ setOpenPost(null); load(); }} />
        </>
      )}
    </div>
  );
}


