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
    const publicUrlBase = process.env.S3_PUBLIC_URL_BASE || `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com`; // TODO: Add to .env if using CDN
    const publicUrl = `${publicUrlBase}/${key}`;
    return NextResponse.json({ url, key, publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to presign' }, { status: 500 });
  }
}


