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

  const body: GenerateBody & { pageId?: string; pillarId?: string; searchQuery?: string; noSearch?: boolean; promptOverride?: string } = await req.json().catch(() => ({} as GenerateBody));
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
    // Pillar-scoped settings stored in Setting: page:{id}:prompt and page:{id}:search_query
    if (pillarId) {
      const keys = [`page:${pillarId}:prompt`, `page:${pillarId}:search_query`, `page:${pillarId}:context_prompt`, `page:${pillarId}:tov_prompt`];
      const rowsP = await prisma.setting.findMany({ where: { key: { in: keys } } });
      const mapP = Object.fromEntries(rowsP.map((r) => [r.key, r.value]));
      const pPrompt = (mapP[`page:${pillarId}:prompt`] || '').trim();
      const pSearch = (mapP[`page:${pillarId}:search_query`] || '').trim();
      const pContext = (mapP[`page:${pillarId}:context_prompt`] || '').trim();
      const pTov = (mapP[`page:${pillarId}:tov_prompt`] || '').trim();
      if (pPrompt) promptOverride = pPrompt;
      if (pSearch) searchQueryOverride = pSearch;
      if (pContext) contextPrompt = pContext;
      if (pTov) toneOfVoicePrompt = pTov;
    }
    // No global fallbacks: if pillar doesn't have prompts, we leave them empty
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
  // Allow client override of prompt and search
  if (typeof body.promptOverride === 'string' && body.promptOverride.trim().length > 0) {
    promptOverride = body.promptOverride.trim();
  }
  // Force use of provided pillar prompt/search only; no fallback to any global/default
  const searchOverride = typeof body.searchQuery === 'string' && body.searchQuery.trim().length > 0
    ? body.searchQuery.trim()
    : (searchQueryOverride || '');
  const noSearchFinal = body.noSearch === true ? true : !(searchOverride && searchOverride.length > 0);
  if (process.env.DEBUG_GENERATE === 'true') {
    // eslint-disable-next-line no-console
    console.log('[generate] params', { pillarId, n, searchQuery: searchOverride, noSearch: noSearchFinal });
  }
  // Exclude URLs we already used in recent posts to reduce repetition
  let excludeUrls: string[] = [];
  try {
    const recent = await prisma.post.findMany({ where: { pillarId: pillarId || undefined }, orderBy: { createdAt: 'desc' }, take: 200, select: { sources: true } });
    excludeUrls = recent.flatMap(p => (p.sources as string[] | null | undefined) || []).filter(Boolean);
  } catch {}
  const { items, docs } = await generateStories({ banlistTitles, n, promptOverride: finalPrompt, searchQueryOverride: searchOverride, noSearch: noSearchFinal, excludeUrls });
  if (process.env.DEBUG_GENERATE === 'true') {
    // eslint-disable-next-line no-console
    console.log('[generate] docs', docs.slice(0, 5));
  }

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
    // const sourceDate = extractPublishedAt(providerDate) || extractPublishedAt(firstSource);
    // Create Post directly with status DRAFT (Разбор), source='ai'
    const post = await prisma.post.create({
      data: {
        title: it.title,
        body: it.script,
        status: 'DRAFT',
        topic: it.company || null,
        pillarId: pillarId || null,
        source: 'ai',
        sources: Array.isArray(it.sources) ? it.sources.slice(0, 5) : [],
      },
    });
    // Do not persist sources as files; we may store them later in a dedicated column
    created.push(post);
  }

  return NextResponse.json({ created, skippedDuplicates });
}


