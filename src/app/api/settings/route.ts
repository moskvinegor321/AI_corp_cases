import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

// GET /api/settings?keys=key1,key2 or without param to fetch all
export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const url = new URL(req.url);
  const keysParam = url.searchParams.get('keys');
  const keys = keysParam ? keysParam.split(',').map((k) => k.trim()).filter(Boolean) : undefined;
  const where = keys && keys.length ? { key: { in: keys } } : undefined;
  const rows = await prisma.setting.findMany({ where });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ settings: map });
}

// POST /api/settings  body: { settings: { key: value, ... } }
export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { settings } = (await req.json()) as { settings?: Record<string, string> };
  if (!settings || typeof settings !== 'object') return NextResponse.json({ error: 'settings object required' }, { status: 400 });
  const ops: Promise<unknown>[] = [];
  for (const [key, value] of Object.entries(settings)) {
    const v = typeof value === 'string' ? value : String(value);
    ops.push(prisma.setting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } }));
  }
  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}


