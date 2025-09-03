import OpenAI from 'openai';
import { z } from 'zod';
import { searchNews } from '@/lib/search';

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
  script: z.string().min(200),
  company: z.string().optional().nullable(),
  sources: z.array(z.string().url()).min(1).max(3),
  novelty_note: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
});

const ResponseSchema = z.object({ items: z.array(ItemSchema) });

export type GeneratedItem = z.infer<typeof ItemSchema>;

export async function generateStories({ banlistTitles, n, promptOverride }: { banlistTitles: string[]; n: number; promptOverride?: string }) {
  const limit = Math.max(5, Math.min(30, n * 6));
  const docs = await searchNews(
    'AI enterprise adoption OR genAI internal rollout OR LLM policy last 90 days',
    limit
  );

  const sourcesBlock = docs
    .slice(0, limit)
    .map((d) => `- ${d.title} — ${d.url}`)
    .join('\n');

  const banlistBlock = banlistTitles.length
    ? banlistTitles.map((t) => `- ${t}`).join('\n')
    : '(пусто)';

  const basePrompt = `Ты — редактор коротких рилсов (30 секунд) про реальные кейсы использования ИИ в компаниях.

Цель: выдать НОВЫЕ ${n} историй на русском. Для каждой:
- title: 1–2 предложения, максимально конкретно (компания, что случилось, чем полезно/неожиданно). Без кликбейта.
- script: 350–700 знаков, разговорный стиль; финал — короткий вывод/панч.
- company: кратко, например "Microsoft".
- sources: 1–3 надёжных URL (новости/блоги компании/репорты). Не используй мусорные сайты.
- novelty_note: в чём новизна/почему важно.
- confidence: 0..1 — уверенность в корректности.

Нельзя:
- придумывать факты без источников;
- повторять темы из банлиста (ниже)
- пересказывать один и тот же кейс разными словами.

СВЕЖИЕ ИСТОЧНИКИ ДЛЯ ОПОРА (до ${limit} штук, выбери лучшие):
${sourcesBlock}

БАНЛИСТ (заголовки публиковавшихся тем, не повторяйся):
${banlistBlock}

Ответ строго в JSON по схеме:
{ "items": [ { "title": "...", "script": "...", "company": "...", "sources": ["..."], "novelty_note": "...", "confidence": 0.7 } ] }`;

  const prompt = promptOverride && promptOverride.trim().length > 0 ? promptOverride : basePrompt;

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

  const items = (parsed?.items || []).slice(0, n);
  return items;
}


