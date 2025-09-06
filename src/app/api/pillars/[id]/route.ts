import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const pillar = await prisma.pillar.findUnique({ where: { id } });
  if (!pillar) return NextResponse.json({ error: 'not found' }, { status: 404 });
  // read pillar-scoped prompts from settings
  const keys = [`page:${id}:prompt`, `page:${id}:search_query`, `page:${id}:context_prompt`, `page:${id}:tov_prompt`];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return NextResponse.json({ pillar, prompt: map[`page:${id}:prompt`] || null, searchQuery: map[`page:${id}:search_query`] || null, contextPrompt: map[`page:${id}:context_prompt`] || null, toneOfVoicePrompt: map[`page:${id}:tov_prompt`] || null });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const { name, prompt, searchQuery, contextPrompt, toneOfVoicePrompt } = (await req.json()) as { name?: string; prompt?: string; searchQuery?: string; contextPrompt?: string; toneOfVoicePrompt?: string };
  if (!name && prompt === undefined && searchQuery === undefined && contextPrompt === undefined && toneOfVoicePrompt === undefined) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  try {
    let pillar;
    if (name && name.trim()) {
      pillar = await prisma.pillar.update({ where: { id }, data: { name: name.trim() } });
      await auditLog({ entityType: 'pillar', entityId: id, action: 'updated', meta: { name: pillar.name } });
    } else {
      pillar = await prisma.pillar.findUnique({ where: { id } });
    }

    if (!pillar) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Save pillar-scoped prompts to Setting table
    const ops = [] as Array<ReturnType<typeof prisma.setting.upsert>>;
    if (prompt !== undefined) {
      ops.push(prisma.setting.upsert({ where: { key: `page:${id}:prompt` }, update: { value: (prompt || '').trim() }, create: { key: `page:${id}:prompt`, value: (prompt || '').trim() } }));
    }
    if (searchQuery !== undefined) {
      ops.push(prisma.setting.upsert({ where: { key: `page:${id}:search_query` }, update: { value: (searchQuery || '').trim() }, create: { key: `page:${id}:search_query`, value: (searchQuery || '').trim() } }));
    }
    if (contextPrompt !== undefined) {
      ops.push(prisma.setting.upsert({ where: { key: `page:${id}:context_prompt` }, update: { value: (contextPrompt || '').trim() }, create: { key: `page:${id}:context_prompt`, value: (contextPrompt || '').trim() } }));
    }
    if (toneOfVoicePrompt !== undefined) {
      ops.push(prisma.setting.upsert({ where: { key: `page:${id}:tov_prompt` }, update: { value: (toneOfVoicePrompt || '').trim() }, create: { key: `page:${id}:tov_prompt`, value: (toneOfVoicePrompt || '').trim() } }));
    }
    if (ops.length) await prisma.$transaction(ops);

    return NextResponse.json({ pillar, updated: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes('unique')) {
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


