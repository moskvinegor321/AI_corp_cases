import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pages = await prisma.page.findMany({ orderBy: { createdAt: 'asc' } });

    // Aggregate counts by page and status
    const grouped = await prisma.story.groupBy({
      by: ['pageId', 'status'],
      _count: { _all: true },
    }).catch(() => [] as Array<{ pageId: string | null; status: 'triage' | 'published' | 'rejected'; _count: { _all: number } }>);

    const lastPublishedList = await prisma.story.findMany({
      where: { status: 'published' },
      select: { pageId: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    }).catch(() => [] as Array<{ pageId: string | null; publishedAt: Date | null }>);

    const triageByPage: Record<string, number> = {};
    const totalByPage: Record<string, number> = {};
    for (const g of grouped as Array<{ pageId: string | null; status: string; _count: { _all: number } }>) {
      if (!g.pageId) continue;
      totalByPage[g.pageId] = (totalByPage[g.pageId] || 0) + g._count._all;
      if (g.status === 'triage') triageByPage[g.pageId] = (triageByPage[g.pageId] || 0) + g._count._all;
    }

    const lastPublishedByPage: Record<string, string> = {};
    for (const row of lastPublishedList) {
      if (!row.pageId || !row.publishedAt) continue;
      if (!lastPublishedByPage[row.pageId]) {
        lastPublishedByPage[row.pageId] = row.publishedAt.toISOString();
      }
    }

    const enriched = pages.map((p) => ({
      ...p,
      meta: {
        triage: triageByPage[p.id] || 0,
        total: totalByPage[p.id] || 0,
        lastPublishedAt: lastPublishedByPage[p.id] || null,
      },
    }));

    return NextResponse.json({ pages: enriched });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const body = (await req.json().catch(() => ({}))) as { name?: string; prompt?: string; searchQuery?: string };
  const name = (body.name || '').trim() || 'Новый столп';
  const page = await prisma.page.create({ data: { name, prompt: body.prompt || null, searchQuery: body.searchQuery || null } });
  await auditLog({ entityType: 'page', entityId: page.id, action: 'created', meta: { name } });
  return NextResponse.json({ page });
}
