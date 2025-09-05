import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

function parseArray(param: string | null): string[] | undefined {
  if (!param) return undefined;
  try {
    if (param.startsWith('[')) return JSON.parse(param);
  } catch {}
  return param.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = parseArray(searchParams.get('status')) as ('DRAFT'|'NEEDS_REVIEW'|'READY_TO_PUBLISH'|'PUBLISHED'|'REJECTED')[] | undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const pillarId = searchParams.get('pillarId') || undefined;
  const search = searchParams.get('search') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));
  const sortBy = (searchParams.get('sortBy') || 'updatedAt') as 'createdAt'|'updatedAt'|'scheduledAt'|'publishedAt';
  const sortDir = ((searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc'|'desc';

  const where: {
    status?: { in: ('DRAFT'|'NEEDS_REVIEW'|'READY_TO_PUBLISH'|'PUBLISHED'|'REJECTED')[] };
    pillarId?: string;
    OR?: Array<Record<string, unknown>>;
    scheduledAt?: { gte?: Date; lte?: Date };
    publishedAt?: { gte?: Date; lte?: Date };
    title?: { contains: string; mode: 'insensitive' };
    topic?: { contains: string; mode: 'insensitive' };
    body?: { contains: string; mode: 'insensitive' };
  } = {};
  if (status && status.length) where.status = { in: status };
  if (pillarId) where.pillarId = pillarId;
  if (from || to) where.OR = [
    { scheduledAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } },
    { publishedAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } },
  ];
  if (search) where.OR = [
    ...(where.OR || []),
    { title: { contains: search, mode: 'insensitive' } },
    { topic: { contains: search, mode: 'insensitive' } },
    { body: { contains: search, mode: 'insensitive' } },
  ];

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      include: { attachments: true, comments: { orderBy: { createdAt: 'desc' }, take: 5 }, pillar: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);
  return NextResponse.json({ items, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const body = await req.json();
  const { title, body: content, topic, pillarId, source } = body as { title: string; body?: string; topic?: string; pillarId?: string; source?: string };
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const post = await prisma.post.create({ data: { title, body: content || '', topic: topic || null, pillarId: pillarId || null, source: source || 'manual' } });
  await auditLog({ entityType: 'post', entityId: post.id, action: 'created', meta: { title, pillarId, topic } });
  return NextResponse.json({ post });
}


