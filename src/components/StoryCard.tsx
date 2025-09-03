"use client";
import { useState } from 'react';

export type Story = {
  id: string;
  title: string;
  titleSlug: string;
  script: string;
  company?: string | null;
  sources: string[];
  status: 'triage' | 'published' | 'rejected';
  noveltyNote?: string | null;
  confidence?: number | null;
  createdAt: string;
};

export function StoryCard({ story, onAction }: { story: Story; onAction: (id: string, a: 'publish' | 'reject' | 'triage') => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border rounded-md p-4 flex gap-4 items-start bg-card fade-in-up">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{story.title}</h3>
          {story.company && <span className="text-xs border rounded px-2 py-0.5">{story.company}</span>}
          <span className={`ml-2 text-xs px-2 py-0.5 rounded border ${
            story.status === 'published' ? 'border-green-600 text-green-500' : story.status === 'rejected' ? 'border-red-600 text-red-500' : 'border-yellow-600 text-yellow-500'
          }`}>
            {story.status === 'published' ? 'Опубликовано' : story.status === 'rejected' ? 'Отклонено' : 'Разобрать'}
          </span>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          <span>{new Date(story.createdAt).toLocaleString()}</span>
        </div>
        <div className={`mt-3 text-sm whitespace-pre-line ${expanded ? '' : 'line-clamp-6'}`}>{story.script}</div>
        <button className="mt-2 text-xs underline" onClick={() => setExpanded((s) => !s)}>
          {expanded ? 'Свернуть' : 'Показать полностью'}
        </button>
        <div className="mt-3 flex gap-2 text-xs flex-wrap">
          {story.sources?.map((s) => (
            <a key={s} href={s} target="_blank" className="underline" rel="noreferrer">
              {new URL(s).host}
            </a>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button className="px-3 py-1 rounded bg-green-600 text-white transition-transform active:scale-[0.98]" onClick={() => onAction(story.id, 'publish')}>Опубликовать</button>
        <button className="px-3 py-1 rounded bg-destructive text-destructive-foreground transition-transform active:scale-[0.98]" onClick={() => onAction(story.id, 'reject')}>Отклонить</button>
        <button className="px-3 py-1 rounded border transition-transform active:scale-[0.98]" onClick={() => onAction(story.id, 'triage')}>Разобрать</button>
      </div>
    </div>
  );
}


