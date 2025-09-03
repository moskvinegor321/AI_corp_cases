import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as 'triage' | 'published' | 'rejected' | null;

  const where = status ? { status } : {};
  const [items, counts] = await Promise.all([
    prisma.story.findMany({ where, orderBy: { createdAt: 'desc' } }),
    prisma.story.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const countsMap = { triage: 0, published: 0, rejected: 0 } as Record<string, number>;
  for (const c of counts) countsMap[c.status] = c._count._all;

  return NextResponse.json({ items, counts: countsMap });
}


