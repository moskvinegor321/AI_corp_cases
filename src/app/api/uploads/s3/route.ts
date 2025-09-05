import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createPresignedPutUrl } from '@/lib/storage/s3';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { filename, contentType, prefix } = (await req.json()) as { filename: string; contentType: string; prefix?: string };
  if (!filename || !contentType) return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 });
  try {
    const { url, key } = await createPresignedPutUrl({ filename, contentType, prefix });
    const bucket = process.env.S3_BUCKET || '';
    const region = process.env.S3_REGION || '';
    // Prefer configurable public base (e.g., CDN); fallback to regional URL (works even with static websites and ACLs disabled)
    const publicUrlBase = process.env.S3_PUBLIC_URL_BASE || (region ? `https://s3.${region}.amazonaws.com/${bucket}` : `https://${bucket}.s3.amazonaws.com`); // TODO: Add to .env if using CDN
    const publicUrl = `${publicUrlBase}/${key}`;
    return NextResponse.json({ url, key, publicUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || 'Failed to presign' }, { status: 500 });
  }
}


