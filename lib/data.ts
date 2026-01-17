import { supabase } from './supabase';
import {
    Building,
    Ticket,
    User
} from './mockData';

// Helper to map DB ticket to Frontend ticket
const mapTicket = (dbTicket: any): Ticket => ({
    id: dbTicket.id,
    buildingId: dbTicket.building_id,
    userId: dbTicket.user_id,
    location: dbTicket.location,
    description: dbTicket.description,
    photoUrls: dbTicket.photo_urls || [],
    status: dbTicket.status,
    createdAt: dbTicket.created_at,
    deadline: dbTicket.deadline,
    reprogrammingDate: dbTicket.reprogramming_date,
    reprogrammingHistory: dbTicket.reprogramming_history || [],
    constructorReturn: dbTicket.constructor_return,
    externalTicketId: dbTicket.external_ticket_id,
    isRegistered: dbTicket.is_registered
});

// Helper to map DB user to Frontend user
const mapUser = (dbUser: any): User => ({
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role as any,
    allowedBuildings: dbUser.allowed_buildings || [],
    turma: dbUser.turma
});

const STORAGE_KEYS = {
    SYNC_QUEUE: 'chamados_sync_queue'
};

// Lock para evitar race conditions ao adicionar na fila
let queueLock: Promise<void> = Promise.resolve();

