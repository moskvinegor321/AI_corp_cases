import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET() {
  const pillars = await prisma.pillar.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ pillars });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { name } = (await req.json()) as { name?: string };
  if (!name || !name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  try {
    const pillar = await prisma.pillar.create({ data: { name: name.trim() } });
    await auditLog({ entityType: 'pillar', entityId: pillar.id, action: 'created', meta: { name: pillar.name } });
    return NextResponse.json({ pillar });
  } catch (e: any) {
    if (String(e?.message || '').toLowerCase().includes('unique')) {
      return NextResponse.json({ error: 'Pillar name must be unique' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create pillar' }, { status: 500 });
  }
}


