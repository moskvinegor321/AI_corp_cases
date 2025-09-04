import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const { name } = (await req.json()) as { name?: string };
  if (!name || !name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  try {
    const pillar = await prisma.pillar.update({ where: { id }, data: { name: name.trim() } });
    await auditLog({ entityType: 'pillar', entityId: id, action: 'updated', meta: { name: pillar.name } });
    return NextResponse.json({ pillar });
  } catch (e: any) {
    if (String(e?.message || '').toLowerCase().includes('unique')) {
      return NextResponse.json({ error: 'Pillar name must be unique' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update pillar' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  // Detach posts to avoid FK errors, then delete the pillar
  await prisma.$transaction([
    prisma.post.updateMany({ where: { pillarId: id }, data: { pillarId: null } }),
    prisma.pillar.delete({ where: { id } }),
  ]);
  await auditLog({ entityType: 'pillar', entityId: id, action: 'deleted' });
  return NextResponse.json({ ok: true });
}


