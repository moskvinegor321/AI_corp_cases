import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { generateStories } from '@/lib/llm/generateStories';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const body = await req.json().catch(()=> ({} as any)) as { pillarId?: string; title?: string; topic?: string; promptOverride?: string; noSearch?: boolean };
  const { pillarId, title, topic, promptOverride, noSearch } = body;

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

  const { items } = await generateStories({ n: 1, promptOverride: finalPrompt, searchQueryOverride, noSearch: noSearchFinal });
  const first = (items as any[])[0];
  const script: string = first?.script || '';
  return NextResponse.json({ text: script });
}


