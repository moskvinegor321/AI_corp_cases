import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
  if (!process.env.ADMIN_TOKEN || req.headers.get('x-admin-token') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; prompt?: string | null; searchQuery?: string | null };
  const page = await prisma.page.update({
    where: { id },
    data: {
      ...(typeof body.name === 'string' ? { name: body.name } : {}),
      ...(body.prompt !== undefined ? { prompt: body.prompt } : {}),
      ...(body.searchQuery !== undefined ? { searchQuery: body.searchQuery } : {}),
    },
  });
  return NextResponse.json({ page });
}


