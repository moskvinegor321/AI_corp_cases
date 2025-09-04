import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;

  // Minimal adapter: support JSON body with url metadata, or plain multipart later
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const { name, url, mimeType, sizeBytes } = (await req.json()) as { name: string; url: string; mimeType?: string; sizeBytes?: number };
    if (!name || !url) return NextResponse.json({ error: 'name and url required' }, { status: 400 });
    const att = await prisma.attachment.create({ data: { postId: id, name, url, mimeType: mimeType || null, sizeBytes: sizeBytes || null } });
    await auditLog({ entityType: 'attachment', entityId: att.id, action: 'created', meta: { postId: id, name, mimeType: mimeType || null, sizeBytes: sizeBytes || null } });
    return NextResponse.json({ attachment: att });
  }
  // For multipart/form-data uploads you can extend here to use your storage (Supabase/S3). Fallback for now.
  return NextResponse.json({ error: 'multipart upload not configured; send JSON {name,url}' }, { status: 400 });
}


