import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
    try {
        let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // Robust check for valid URL
        const isValidUrl = (u: any) => u && typeof u === 'string' && u.startsWith('http') && u.includes('.');

        if (!isValidUrl(url)) {
            if (process.env.NODE_ENV === 'production') {
                console.warn('⚠️ Invalid NEXT_PUBLIC_SUPABASE_URL. Build safety placeholder active.');
            }
            url = 'https://placeholder.supabase.co';
        }

        if (!key || key === 'undefined') {
            key = 'placeholder-key';
        }

        return createClient(url!, key!);
    } catch (e) {
        console.error('CRITICAL: Supabase client init failed during build. This is expected if env vars are missing.');
        return { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) } as any;
    }
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
