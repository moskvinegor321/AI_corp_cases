import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

// Idempotent endpoint to publish READY_TO_PUBLISH posts past scheduledAt
export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const now = new Date();
  const toPublish = await prisma.post.findMany({
    where: { status: 'READY_TO_PUBLISH', scheduledAt: { lte: now } },
    select: { id: true },
  });
  let count = 0;
  if (toPublish.length) {
    await prisma.$transaction(
      toPublish.map((p) =>
        prisma.post.update({ where: { id: p.id }, data: { status: 'PUBLISHED', publishedAt: now } })
      )
    );
    count = toPublish.length;
  }
  return NextResponse.json({ published: count });
}


