import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

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


