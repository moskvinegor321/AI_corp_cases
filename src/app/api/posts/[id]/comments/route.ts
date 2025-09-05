import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
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
  return NextResponse.json({ comment });
}


