import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pillarId = searchParams.get('pillarId') || undefined;

  const whereBase = pillarId ? { pillarId } : {};

  // Execute sequentially to reduce DB pool pressure (P2024 when limit=1)
  const total = await prisma.post.count({ where: whereBase });
  const draft = await prisma.post.count({ where: { ...whereBase, status: 'DRAFT' } });
  const review = await prisma.post.count({ where: { ...whereBase, status: 'NEEDS_REVIEW' } });
  const ready = await prisma.post.count({ where: { ...whereBase, status: 'READY_TO_PUBLISH' } });
  const published = await prisma.post.count({ where: { ...whereBase, status: 'PUBLISHED' } });
  const rejected = await prisma.post.count({ where: { ...whereBase, status: 'REJECTED' } });

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


