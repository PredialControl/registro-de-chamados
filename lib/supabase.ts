import { createClient } from '@supabase/supabase-js';

// Dummy values for build time to prevent "Invalid URL" errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ Supabase credentials missing during build. Ensure they are set in your environment variables.');
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
