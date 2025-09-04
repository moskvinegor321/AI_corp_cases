import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ page });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; prompt?: string | null; searchQuery?: string | null };
  const normalize = (v: unknown) => {
    if (typeof v !== 'string') return v as string | null | undefined;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };
  const page = await prisma.page.update({
    where: { id },
    data: {
      ...(typeof body.name === 'string' ? { name: body.name } : {}),
      ...(body.prompt !== undefined ? { prompt: normalize(body.prompt) } : {}),
      ...(body.searchQuery !== undefined ? { searchQuery: normalize(body.searchQuery) } : {}),
    },
  });
  await auditLog({ entityType: 'page', entityId: id, action: 'updated', meta: { name: body.name ?? undefined, hasPrompt: body.prompt !== undefined, hasSearchQuery: body.searchQuery !== undefined } });
  return NextResponse.json({ page });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const cascade = url.searchParams.get('cascade') === 'true';
  if (cascade) {
    await prisma.story.deleteMany({ where: { pageId: id } });
  }
  await prisma.page.delete({ where: { id } });
  await auditLog({ entityType: 'page', entityId: id, action: 'deleted', meta: { cascade } });
  return NextResponse.json({ ok: true });
}


