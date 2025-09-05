import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { notifyTelegram, escapeHtml } from '@/lib/notify/telegram';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const onlyTasks = url.searchParams.get('onlyTasks') === 'true';
  const status = url.searchParams.get('taskStatus') as 'OPEN'|'IN_PROGRESS'|'DONE'|null;
  const where: { postId: string; isTask?: boolean; taskStatus?: 'OPEN'|'IN_PROGRESS'|'DONE' } = { postId: id };
  if (onlyTasks) where.isTask = true;
  if (status) where.taskStatus = status;
  const comments = await prisma.postComment.findMany({ where, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const body = await req.json();
  const { text, isTask, taskStatus, dueAt, assignee } = body as { text: string; isTask?: boolean; taskStatus?: 'OPEN'|'IN_PROGRESS'|'DONE'; dueAt?: string; assignee?: string };
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  const comment = await prisma.postComment.create({ data: { postId: id, text, isTask: !!isTask, taskStatus: taskStatus || null, dueAt: dueAt ? new Date(dueAt) : null, assignee: assignee || null } });
  await auditLog({ entityType: 'comment', entityId: comment.id, action: 'created', meta: { postId: id, isTask: !!isTask, taskStatus: taskStatus || null, dueAt: dueAt || null, assignee: assignee || null } });
  // Telegram ping for tasks
  if (isTask) {
    try {
      const post = await prisma.post.findUnique({ where: { id }, include: { pillar: true } });
      const baseUrl = process.env.PUBLIC_APP_URL || '';
      const link = baseUrl ? `${baseUrl}/?post=${id}` : '';
      const lines: string[] = [];
      lines.push(`<b>Новая задача</b> ${post?.pillar?.name ? `в столпе <b>${escapeHtml(post.pillar.name)}</b>` : ''}`);
      if (post?.title) lines.push(`Пост: <b>${escapeHtml(post.title)}</b>`);
      if (assignee) lines.push(`Исполнитель: ${escapeHtml(assignee)}`);
      if (taskStatus) lines.push(`Статус: ${escapeHtml(taskStatus)}`);
      if (dueAt) lines.push(`Дедлайн: ${escapeHtml(new Date(dueAt).toLocaleString())}`);
      lines.push('');
      lines.push(escapeHtml(text));
      if (link) lines.push(`\n<a href="${link}">Открыть пост</a>`);
      await notifyTelegram(lines.join('\n'));
    } catch {}
  }
  return NextResponse.json({ comment });
}


