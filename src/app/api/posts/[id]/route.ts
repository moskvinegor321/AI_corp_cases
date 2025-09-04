import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.ADMIN_TOKEN || req.headers.get('x-admin-token') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json();
  const { title, body: content, topic, pillarId } = body as { title?: string; body?: string; topic?: string; pillarId?: string };
  const post = await prisma.post.update({ where: { id }, data: { title, body: content, topic, pillarId } });
  return NextResponse.json({ post });
}


