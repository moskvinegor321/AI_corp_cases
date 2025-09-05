import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { generateStories, type GeneratedItem } from '@/lib/llm/generateStories';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  type Payload = { pillarId?: string; title?: string; topic?: string; promptOverride?: string; noSearch?: boolean };
  let payload: Payload = {};
  try {
    const raw = await req.json();
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      payload = {
        pillarId: typeof o.pillarId === 'string' ? o.pillarId : undefined,
        title: typeof o.title === 'string' ? o.title : undefined,
        topic: typeof o.topic === 'string' ? o.topic : undefined,
        promptOverride: typeof o.promptOverride === 'string' ? o.promptOverride : undefined,
        noSearch: typeof o.noSearch === 'boolean' ? o.noSearch : undefined,
      };
    }
  } catch {}
  const { pillarId, title, topic, promptOverride, noSearch } = payload;

  // Pull pillar-specific prompt and search
  let pagePrompt: string | undefined;
  let pageSearch: string | undefined;
  try {
    if (pillarId) {
      const page = await prisma.page.findUnique({ where: { id: pillarId } });
      pagePrompt = page?.prompt || undefined;
      pageSearch = page?.searchQuery || undefined;
    }
  } catch {}

  // Pull global context/TOV
  let contextPrompt: string | undefined;
  let toneOfVoicePrompt: string | undefined;
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ['contextPrompt', 'toneOfVoicePrompt'] } } });
    const map = Object.fromEntries(rows.map(r=>[r.key, r.value]));
    contextPrompt = (map['contextPrompt'] || '').trim() || undefined;
    toneOfVoicePrompt = (map['toneOfVoicePrompt'] || '').trim() || undefined;
  } catch {}

  const finalPromptParts: string[] = [];
  if (contextPrompt) finalPromptParts.push(`# CONTEXT\n${contextPrompt}`);
  if (toneOfVoicePrompt) finalPromptParts.push(`# TONE OF VOICE\n${toneOfVoicePrompt}`);
  if (pagePrompt || promptOverride) finalPromptParts.push(`# TASK\n${promptOverride || pagePrompt}`);
  if (title) finalPromptParts.push(`# TITLE\n${title}`);
  if (topic) finalPromptParts.push(`# TOPIC\n${topic}`);
  const finalPrompt = finalPromptParts.join('\n\n');

  const searchQueryOverride = pageSearch;
  const noSearchFinal = noSearch === true ? true : !searchQueryOverride;

  const { items } = await generateStories({ banlistTitles: [], n: 1, promptOverride: finalPrompt, searchQueryOverride, noSearch: noSearchFinal });
  const first: GeneratedItem | undefined = (Array.isArray(items) ? items[0] : undefined);
  const script: string = first && typeof first.script === 'string' ? first.script : '';
  return NextResponse.json({ text: script });
}


