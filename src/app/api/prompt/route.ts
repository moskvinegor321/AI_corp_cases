import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const KEY = 'prompt';

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return NextResponse.json({ prompt: row?.value || '' });
}

export async function PUT(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN || req.headers.get('x-admin-token') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { prompt } = (await req.json()) as { prompt: string };
  const value = (prompt || '').trim();
  const saved = await prisma.setting.upsert({
    where: { key: KEY },
    update: { value },
    create: { key: KEY, value },
  });
  return NextResponse.json({ prompt: saved.value });
}


