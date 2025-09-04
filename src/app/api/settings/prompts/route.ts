import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

const KEYS = { context: 'contextPrompt', tov: 'toneOfVoicePrompt' } as const;

export async function GET() {
  const rows = await prisma.setting.findMany({ where: { key: { in: [KEYS.context, KEYS.tov] } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ contextPrompt: map[KEYS.context] || '', toneOfVoicePrompt: map[KEYS.tov] || '' });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { contextPrompt, toneOfVoicePrompt } = (await req.json()) as { contextPrompt?: string; toneOfVoicePrompt?: string };
  const ops: Promise<unknown>[] = [];
  if (contextPrompt !== undefined) {
    ops.push(prisma.setting.upsert({ where: { key: KEYS.context }, update: { value: contextPrompt || '' }, create: { key: KEYS.context, value: contextPrompt || '' } }));
  }
  if (toneOfVoicePrompt !== undefined) {
    ops.push(prisma.setting.upsert({ where: { key: KEYS.tov }, update: { value: toneOfVoicePrompt || '' }, create: { key: KEYS.tov, value: toneOfVoicePrompt || '' } }));
  }
  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}


