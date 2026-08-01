import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY. Never import this file into a 'use client' component.
// The service role key bypasses RLS entirely.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
