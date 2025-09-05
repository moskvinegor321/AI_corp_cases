"use client";
import { useEffect, useMemo, useState } from 'react';

export type PostStatus = 'DRAFT'|'NEEDS_REVIEW'|'READY_TO_PUBLISH'|'PUBLISHED'|'REJECTED';
export type PostFilters = { statuses: PostStatus[]; from?: string; to?: string; pillarId?: string; search?: string };

function parseFromUrl(): PostFilters {
  if (typeof window === 'undefined') return { statuses: [] };
  const sp = new URLSearchParams(window.location.search);
  const statusesRaw = sp.get('status');
  let statuses: PostStatus[] = [];
  try { statuses = statusesRaw ? JSON.parse(statusesRaw) : []; } catch {}
  const from = sp.get('from') || undefined;
  const to = sp.get('to') || undefined;
  const pillarId = sp.get('pillarId') || undefined;
  const search = sp.get('search') || undefined;
  return { statuses, from, to, pillarId, search };
}

export function usePostFilters(defaults?: Partial<PostFilters>) {
  const [filters, setFilters] = useState<PostFilters>(() => {
    const merged = { ...parseFromUrl(), ...(defaults || {}) } as Partial<PostFilters>;
    return {
      statuses: merged.statuses && merged.statuses.length ? merged.statuses : [],
      from: merged.from,
      to: merged.to,
      pillarId: merged.pillarId,
      search: merged.search,
    };
  });

  useEffect(() => {
    const sp = new URLSearchParams();
    if (filters.statuses?.length) sp.set('status', JSON.stringify(filters.statuses));
    if (filters.from) sp.set('from', filters.from);
    if (filters.to) sp.set('to', filters.to);
    if (filters.pillarId) sp.set('pillarId', filters.pillarId);
    if (filters.search) sp.set('search', filters.search);
    const q = sp.toString();
    if (typeof window !== 'undefined') window.history.replaceState({}, '', q ? `?${q}` : window.location.pathname);
  }, [JSON.stringify(filters)]);

  const api = useMemo(() => ({
    filters,
    setStatuses: (s: PostStatus[]) => setFilters((f) => ({ ...f, statuses: s })),
    setRange: (from?: string, to?: string) => setFilters((f) => ({ ...f, from, to })),
    setPillar: (pillarId?: string) => setFilters((f) => ({ ...f, pillarId })),
    setSearch: (search?: string) => setFilters((f) => ({ ...f, search })),
  }), [filters]);

  return api;
}


