import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { notifyTelegram, escapeHtml } from '@/lib/notify/telegram';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; commentId: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id, commentId } = await ctx.params;
  const body = await req.json();
  const { text, isTask, taskStatus, dueAt, assignee } = body as { text?: string; isTask?: boolean; taskStatus?: 'OPEN'|'IN_PROGRESS'|'DONE'; dueAt?: string; assignee?: string };
  const comment = await prisma.postComment.update({ where: { id: commentId }, data: { text, isTask, taskStatus, assignee, dueAt: dueAt ? new Date(dueAt) : undefined } });
  await auditLog({ entityType: 'comment', entityId: commentId, action: 'updated', meta: { isTask, taskStatus, assignee: assignee || null, dueAt: dueAt || null } });
  // Notify when task moves to DONE
  if (comment.isTask && comment.taskStatus === 'DONE') {
    try {
      const post = await prisma.post.findUnique({ where: { id }, include: { pillar: true } });
      const baseUrl = (process.env.PUBLIC_APP_URL || '').replace(/\/+$/,'');
      const link = baseUrl ? `${baseUrl}/posts/${id}` : '';
      const parts: string[] = [];
      parts.push(`<b>Задача выполнена</b>${post?.pillar?.name ? ` в столпе <b>${escapeHtml(post.pillar.name)}</b>` : ''}`);
      if (post?.title) parts.push(`Пост: <b>${escapeHtml(post.title)}</b>`);
      if (assignee) parts.push(`Исполнитель: ${escapeHtml(assignee)}`);
      if (comment.text) parts.push(`\n${escapeHtml(comment.text)}`);
      if (link) parts.push(`\n<a href="${link}">Открыть пост</a>`);
      await notifyTelegram(parts.join('\n'));
    } catch {}
  }
  return NextResponse.json({ comment });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; commentId: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id, commentId } = await ctx.params;
  try {
    await prisma.postComment.delete({ where: { id: commentId } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('P2025') || msg.toLowerCase().includes('no record')) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    return NextResponse.json({ error: 'failed to delete comment' }, { status: 500 });
  }
  await auditLog({ entityType: 'comment', entityId: commentId, action: 'deleted', meta: { postId: id } });
  return NextResponse.json({ ok: true });
}


