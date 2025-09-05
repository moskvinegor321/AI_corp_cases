import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const body = await req.json();
  const { title, body: content, topic, pillarId } = body as { title?: string; body?: string; topic?: string; pillarId?: string };
  const data: Record<string, unknown> = {};
  if (typeof title === 'string') data.title = title;
  if (typeof content === 'string') data.body = content;
  if (typeof topic !== 'undefined') data.topic = topic || null;
  if (typeof pillarId !== 'undefined') data.pillarId = pillarId || null;
  const post = await prisma.post.update({ where: { id }, data });
  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  await prisma.attachment.deleteMany({ where: { postId: id } }).catch(()=>{});
  await prisma.postComment.deleteMany({ where: { postId: id } }).catch(()=>{});
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


