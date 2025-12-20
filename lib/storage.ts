export const STORAGE_KEYS = {
    USERS: 'app_users',
    BUILDINGS: 'app_buildings',
    TICKETS: 'app_tickets',
    SESSION: 'app_session',
};

export const storage = {
    get: <T>(key: string, defaultValue: T): T => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading ${key} from localStorage`, error);
            return defaultValue;
        }
    },
    set: <T>(key: string, value: T): void => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error writing ${key} to localStorage`, error);
        }
    },
    remove: (key: string): void => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
    },
};
