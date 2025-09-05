import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { toSlug } from '@/lib/slug';
import { isDuplicate } from '@/lib/dedupe';
import { generateStories } from '@/lib/llm/generateStories';
import { extractPublishedAt } from '@/lib/search';

export const runtime = 'nodejs';

type GenerateBody = { n?: number };

type MinimalItem = {
  title: string;
  script: string;
  company?: string | null;
  sources?: string[];
  novelty_note?: string | null;
  confidence?: number | null;
};

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body: GenerateBody & { pageId?: string; pillarId?: string; searchQuery?: string; noSearch?: boolean } = await req.json().catch(() => ({} as GenerateBody));
  const n = Number(body?.n || process.env.GENERATE_N || 5);
  const pageId = (body as { pageId?: string }).pageId;
  const pillarId = (body as { pillarId?: string }).pillarId;

  const excludeRejected = String(process.env.EXCLUDE_REJECTED) === 'true';
  const existing = await prisma.story.findMany({
    where: {
      status: { in: excludeRejected ? ['published', 'rejected'] : ['published'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { title: true, titleSlug: true },
  });

  const banlistTitles = existing
    .slice(0, Number(process.env.MAX_CONTEXT_TITLES || 200))
    .map((x) => x.title);
  const existingSlugs = new Set(existing.map((x) => x.titleSlug));

  // read custom prompt and searchQuery if set (fallback if Setting table is missing)
  let promptOverride: string | undefined = undefined;
  let searchQueryOverride: string | undefined = undefined;
  let contextPrompt: string | undefined = undefined;
  let toneOfVoicePrompt: string | undefined = undefined;
  try {
    if (pageId) {
      const page = await prisma.page.findUnique({ where: { id: pageId } });
      if (page) {
        promptOverride = page.prompt || undefined;
        searchQueryOverride = page.searchQuery || undefined;
      }
    }
    if (!promptOverride && !searchQueryOverride) {
      const rows = await prisma.setting.findMany({ where: { key: { in: ['prompt', 'search_query'] } } });
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      promptOverride = map['prompt'];
      searchQueryOverride = map['search_query'];
    }
    // context/tov prompts (global)
    {
      const rows = await prisma.setting.findMany({ where: { key: { in: ['contextPrompt', 'toneOfVoicePrompt'] } } });
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      contextPrompt = (map['contextPrompt'] || '').trim() || undefined;
      toneOfVoicePrompt = (map['toneOfVoicePrompt'] || '').trim() || undefined;
    }
  } catch {
    promptOverride = undefined;
    searchQueryOverride = undefined;
  }
  // Build final prompt from context/tov + page prompt if any
  let finalPrompt: string | undefined = undefined;
  const parts: string[] = [];
  if (contextPrompt) parts.push(`# CONTEXT\n${contextPrompt}`);
  if (toneOfVoicePrompt) parts.push(`# TONE OF VOICE\n${toneOfVoicePrompt}`);
  if (promptOverride) parts.push(`# TASK\n${promptOverride}`);
  finalPrompt = parts.length ? parts.join(`\n\n`) : undefined;

  // Allow overriding search from request body
  const searchOverride = typeof body.searchQuery === 'string' && body.searchQuery.trim().length > 0 ? body.searchQuery.trim() : searchQueryOverride;
  const noSearchFinal = body.noSearch === true ? true : !searchOverride;
  const { items, docs } = await generateStories({ banlistTitles, n, promptOverride: finalPrompt, searchQueryOverride: searchOverride, noSearch: noSearchFinal });

  const threshold = Number(process.env.SIMILARITY_THRESHOLD || 0.82);
  const created: unknown[] = [];
  const skippedDuplicates: string[] = [];

  // Deduplicate within this batch by slug and fuzzy title
  const batchTitles: string[] = [];
  const batchSlugs = new Set<string>();

  for (const it of items as MinimalItem[]) {
    const slug = toSlug(it.title);
    if (
      existingSlugs.has(slug) ||
      batchSlugs.has(slug) ||
      isDuplicate(it.title, [...banlistTitles, ...batchTitles], threshold)
    ) {
      skippedDuplicates.push(it.title);
      continue;
    }

    batchSlugs.add(slug);
    batchTitles.push(it.title);

    // best-effort parse date from first source url or provider date if any
    const firstSource = (it.sources || [])[0];
    const matchedDoc = docs.find((d) => d.url === firstSource);
    const providerDate: string | undefined = (matchedDoc?.publishedAt as string | undefined);
    const sourceDate = extractPublishedAt(providerDate) || extractPublishedAt(firstSource);
    // Create Post directly with status NEEDS_REVIEW ("На разбор"), source='ai'
    const post = await prisma.post.create({
      data: {
        title: it.title,
        body: it.script,
        status: 'NEEDS_REVIEW',
        topic: it.company || null,
        pillarId: pillarId || null,
        source: 'ai',
      },
    });
    created.push(post);
  }

  return NextResponse.json({ created, skippedDuplicates });
}


