import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pillarId = searchParams.get('pillarId') || undefined;

  const whereBase = pillarId ? { pillarId } : {};

  const [total, draft, review, ready, published, rejected] = await Promise.all([
    prisma.post.count({ where: whereBase }),
    prisma.post.count({ where: { ...whereBase, status: 'DRAFT' } }),
    prisma.post.count({ where: { ...whereBase, status: 'NEEDS_REVIEW' } }),
    prisma.post.count({ where: { ...whereBase, status: 'READY_TO_PUBLISH' } }),
    prisma.post.count({ where: { ...whereBase, status: 'PUBLISHED' } }),
    prisma.post.count({ where: { ...whereBase, status: 'REJECTED' } }),
  ]);

  return NextResponse.json({
    total,
    byStatus: {
      DRAFT: draft,
      NEEDS_REVIEW: review,
      READY_TO_PUBLISH: ready,
      PUBLISHED: published,
      REJECTED: rejected,
    },
  });
}


