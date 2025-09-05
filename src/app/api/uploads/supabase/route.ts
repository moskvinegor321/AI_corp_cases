import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/storage/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  const { filename, contentType, prefix } = (await req.json()) as { filename: string; contentType: string; prefix?: string };
  if (!filename || !contentType) return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 });

  const bucket = process.env.SUPABASE_BUCKET || 'files'; // TODO: Add to .env
  const supabase = getSupabaseAdmin();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${prefix ? `${prefix.replace(/\/$/, '')}/` : ''}${Date.now()}_${safeName}`;

  // Create a signed URL for upload via POST to storage API
  // Using createSignedUploadUrl (if available) or upload via service role
  // We will use createSignedUploadUrl to allow client direct upload without exposing keys
  // @ts-expect-error - available in supabase-js >= 2.39
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: true, contentType });
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to create signed upload url' }, { status: 500 });
  }

  // Public URL to save with attachment
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = pub?.publicUrl;

  return NextResponse.json({ url: data.signedUrl, key: path, publicUrl });
}


