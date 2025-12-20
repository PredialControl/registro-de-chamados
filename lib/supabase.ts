import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
    let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Robust check for valid URL
    const isValidUrl = (u: any) => u && typeof u === 'string' && u.startsWith('http') && u.includes('.');

    if (!isValidUrl(url)) {
        console.warn('⚠️ Invalid or missing NEXT_PUBLIC_SUPABASE_URL. Using placeholder for build safety.');
        url = 'https://placeholder.supabase.co';
    }

    if (!key || key === 'undefined') {
        key = 'placeholder-key';
    }

    return createClient(url!, key!);
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
