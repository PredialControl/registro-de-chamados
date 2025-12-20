import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
    let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    return createClient(url, key);
};

// Lazy-initialized instance
let supabaseInstance: any;

export const supabase = new Proxy({} as any, {
    get: (target, prop) => {
        if (!supabaseInstance) {
            supabaseInstance = getSupabase();
        }
        return supabaseInstance[prop];
    }
});
