"use client";
import { useEffect, useState } from 'react';

type Counts = { triage: number; published: number; rejected: number };

export function HeaderStats() {
  const [counts, setCounts] = useState<Counts>({ triage: 0, published: 0, rejected: 0 });
  useEffect(() => {
    fetch('/api/stories')
      .then((r) => r.json())
      .then((d) => setCounts(d.counts as Counts))
      .catch(() => {});
  }, []);
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span>Triage: <b className="text-foreground">{counts.triage}</b></span>
      <span>Published: <b className="text-foreground">{counts.published}</b></span>
      <span>Rejected: <b className="text-foreground">{counts.rejected}</b></span>
    </div>
  );
}


