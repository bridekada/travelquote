import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Standard Supabase client for client-side operations.
 * Uses the Anon Key and observes RLS.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
