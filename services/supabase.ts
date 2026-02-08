import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
// These values are injected by Vite at build time
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);