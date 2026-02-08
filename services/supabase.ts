import { createClient } from '@supabase/supabase-js';

// User provided keys
const supabaseUrl = 'https://rbrfdcxkoqktunqkjfai.supabase.co';
const supabaseAnonKey = 'sb_publishable_j1LEX-UMFbF6GNN6wI9sgw_sH062Qk9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);