export const dataService = {
    // --- OFFLINE SYNC ---
    getSyncQueue: (): any[] => {
        if (typeof window === 'undefined') return [];
        try {
            const queueStr = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
            if (!queueStr) {
                console.log('📋 Fila vazia, retornando []');
                return [];
            }
            const queue = JSON.parse(queueStr);
            console.log(`📋 Fila atual tem ${queue.length} ticket(s):`, queue.map((t: any) => t.tempId));
            return queue;
        } catch (error) {
            console.error('❌ Erro ao ler fila de sincronização:', error);
            // Se houver erro de parse, tentar limpar e começar de novo
            try {
                localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
            } catch (e) {
                // Ignorar erro de remoção
            }
            return [];
        }
    },

    addToSyncQueue: async (ticketData: any) => {
        const pendingTicket = {
            ...ticketData,
            tempId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            queuedAt: new Date().toISOString()
        };

        // Aguardar o lock anterior liberar
        await queueLock;

        // Criar novo lock para esta operação
        let releaseLock: () => void;
        queueLock = new Promise(resolve => {
            releaseLock = resolve;
        });

        try {
            console.log(`⏳ Aguardando lock para adicionar ticket ${pendingTicket.tempId}...`);

            // Ler fila atual do localStorage
            const queueStr = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
            const queue = queueStr ? JSON.parse(queueStr) : [];
            const queueBefore = queue.length;

            console.log(`📋 Fila atual antes de adicionar: ${queueBefore} ticket(s)`);

            // Adicionar novo ticket
            queue.push(pendingTicket);

            // Salvar de volta
            localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));

            // Verificar se foi salvo corretamente
            const verifyQueue = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '[]');
            console.log(`✅ Ticket ${pendingTicket.tempId} adicionado à fila`);
            console.log(`   Fila antes: ${queueBefore} | depois: ${verifyQueue.length}`);
            console.log(`   IDs na fila:`, verifyQueue.map((t: any) => t.tempId.substring(0, 20) + '...'));

            if (verifyQueue.length !== queue.length) {
                console.error('⚠️ AVISO: Tamanho da fila não bate! Esperado:', queue.length, 'Real:', verifyQueue.length);
            }
        } catch (error) {
            console.error('❌ Erro ao salvar ticket na fila offline:', error);
            console.warn('⚠️ Ticket criado mas não foi salvo para sincronização. Será perdido ao recarregar a página.');
        } finally {
            // Liberar lock
            releaseLock!();
        }

        return pendingTicket;
    },

    clearSyncQueue: () => {
        localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    },

    syncPendingTickets: async (): Promise<{ synced: number; failed: number }> => {
        const queue = dataService.getSyncQueue();
        if (queue.length === 0) {
            console.log('📭 Nenhum chamado pendente para sincronizar');
            return { synced: 0, failed: 0 };
        }

        console.log(`🔄 Tentando sincronizar ${queue.length} chamado(s) pendente(s)...`);
        const remaining: any[] = [];
        let syncedCount = 0;

        for (const ticket of queue) {
            try {
                console.log(`📤 Sincronizando ticket ${ticket.tempId}...`);
                const { data, error } = await supabase
                    .from('tickets')
                    .insert({
                        building_id: ticket.buildingId,
                        user_id: ticket.userId,
                        location: ticket.location,
                        description: ticket.description,
                        photo_urls: ticket.photoUrls,
                        status: 'aguardando_vistoria'
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('❌ Erro ao sincronizar ticket:', error);
                    throw error;
                }

                console.log('✅ Ticket sincronizado com sucesso! ID:', data.id);
                syncedCount++;
            } catch (err) {
                console.error('❌ Falha ao sincronizar ticket, mantendo na fila:', err);
                remaining.push(ticket);
            }
        }

        if (remaining.length === 0) {
            console.log('✅ Todos os chamados foram sincronizados! Limpando fila.');
            dataService.clearSyncQueue();
        } else {
            console.warn(`⚠️ ${remaining.length} chamado(s) ainda na fila após sincronização`);
            localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(remaining));
        }

        return { synced: syncedCount, failed: remaining.length };
    },

    // --- MIGRATION (No longer needed with real DB, but kept for interface compatibility) ---
    checkAndSyncData: async (): Promise<void> => {
        await dataService.syncPendingTickets();
    },

    // --- USERS ---
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return data.map(mapUser);
    },

    getUserByEmail: async (email: string): Promise<User | null> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) return null;
        return mapUser(data);
    },

    // --- BUILDINGS ---
    getBuildings: async (): Promise<Building[]> => {
        const { data, error } = await supabase
            .from('buildings')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching buildings:', error);
            return [];
        }
        return data;
    },

    getBuildingsForUser: async (user: User): Promise<Building[]> => {
        const allBuildings = await dataService.getBuildings();
        if (user.role === 'admin') return allBuildings;
        return allBuildings.filter(b => user.allowedBuildings.includes(b.id));
    },

    // --- TICKETS ---
    getTickets: async (): Promise<Ticket[]> => {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
            return [];
        }
        return data.map(mapTicket);
    },

    createTicket: async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'status'>): Promise<{ ticket: Ticket | null; wasOffline: boolean }> => {
        // Se estiver explicitamente offline, pular tentativa no Supabase
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

        if (isOffline) {
            console.log('📴 Usuário offline detectado, salvando ticket localmente...');
            const pending = await dataService.addToSyncQueue(ticketData);
            return {
                ticket: {
                    id: pending.tempId,
                    ...ticketData,
                    status: 'aguardando_vistoria',
                    createdAt: pending.queuedAt
                } as any,
                wasOffline: true
            };
        }

        try {
            console.log('🌐 Tentando enviar ticket online...');

            // Criar promise com timeout de 10 segundos
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout: sem resposta do servidor')), 10000);
            });

            const insertPromise = supabase
                .from('tickets')
                .insert({
                    building_id: ticketData.buildingId,
                    user_id: ticketData.userId,
                    location: ticketData.location,
                    description: ticketData.description,
                    photo_urls: ticketData.photoUrls,
                    status: 'aguardando_vistoria'
                })
                .select()
                .single();

            const result = await Promise.race([insertPromise, timeoutPromise]) as any;

            if (result.error) throw result.error;

            console.log('✅ Ticket enviado online com sucesso!');
            return {
                ticket: mapTicket(result.data),
                wasOffline: false
            };
        } catch (error) {
            console.error('❌ Erro de rede ou timeout, salvando localmente:', error);
            const pending = await dataService.addToSyncQueue(ticketData);
            return {
                ticket: {
                    id: pending.tempId,
                    ...ticketData,
                    status: 'aguardando_vistoria',
                    createdAt: pending.queuedAt
                } as any,
                wasOffline: true
            };
        }
    },

    updateTicket: async (ticketId: string, updates: Partial<Ticket>): Promise<void> => {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.location) dbUpdates.location = updates.location;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.deadline) dbUpdates.deadline = updates.deadline;
        if (updates.reprogrammingDate) dbUpdates.reprogramming_date = updates.reprogrammingDate;
        if (updates.reprogrammingHistory) dbUpdates.reprogramming_history = updates.reprogrammingHistory;
        if (updates.constructorReturn) dbUpdates.constructor_return = updates.constructorReturn;
        if (updates.externalTicketId) dbUpdates.external_ticket_id = updates.externalTicketId;
        if (updates.isRegistered !== undefined) dbUpdates.is_registered = updates.isRegistered;

        const { error } = await supabase
            .from('tickets')
            .update(dbUpdates)
            .eq('id', ticketId);

        if (error) console.error('Error updating ticket:', error);
    },

    getTicketsForUser: async (user: User): Promise<Ticket[]> => {
        if (user.role === 'admin') return dataService.getTickets();

        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user tickets:', error);
            return [];
        }
        return data.map(mapTicket);
    },

    // --- USER MANAGEMENT (Admin only) ---
    createUser: async (userData: Omit<User, 'id'>): Promise<User | null> => {
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                name: userData.name,
                email: userData.email,
                role: userData.role,
                turma: userData.turma,
                allowed_buildings: userData.allowedBuildings
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return null;
        }
        return mapUser(data);
    },

    updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.turma) dbUpdates.turma = updates.turma;
        if (updates.allowedBuildings) dbUpdates.allowed_buildings = updates.allowedBuildings;

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId);

        if (error) console.error('Error updating user:', error);
    },

    deleteUser: async (userId: string): Promise<void> => {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) console.error('Error deleting user:', error);
    },

    // --- BUILDING MANAGEMENT (Admin only) ---
    createBuilding: async (buildingData: Omit<Building, 'id'>): Promise<Building | null> => {
        // For production buildings, we might want to use a specific ID slug or UUID
        const id = buildingData.name.toLowerCase().replace(/\s+/g, '-');
        const { data, error } = await supabase
            .from('buildings')
            .insert({
                id,
                name: buildingData.name,
                address: buildingData.address
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating building:', error);
            return null;
        }
        return data;
    },

    updateBuilding: async (buildingId: string, updates: Partial<Building>): Promise<void> => {
        const { error } = await supabase
            .from('buildings')
            .update(updates)
            .eq('id', buildingId);

        if (error) console.error('Error updating building:', error);
    },

    deleteBuilding: async (buildingId: string): Promise<void> => {
        const { error } = await supabase
            .from('buildings')
            .delete()
            .eq('id', buildingId);

        if (error) console.error('Error deleting building:', error);
    },

    deleteTicket: async (ticketId: string): Promise<void> => {
        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', ticketId);

        if (error) console.error('Error deleting ticket:', error);
    },

    // Importação de chamados (permite setar created_at e status customizado)
    importTicket: async (ticketData: {
        buildingId: string;
        userId: string;
        location: string;
        description: string;
        photoUrls: string[];
        status: string;
        createdAt?: string;
        deadline?: string;
        externalTicketId?: string;
    }): Promise<void> => {
        // Construir objeto base - SEMPRE incluir deadline e created_at (null se vazio)
        const insertData: any = {
            building_id: ticketData.buildingId,
            user_id: ticketData.userId,
            location: ticketData.location,
            description: ticketData.description,
            photo_urls: ticketData.photoUrls,
            status: ticketData.status,
            // Se não tiver createdAt, enviar null ao invés de data de hoje
            created_at: ticketData.createdAt || null,
            // SEMPRE enviar deadline: null quando vazio, valor quando tem
            deadline: ticketData.deadline || null,
            external_ticket_id: ticketData.externalTicketId || null,
            is_registered: ticketData.externalTicketId ? true : false,
        };

        // LOG CRÍTICO
        console.log('🚨🚨🚨 ENVIANDO AO SUPABASE:');
        console.log('   deadline recebido:', ticketData.deadline);
        console.log('   deadline enviado:', insertData.deadline);
        console.log('   É null?', insertData.deadline === null);

        const { error } = await supabase
            .from('tickets')
            .insert(insertData);

        if (error) throw error;
    }
};
