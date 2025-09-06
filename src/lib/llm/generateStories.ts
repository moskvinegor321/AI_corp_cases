import OpenAI from 'openai';
import { z } from 'zod';
import { searchNews, type FoundDoc } from '@/lib/search';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Defer error to runtime call site rather than import-time to avoid build-time failures
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

const ItemSchema = z.object({
  title: z.string().min(10),
  // Some models may return objects like { content: "..." } or arrays. Accept any and coerce later.
  script: z.any(),
  company: z.string().optional().nullable(),
  // allow up to 10 from the model; we'll clamp to 3 later
  // relax: accept any strings; we'll replace with provider URLs later
  sources: z.array(z.string()).min(0).max(10),
  novelty_note: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
});

const ResponseSchema = z.object({ items: z.array(ItemSchema) });

export type GeneratedItem = z.infer<typeof ItemSchema>;

export async function generateStories({ banlistTitles, n, promptOverride, searchQueryOverride, noSearch, excludeUrls, excludeDomains }: { banlistTitles: string[]; n: number; promptOverride?: string; searchQueryOverride?: string; noSearch?: boolean; excludeUrls?: string[]; excludeDomains?: string[] }): Promise<{ items: GeneratedItem[]; docs: FoundDoc[] }> {
  const limit = Math.max(5, Math.min(30, n * 6));
  const searchQuery = (searchQueryOverride && searchQueryOverride.trim()) ? searchQueryOverride.trim() : '';
  let docs = noSearch || !searchQuery ? [] : await searchNews(searchQuery, limit);
  if (excludeUrls && excludeUrls.length) {
    const blocked = new Set(excludeUrls);
    docs = docs.filter(d => !blocked.has(d.url));
  }
  if (excludeDomains && excludeDomains.length) {
    const blockedD = new Set(excludeDomains);
    docs = docs.filter(d => {
      try { const h = new URL(d.url).hostname.replace(/^www\./,''); return !blockedD.has(h); } catch { return true; }
    });
  }

  const sourcesBlock = docs
    .slice(0, limit)
    .map((d) => `- ${d.title} — ${d.url}`)
    .join('\n');

  const banlistBlock = banlistTitles.length
    ? banlistTitles.map((t) => `- ${t}`).join('\n')
    : '(пусто)';

  const jsonInstruction = `Формат ответа СТРОГО в JSON по схеме:\n{ "items": [ { "title": "...", "script": "...", "company": "...", "sources": ["..."], "novelty_note": "...", "confidence": 0.7 } ] }`;

  const defaultTask = `Ты — редактор коротких рилсов (30 секунд) про реальные кейсы использования ИИ в компаниях.\n\nЦель: выдать НОВЫЕ ${n} историй на русском. Для каждой:\n- title: 1–2 предложения, максимально конкретно (компания, что случилось, чем полезно/неожиданно). Без кликбейта.\n- script: 350–700 знаков, разговорный стиль; финал — короткий вывод/панч.\n- company: кратко, например "Microsoft".\n- sources: 1–3 надёжных URL (новости/блоги компании/репорты). Не используй мусорные сайты.\n- novelty_note: в чём новизна/почему важно.\n- confidence: 0..1 — уверенность в корректности.\n\nНельзя:\n- придумывать факты без источников;\n- повторять темы из банлиста (ниже)\n- пересказывать один и тот же кейс разными словами.`;

  const taskBlock = (promptOverride && promptOverride.trim().length > 0)
    ? `${promptOverride.trim()}\n\n(Соблюдай требования ниже.)`
    : defaultTask;

  const searchPart = noSearch || !searchQuery ? '' : `\n\nИСПОЛЬЗУЙ ТЕМУ ПОИСКА: «${searchQuery}». Не отклоняйся от темы.`;
  const docsPart = noSearch || !searchQuery || docs.length === 0 ? '' : `\n\nСВЕЖИЕ ИСТОЧНИКИ ДЛЯ ОПОРА (до ${limit} штук, выбери лучшие):\n${sourcesBlock}`;
  const prompt = `${taskBlock}${searchPart}${docsPart}\n\nБАНЛИСТ (заголовки публиковавшихся тем, не повторяйся):\n${banlistBlock}\n\n${jsonInstruction}`;

  const client = getOpenAIClient();
  const res = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    input: prompt,
    temperature: 0.6,
  });

  const text: string = (res as unknown as { output_text?: string }).output_text || '';
  let parsed: z.infer<typeof ResponseSchema> | null = null;
  const tryParsers = [
    () => JSON.parse(text),
    () => {
      const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
      if (fenced) return JSON.parse(fenced[1]);
      throw new Error('no fenced');
    },
    () => {
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) return JSON.parse(text.slice(first, last + 1));
      throw new Error('no braces');
    },
  ];
  let raw: unknown;
  for (const fn of tryParsers) {
    try { raw = fn(); break; } catch { /* try next */ }
  }
  if (!raw) throw new Error('LLM returned non-JSON');
  parsed = ResponseSchema.parse(raw);

  // Always use provider URLs only to avoid выдуманные источники.
  const providerUrls = docs.map((d) => d.url).filter((u) => {
    try { new URL(u); return true; } catch { return false; }
  });

  const items = (parsed?.items || [])
    .slice(0, n)
    .map((it) => ({
      ...it,
      script: (() => {
        const s = (it as unknown as { script?: unknown }).script;
        if (typeof s === 'string') return s;
        if (s && typeof s === 'object') {
          // common shapes
          const maybe = (s as { content?: unknown; text?: unknown; value?: unknown }).content
            ?? (s as { content?: unknown; text?: unknown; value?: unknown }).text
            ?? (s as { content?: unknown; text?: unknown; value?: unknown }).value;
          if (typeof maybe === 'string') return maybe;
        }
        if (Array.isArray(s)) return s.filter(x=>typeof x==='string').join('\n');
        try { return JSON.stringify(s); } catch { return String(s ?? ''); }
      })(),
      // take only real provider URLs; if none – leave empty array so UI hides the block
      sources: providerUrls.slice(0, 3),
    }));

  return { items: items as GeneratedItem[], docs };
}


