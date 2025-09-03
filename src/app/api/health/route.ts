import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!process.env.ADMIN_TOKEN || req.headers.get('x-admin-token') !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const directUrl = process.env.DIRECT_URL || '';
  let host = '';
  let db = '';
  try {
    const u = new URL(dbUrl);
    host = u.hostname + (u.port ? `:${u.port}` : '');
    db = u.pathname.replace(/^\//, '');
  } catch {
    // ignore
  }

  // Check table existence
  type Row = { story_exists: boolean; bantitle_exists: boolean };
  let exists: Row | null = null;
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      select
        (to_regclass('public."Story"') is not null) as story_exists,
        (to_regclass('public."BanTitle"') is not null) as bantitle_exists
    `;
    exists = rows?.[0] ?? null;
  } catch (e) {
    return NextResponse.json({ env: { hasDbUrl: !!dbUrl, hasDirectUrl: !!directUrl }, db: { host, db }, error: String(e) }, { status: 500 });
  }

  return NextResponse.json({
    env: { hasDbUrl: !!dbUrl, hasDirectUrl: !!directUrl },
    db: { host, db },
    exists,
  });
}


