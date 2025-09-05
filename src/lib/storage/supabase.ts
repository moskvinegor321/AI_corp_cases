import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL; // TODO: Add to .env
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // TODO: Add to .env (server only)
  if (!url || !serviceKey) throw new Error('Supabase admin env vars are missing');
  return createClient(url, serviceKey, { auth: { persistSession: false }, global: { headers: { 'x-client-info': 'aion-admin' } } });
}

export function getPublicUrl(bucket: string, path: string) {
  const url = process.env.SUPABASE_URL; // TODO: Add to .env
  if (!url) throw new Error('SUPABASE_URL missing');
  // Public URL returned by supabase client is preferred; this is a fallback format
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}


