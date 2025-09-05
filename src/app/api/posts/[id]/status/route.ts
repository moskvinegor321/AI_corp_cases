import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { validateStatusTransition } from '@/lib/posts';
import { auditLog } from '@/lib/audit';
import { notifyTelegram, escapeHtml } from '@/lib/notify/telegram';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const body = await req.json();
  const { status, scheduledAt, reviewDueAt, publishedAt } = body as { status: 'DRAFT'|'NEEDS_REVIEW'|'READY_TO_PUBLISH'|'PUBLISHED'; scheduledAt?: string; reviewDueAt?: string; publishedAt?: string };
  const current = await prisma.post.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 });
  console.log('[status] request', { id, from: current.status, to: status, scheduledAt, reviewDueAt, publishedAt });
  const check = validateStatusTransition(current, { status, scheduledAt, reviewDueAt, publishedAt });
  if (!check.ok) {
    console.warn('[status] validation_failed', { id, error: check.error });
    return NextResponse.json({ error: check.error }, { status: 400 });
  }
  const post = await prisma.post.update({ where: { id }, data: check.data });
  await auditLog({ entityType: 'post', entityId: id, action: 'status_changed', meta: { from: current.status, to: status, payload: { scheduledAt, reviewDueAt, publishedAt } } });
  // Telegram notifications for scheduling/publishing
  try {
    const withPillar = await prisma.post.findUnique({ where: { id }, include: { pillar: true } });
    const baseUrl = process.env.PUBLIC_APP_URL || '';
    const link = baseUrl ? `${baseUrl}/table?post=${id}` : '';
    if (status === 'READY_TO_PUBLISH') {
      const when = (check.data.scheduledAt || withPillar?.scheduledAt) as unknown as Date | null;
      const whenText = when ? new Date(when).toLocaleString([], { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
      const parts = [
        `<b>Запланирован пост</b>${withPillar?.pillar?.name ? ` в столпе <b>${escapeHtml(withPillar.pillar.name)}</b>` : ''}`,
        withPillar?.title ? `«${escapeHtml(withPillar.title)}»` : '',
        whenText ? `на ${whenText}` : '',
      ].filter(Boolean);
      if (link) parts.push(`\n<a href="${link}">Открыть пост</a>`);
      await notifyTelegram(parts.join(' '));
    }
    if (status === 'PUBLISHED') {
      const when = (check.data.publishedAt || withPillar?.publishedAt) as unknown as Date | null;
      const whenText = when ? new Date(when).toLocaleString([], { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
      const parts = [
        `<b>Опубликован пост</b>${withPillar?.pillar?.name ? ` в столпе <b>${escapeHtml(withPillar.pillar.name)}</b>` : ''}`,
        withPillar?.title ? `«${escapeHtml(withPillar.title)}»` : '',
        whenText ? `(${whenText})` : '',
      ].filter(Boolean);
      if (link) parts.push(`\n<a href="${link}">Открыть пост</a>`);
      await notifyTelegram(parts.join(' '));
    }
  } catch {}
  return NextResponse.json({ post });
}


