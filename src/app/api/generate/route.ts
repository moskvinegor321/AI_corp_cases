import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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
  const token = req.headers.get('x-admin-token');
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: GenerateBody = await req.json().catch(() => ({} as GenerateBody));
  const n = Number(body?.n || process.env.GENERATE_N || 5);

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
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ['prompt', 'search_query'] } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    promptOverride = map['prompt'];
    searchQueryOverride = map['search_query'];
  } catch {
    promptOverride = undefined;
    searchQueryOverride = undefined;
  }
  const items = await generateStories({ banlistTitles, n, promptOverride, searchQueryOverride });

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
    const providerDate: string | undefined = undefined;
    const sourceDate = extractPublishedAt(providerDate) || extractPublishedAt(firstSource);
    let saved;
    try {
      saved = await prisma.story.create({
        data: {
          title: it.title,
          titleSlug: slug,
          script: it.script,
          company: it.company || null,
          sources: (it.sources || []).slice(0, 3),
          status: 'triage',
          noveltyNote: it.novelty_note || null,
          confidence: typeof it.confidence === 'number' ? it.confidence : null,
          origin: 'generated',
          sourcePublishedAt: sourceDate ? sourceDate : null,
        },
      });
    } catch {
      // If column sourcePublishedAt is missing (migration not applied), retry without it
      saved = await prisma.story.create({
        data: {
          title: it.title,
          titleSlug: slug,
          script: it.script,
          company: it.company || null,
          sources: (it.sources || []).slice(0, 3),
          status: 'triage',
          noveltyNote: it.novelty_note || null,
          confidence: typeof it.confidence === 'number' ? it.confidence : null,
          origin: 'generated',
        },
      });
    }
    created.push(saved);
  }

  return NextResponse.json({ created, skippedDuplicates });
}


