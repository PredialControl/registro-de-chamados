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

export const dataService = {
    // --- OFFLINE SYNC ---
    getSyncQueue: (): any[] => {
        if (typeof window === 'undefined') return [];
        const queue = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
        return queue ? JSON.parse(queue) : [];
    },

    addToSyncQueue: (ticketData: any) => {
        try {
            const queue = dataService.getSyncQueue();
            const pendingTicket = {
                ...ticketData,
                tempId: Date.now().toString(),
                queuedAt: new Date().toISOString()
            };
            queue.push(pendingTicket);
            localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
            console.log('✅ Ticket adicionado à fila offline:', pendingTicket.tempId);
            return pendingTicket;
        } catch (error) {
            console.error('❌ Erro ao salvar ticket na fila offline:', error);
            throw new Error('Não foi possível salvar o chamado localmente. Verifique o armazenamento do navegador.');
        }
    },

    clearSyncQueue: () => {
        localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    },

    syncPendingTickets: async (): Promise<void> => {
        const queue = dataService.getSyncQueue();
        if (queue.length === 0) return;

        console.log(`Attempting to sync ${queue.length} pending tickets...`);
        const remaining: any[] = [];

        for (const ticket of queue) {
            try {
                const { error } = await supabase
                    .from('tickets')
                    .insert({
                        building_id: ticket.buildingId,
                        user_id: ticket.userId,
                        location: ticket.location,
                        description: ticket.description,
                        photo_urls: ticket.photoUrls,
                        status: 'aguardando_vistoria'
                    });

                if (error) throw error;
            } catch (err) {
                console.error('Failed to sync ticket, keeping in queue:', err);
                remaining.push(ticket);
            }
        }

        if (remaining.length === 0) {
            dataService.clearSyncQueue();
        } else {
            localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(remaining));
        }
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
            const pending = dataService.addToSyncQueue(ticketData);
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
            const pending = dataService.addToSyncQueue(ticketData);
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
    }
};
