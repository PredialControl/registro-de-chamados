"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, MOCK_USERS } from '@/lib/mockData';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { dataService } from '@/lib/data';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize session and sync offline data
    useEffect(() => {
        const initSession = async () => {
            // Sincronizar dados offline assim que o app carregar
            if (navigator.onLine) {
                await dataService.syncPendingTickets();
            }

            const storedUser = storage.get<User | null>(STORAGE_KEYS.SESSION, null);
            if (storedUser) {
                const latestUser = await dataService.getUserByEmail(storedUser.email);
                if (latestUser) {
                    setUser(latestUser);
                    storage.set(STORAGE_KEYS.SESSION, latestUser);
                } else {
                    storage.remove(STORAGE_KEYS.SESSION);
                }
            }
            setIsLoading(false);
        };
        initSession();

        // Listeners para sincronização offline
        const handleOnline = async () => {
            // toast.success('Conexão restabelecida! Sincronizando dados...');
            await dataService.syncPendingTickets();
        };

        const handleOffline = () => {
            // toast.error('Você está offline. Chamados serão salvos localmente.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const login = async (email: string, _password: string): Promise<boolean> => {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const foundUser = await dataService.getUserByEmail(email);

        if (foundUser) {
            setUser(foundUser);
            storage.set(STORAGE_KEYS.SESSION, foundUser);
            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
        storage.remove(STORAGE_KEYS.SESSION);
    };

    const refreshUser = async () => {
        const storedUser = storage.get<User | null>(STORAGE_KEYS.SESSION, null);
        if (storedUser) {
            const updatedUser = await dataService.getUserByEmail(storedUser.email);
            if (updatedUser) {
                setUser(updatedUser);
                storage.set(STORAGE_KEYS.SESSION, updatedUser);
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                logout,
                isAuthenticated: !!user,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
