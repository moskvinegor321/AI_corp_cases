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

export async function DELETE(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN || req.headers.get('x-admin-token') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { ids } = (await req.json().catch(() => ({ ids: [] }))) as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
  }
  const result = await prisma.story.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deletedCount: result.count });
}


