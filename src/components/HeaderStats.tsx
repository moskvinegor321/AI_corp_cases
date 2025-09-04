"use client";
import { useEffect, useState } from 'react';

type Counts = { triage: number; published: number; rejected: number };

export function HeaderStats({ pageId }: { pageId?: string }) {
  const [total, setTotal] = useState<Counts>({ triage: 0, published: 0, rejected: 0 });
  const [page, setPage] = useState<Counts | null>(null);

  // overall counts
  useEffect(() => {
    fetch('/api/stories')
      .then((r) => r.json())
      .then((d) => setTotal(d.counts as Counts))
      .catch(() => {});
  }, []);

  // page counts
  useEffect(() => {
    if (!pageId) { setPage(null); return; }
    const params = new URLSearchParams();
    params.set('pageId', pageId);
    fetch(`/api/stories?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setPage(d.counts as Counts))
      .catch(() => setPage(null));
  }, [pageId]);

  const render = (label: string, t: number, p?: number) => (
    <span>
      {label}: <b className="text-foreground">{t}</b>{p !== undefined ? <span> (<b className="text-foreground">{p}</b>)</span> : null}
    </span>
  );

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {render('Triage', total.triage, page?.triage)}
      {render('Published', total.published, page?.published)}
      {render('Rejected', total.rejected, page?.rejected)}
    </div>
  );
}


