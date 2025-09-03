"use client";
import { useEffect, useState } from 'react';

export type StoryStatus = 'all' | 'triage' | 'published' | 'rejected';

export function Filters({ value, onChange }: { value: StoryStatus; onChange: (s: StoryStatus) => void }) {
  const options: StoryStatus[] = ['all', 'triage', 'published', 'rejected'];
  const [selected, setSelected] = useState<StoryStatus>(value);
  useEffect(() => setSelected(value), [value]);
  return (
    <div className="inline-flex rounded-md border p-1 bg-background">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => {
            setSelected(o);
            onChange(o);
          }}
          className={`px-3 py-1 rounded-md text-sm ${selected === o ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
        >
          {o === 'all' ? 'Все' : o === 'triage' ? 'Разобрать' : o === 'published' ? 'Опубликовано' : 'Отклонено'}
        </button>
      ))}
    </div>
  );
}


