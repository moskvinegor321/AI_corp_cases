import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

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

  // External dependencies check stubs
  const deps = {
    searchProvider: Boolean(process.env.SEARCH_PROVIDER || process.env.NEWSAPI_KEY || process.env.SERPER_API_KEY || process.env.TAVILY_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    storage: Boolean(process.env.S3_BUCKET || process.env.GCS_BUCKET), // TODO: Add to .env
  };

  return NextResponse.json({
    env: { hasDbUrl: !!dbUrl, hasDirectUrl: !!directUrl },
    db: { host, db },
    exists,
    deps,
  });
}


