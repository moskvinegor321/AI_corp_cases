import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; commentId: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { commentId } = await ctx.params;
  const body = await req.json();
  const { text, isTask, taskStatus, dueAt } = body as { text?: string; isTask?: boolean; taskStatus?: 'OPEN'|'IN_PROGRESS'|'DONE'; dueAt?: string };
  const comment = await prisma.postComment.update({ where: { id: commentId }, data: { text, isTask, taskStatus, dueAt: dueAt ? new Date(dueAt) : undefined } });
  await auditLog({ entityType: 'comment', entityId: commentId, action: 'updated', meta: { isTask, taskStatus, dueAt: dueAt || null } });
  return NextResponse.json({ comment });
}


