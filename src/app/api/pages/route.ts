import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const pages = await prisma.page.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ pages });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN || req.headers.get('x-admin-token') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { name?: string; prompt?: string; searchQuery?: string };
  const name = (body.name || '').trim() || 'Новая страница';
  const page = await prisma.page.create({ data: { name, prompt: body.prompt || null, searchQuery: body.searchQuery || null } });
  return NextResponse.json({ page });
}
