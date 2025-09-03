"use client";
import { useEffect, useState } from 'react';

export type StoryStatus = 'all' | 'triage' | 'published' | 'rejected';

export function Filters({ value, onChange }: { value: StoryStatus; onChange: (s: StoryStatus) => void }) {
  const options: StoryStatus[] = ['all', 'triage', 'published', 'rejected'];
  const [selected, setSelected] = useState<StoryStatus>(value);
  useEffect(() => setSelected(value), [value]);
  return (
    <div className="inline-flex items-center gap-1 glass rounded-xl px-1 py-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => {
            setSelected(o);
            onChange(o);
          }}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            selected === o ? 'bg-white/15 border border-white/30' : 'btn-glass'
          }`}
        >
          {o === 'all' ? 'Все' : o === 'triage' ? 'Разобрать' : o === 'published' ? 'Опубликовано' : 'Отклонено'}
        </button>
      ))}
    </div>
  );
}


