import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; attachmentId: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { attachmentId } = await ctx.params;
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await auditLog({ entityType: 'attachment', entityId: attachmentId, action: 'deleted' });
  return NextResponse.json({ ok: true });
}


