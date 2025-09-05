import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({ where: { id }, include: { attachments: true, pillar: true, comments: { orderBy: { createdAt: 'desc' }, take: 5 } } });
  if (!post) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const body = await req.json();
  const { title, body: content, topic, pillarId, searchQuery } = body as { title?: string; body?: string; topic?: string; pillarId?: string; searchQuery?: string };
  const data: Record<string, unknown> = {};
  if (typeof title === 'string') data.title = title;
  if (typeof content === 'string') data.body = content;
  if (typeof topic !== 'undefined') data.topic = topic || null;
  if (typeof pillarId !== 'undefined') data.pillarId = pillarId || null;
  if (typeof searchQuery !== 'undefined') data.searchQuery = (searchQuery || '').trim();
  const post = await prisma.post.update({ where: { id }, data });
  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  await prisma.attachment.deleteMany({ where: { postId: id } }).catch(()=>{});
  await prisma.postComment.deleteMany({ where: { postId: id } }).catch(()=>{});
  try {
    await prisma.post.delete({ where: { id } });
  } catch (e: unknown) {
    // Make idempotent: if already deleted, return ok
    return NextResponse.json({ ok: true, note: 'already deleted' });
  }
  return NextResponse.json({ ok: true });
}


