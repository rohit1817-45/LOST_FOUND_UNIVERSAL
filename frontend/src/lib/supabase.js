// Supabase browser client.
import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.error('REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY missing');
}

export const supabase = createClient(url || '', anon || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Storage helpers
export const REPORT_BUCKET = 'report-images';

export async function uploadReportImage(userId, file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const key = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(REPORT_BUCKET).upload(key, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(REPORT_BUCKET).getPublicUrl(key);
  return { url: data.publicUrl, key };
}
