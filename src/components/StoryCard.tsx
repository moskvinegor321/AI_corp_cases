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
  publishedAt?: string | null;
  sourcePublishedAt?: string | null;
};

export function StoryCard({ story, onAction, selected, onSelect }: { story: Story; onAction: (id: string, a: 'publish' | 'reject' | 'triage') => void; selected?: boolean; onSelect?: (id: string, v: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    const lines: string[] = [];
    lines.push(story.title);
    if (story.company) lines.push(`Компания: ${story.company}`);
    lines.push('');
    lines.push(story.script);
    if (story.sources && story.sources.length) {
      lines.push('');
      lines.push('Источники:');
      story.sources.forEach((s, i) => {
        const suffix = i === 0 && story.sourcePublishedAt
          ? ` (опубликовано: ${new Date(story.sourcePublishedAt).toLocaleString()})`
          : '';
        lines.push(`- ${s}${suffix}`);
      });
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="glass rounded-xl p-5 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 items-start fade-in-up">
      <div className="panel rounded-lg p-3">
        <div className="flex items-center gap-2">
          {onSelect && (
            <input type="checkbox" checked={!!selected} onChange={(e) => onSelect(story.id, e.target.checked)} />
          )}
          <h3 className="font-semibold text-lg tracking-tight">{story.title}</h3>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          <span>{new Date(story.createdAt).toLocaleString()}</span>
        </div>
        <div className={`mt-3 text-sm whitespace-pre-line ${expanded ? '' : 'clamp-6'}`}>{story.script}</div>
        {!expanded && story.script?.length > 600 && (
          <button className="mt-2 text-xs underline" onClick={() => setExpanded(true)}>
            Показать полностью
          </button>
        )}
        {story.sources && story.sources.length > 0 && (
        <div className="mt-3 flex gap-3 text-xs flex-wrap items-center">
          {story.sources.map((s, i) => {
            const host = (() => { try { return new URL(s).host; } catch { return s; } })();
            const dateLabel = i === 0 && story.sourcePublishedAt ? ` · ${new Date(story.sourcePublishedAt).toLocaleString()}` : '';
            return (
              <a key={s} href={s} target="_blank" className="underline" rel="noreferrer">
                {host}{dateLabel}
              </a>
            );
          })}
        </div>
        )}
      </div>
      <div className="flex flex-col gap-2 md:w-[320px] md:justify-end md:h-full">
        <div className="flex flex-wrap items-center gap-2 justify-end text-xs text-muted-foreground">
          {story.company && <span className="text-xs chip rounded px-2 py-0.5">{story.company}</span>}
          <span className={`text-xs px-2 py-0.5 rounded chip ${
            story.status === 'published' ? 'border-green-600 text-green-500' : story.status === 'rejected' ? 'border-red-600 text-red-500' : 'border-yellow-600 text-yellow-500'
          }`}>
            {story.status === 'published' ? 'Опубликовано' : story.status === 'rejected' ? 'Отклонено' : 'Разобрать'}
          </span>
          <span className="px-2 py-0.5">Создано: {new Date(story.createdAt).toLocaleDateString()}</span>
          {story.sourcePublishedAt && (
            <span className="px-2 py-0.5">Источник: {new Date(story.sourcePublishedAt).toLocaleDateString()}</span>
          )}
          {story.publishedAt && (
            <span className="px-2 py-0.5">Опубликовано (AION): {new Date(story.publishedAt).toLocaleDateString()}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
          <button className="px-2 h-10 rounded btn-glass text-red-400 text-xs" onClick={() => onAction(story.id, 'reject')}>Отклонить</button>
          <button className="px-2 h-10 rounded btn-glass text-xs" onClick={() => onAction(story.id, 'triage')}>Разобрать</button>
          <button className="px-2 h-10 rounded btn-glass text-green-400 text-xs" onClick={() => onAction(story.id, 'publish')}>Опубликовать</button>
        </div>
        <button className="mt-1 px-3 h-10 rounded btn-glass w-full" onClick={copyAll}>{copied ? 'Скопировано' : 'Копировать'}</button>
      </div>
    </div>
  );
}


