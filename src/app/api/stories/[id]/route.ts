import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!process.env.ADMIN_TOKEN || req.headers.get('x-admin-token') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const { action } = (await req.json()) as { action: 'publish' | 'reject' | 'triage' };
  const data: Partial<{ status: 'published' | 'rejected' | 'triage'; publishedAt: Date | null }> = {};
  if (action === 'publish') {
    data.status = 'published';
    data.publishedAt = new Date();
  } else if (action === 'reject') {
    data.status = 'rejected';
  } else if (action === 'triage') {
    data.status = 'triage';
    data.publishedAt = null;
  } else {
    return NextResponse.json({ error: 'Bad action' }, { status: 400 });
  }

  const updated = await prisma.story.update({ where: { id }, data });
  return NextResponse.json(updated);
}


