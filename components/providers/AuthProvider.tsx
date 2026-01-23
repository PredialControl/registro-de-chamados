"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, MOCK_USERS } from '@/lib/mockData';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { dataService } from '@/lib/data';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
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

            // Verificar sessão armazenada localmente
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
            const queueLength = dataService.getSyncQueue().length;
            if (queueLength > 0) {
                console.log(`🔄 Conexão restabelecida! Sincronizando ${queueLength} chamado(s)...`);
                const toastId = toast.loading(`Sincronizando ${queueLength} chamado(s)...`);

                try {
                    const result = await dataService.syncPendingTickets();
                    console.log('✅ Sincronização concluída!', result);

                    if (result.synced > 0) {
                        toast.success(
                            `${result.synced} chamado(s) sincronizado(s) com sucesso!`,
                            { id: toastId, duration: 4000 }
                        );
                    } else if (result.failed > 0) {
                        toast.error(
                            `Erro ao sincronizar ${result.failed} chamado(s). Tentaremos novamente.`,
                            { id: toastId, duration: 5000 }
                        );
                    }
                } catch (error) {
                    console.error('Erro na sincronização:', error);
                    toast.error('Erro ao sincronizar chamados pendentes', { id: toastId });
                }
            }
        };

        const handleOffline = () => {
            console.log('📴 Você está offline. Chamados serão salvos localmente.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            console.log('🔐 Tentando fazer login:', email);

            // Validar senha padrão
            if (password !== '123456') {
                console.error('❌ Senha incorreta');
                return false;
            }

            console.log('✅ Senha correta, buscando usuário...');

            // Tentar buscar usuário no banco primeiro
            let foundUser = null;
            try {
                foundUser = await dataService.getUserByEmail(email);
                console.log('👤 Usuário encontrado no banco:', foundUser);
            } catch (dbError) {
                console.warn('⚠️ Banco de dados indisponível, usando dados locais...');
                // Se o banco estiver indisponível, usar dados mock
                foundUser = MOCK_USERS.find(user => user.email === email);
                console.log('👤 Usuário encontrado localmente:', foundUser);
            }

            if (foundUser) {
                setUser(foundUser);
                storage.set(STORAGE_KEYS.SESSION, foundUser);
                console.log('✅ Login bem-sucedido!');
                return true;
            }

            console.warn('⚠️ Usuário não encontrado');
            return false;
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return false;
        }
    };

    const logout = async () => {
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
