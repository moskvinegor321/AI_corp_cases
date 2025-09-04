import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
export const dynamic = 'force-dynamic';

const KEY_PROMPT = 'prompt';
const KEY_SEARCH = 'search_query';

export async function GET() {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: [KEY_PROMPT, KEY_SEARCH] } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({ prompt: map[KEY_PROMPT] || '', searchQuery: map[KEY_SEARCH] || '' });
  } catch (e) {
    // Fallback if the Setting table does not exist yet (migration not applied)
    return NextResponse.json({ prompt: '', searchQuery: '' });
  }
}

export async function PUT(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const body = (await req.json()) as { prompt?: string; searchQuery?: string };
  const updates: Array<Promise<unknown>> = [];
  if (typeof body.prompt === 'string') {
    const value = (body.prompt || '').trim();
    updates.push(
      prisma.setting.upsert({
        where: { key: KEY_PROMPT },
        update: { value },
        create: { key: KEY_PROMPT, value },
      })
    );
  }
  if (typeof body.searchQuery === 'string') {
    const value = (body.searchQuery || '').trim();
    updates.push(
      prisma.setting.upsert({
        where: { key: KEY_SEARCH },
        update: { value },
        create: { key: KEY_SEARCH, value },
      })
    );
  }
  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}


