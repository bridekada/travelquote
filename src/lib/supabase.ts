import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Standard Supabase client for client-side operations.
 * Uses createBrowserClient to ensure sessions are synced to cookies.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Utility to get a Service Role client for administrative tasks.
 * ONLY use this in Server Components or API Routes.
 */
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }
  return createClient(supabaseUrl, serviceKey);
};
