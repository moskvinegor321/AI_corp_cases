import { NextRequest, NextResponse } from 'next/server';

export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = req.headers.get('x-admin-token');
  const current = process.env.ADMIN_TOKEN;
  const previous = process.env.ADMIN_TOKEN_PREV; // optional rotation window
  if (!current || (token !== current && (!previous || token !== previous))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}


