import { supabase } from './supabase';
import {
    Building,
    Ticket,
    User
} from './mockData';
import { notificationService } from './notificationService';

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
    isRegistered: dbTicket.is_registered,
    responsible: dbTicket.responsible
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
    // --- AUTHENTICATION ---
    signIn: async (email: string, password: string) => {
        return await supabase.auth.signInWithPassword({
            email,
            password
        });
    },

    signOut: async () => {
        return await supabase.auth.signOut();
    },

    getSession: async () => {
        return await supabase.auth.getSession();
    },

    signUp: async (email: string, password: string) => {
        return await supabase.auth.signUp({
            email,
            password
        });
    },

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
    getTickets: async (limit?: number): Promise<Ticket[]> => {
        // Se limit não for especificado, buscar apenas os últimos 50 tickets (otimização de performance)
        const defaultLimit = limit ?? 50;

        // Ordenar por ID ao invés de created_at para evitar timeout (muito mais rápido)
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('id', { ascending: false })
            .limit(defaultLimit);

        if (error) {
            console.error('Error fetching tickets:', error);
            return [];
        }

        return (data || []).map(mapTicket);
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
        // Fetch original ticket to detect changes
        const { data: originalTicket } = await supabase
            .from('tickets')
            .select('status, constructor_return, external_ticket_id, building_id, reprogramming_history')
            .eq('id', ticketId)
            .single();

        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.location) dbUpdates.location = updates.location;
        if (updates.description) dbUpdates.description = updates.description;
        if (updates.deadline) dbUpdates.deadline = updates.deadline;
        if (updates.reprogrammingDate) dbUpdates.reprogramming_date = updates.reprogrammingDate;
        if (updates.reprogrammingHistory !== undefined) {
            console.log('📝 Salvando histórico de reprogramação:', {
                ticketId,
                oldHistory: originalTicket?.reprogramming_history,
                newHistory: updates.reprogrammingHistory,
                historyLength: updates.reprogrammingHistory?.length || 0,
                isArray: Array.isArray(updates.reprogrammingHistory)
            });
            dbUpdates.reprogramming_history = updates.reprogrammingHistory;
        }
        if (updates.constructorReturn) dbUpdates.constructor_return = updates.constructorReturn;
        if (updates.externalTicketId) dbUpdates.external_ticket_id = updates.externalTicketId;
        if (updates.isRegistered !== undefined) dbUpdates.is_registered = updates.isRegistered;
        if (updates.responsible !== undefined) dbUpdates.responsible = updates.responsible;

        console.log('🔄 Atualizando ticket no banco:', { ticketId, dbUpdates });

        const { data, error } = await supabase
            .from('tickets')
            .update(dbUpdates)
            .eq('id', ticketId)
            .select();

        if (error) {
            console.error('❌ Error updating ticket:', error);
            return;
        }

        console.log('✅ Ticket atualizado com sucesso:', data);

        // Send notifications for changes
        if (originalTicket) {
            // Status change notification
            if (updates.status && updates.status !== originalTicket.status) {
                await notificationService.sendStatusChangeNotification(
                    ticketId,
                    originalTicket.status,
                    updates.status,
                    originalTicket.external_ticket_id,
                    originalTicket.building_id
                );
            }

            // Comment notification
            if (updates.constructorReturn && updates.constructorReturn !== originalTicket.constructor_return) {
                await notificationService.sendCommentNotification(
                    ticketId,
                    updates.constructorReturn,
                    originalTicket.external_ticket_id,
                    originalTicket.building_id
                );
            }
        }
    },

    getTicketsForUser: async (user: User, limit?: number): Promise<Ticket[]> => {
        if (user.role === 'admin') {
            // Admin vê TODOS os tickets - buscar em lotes menores para evitar timeout
            console.log('🔄 Iniciando carregamento de TODOS os tickets para admin...');
            let allTickets: any[] = [];
            let from = 0;
            const batchSize = 500; // REDUZIDO para 500 para evitar timeout
            let hasMore = true;
            let iteration = 0;
            const startTime = Date.now();

            while (hasMore) {
                iteration++;
                console.log(`📦 Lote ${iteration}: buscando tickets ${from} a ${from + batchSize - 1}...`);

                try {
                    const { data, error } = await supabase
                        .from('tickets')
                        .select('*')
                        .order('id', { ascending: false })
                        .range(from, from + batchSize - 1);

                    if (error) {
                        console.error('❌ Error fetching admin tickets:', error);
                        // Se der timeout, tentar com lote ainda menor
                        if (error.code === '57014' && batchSize > 100) {
                            console.warn('⚠️ Timeout detectado! Reduzindo tamanho do lote...');
                            // Não quebra o loop, tenta novamente
                            continue;
                        }
                        break;
                    }

                    console.log(`   📊 Lote ${iteration}: recebidos ${data?.length || 0} tickets em ${Date.now() - startTime}ms`);

                    if (data && data.length > 0) {
                        allTickets = [...allTickets, ...data];
                        from += batchSize;
                        hasMore = data.length === batchSize;
                        console.log(`   ✅ Total acumulado: ${allTickets.length} | Continuar: ${hasMore ? 'SIM' : 'NÃO'}`);
                    } else {
                        console.log(`   ⚠️ Nenhum ticket retornado, finalizando...`);
                        hasMore = false;
                    }
                } catch (err) {
                    console.error('❌ Erro na busca:', err);
                    break;
                }
            }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Admin ${user.name}: ${allTickets.length} chamados carregados em ${iteration} lote(s) (${totalTime}s)`);
            return allTickets.map(mapTicket);
        }

        // Usuários comuns veem TODOS os chamados dos prédios deles - buscar em lotes
        console.log(`🔄 Carregando tickets para usuário ${user.name} (${user.allowedBuildings.length} prédios)...`);
        let allTickets: any[] = [];
        let from = 0;
        const batchSize = 500; // REDUZIDO para 500 para evitar timeout
        let hasMore = true;
        let iteration = 0;
        const startTime = Date.now();

        while (hasMore) {
            iteration++;
            console.log(`📦 Lote ${iteration}: buscando tickets ${from} a ${from + batchSize - 1}...`);

            try {
                const { data, error } = await supabase
                    .from('tickets')
                    .select('*')
                    .in('building_id', user.allowedBuildings)
                    .order('id', { ascending: false })
                    .range(from, from + batchSize - 1);

                if (error) {
                    console.error('❌ Error fetching user tickets:', error);
                    if (error.code === '57014' && batchSize > 100) {
                        console.warn('⚠️ Timeout detectado! Reduzindo tamanho do lote...');
                        continue;
                    }
                    break;
                }

                console.log(`   📊 Lote ${iteration}: recebidos ${data?.length || 0} tickets em ${Date.now() - startTime}ms`);

                if (data && data.length > 0) {
                    allTickets = [...allTickets, ...data];
                    from += batchSize;
                    hasMore = data.length === batchSize;
                    console.log(`   ✅ Total acumulado: ${allTickets.length} | Continuar: ${hasMore ? 'SIM' : 'NÃO'}`);
                } else {
                    console.log(`   ⚠️ Nenhum ticket retornado, finalizando...`);
                    hasMore = false;
                }
            } catch (err) {
                console.error('❌ Erro na busca:', err);
                break;
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Usuário ${user.name}: ${allTickets.length} chamados carregados em ${iteration} lote(s) (${totalTime}s)`);
        return allTickets.map(mapTicket);
    },

    // Buscar contagem de pendentes por prédio (otimizado para painel admin)
    getPendingCountsByBuilding: async (): Promise<{ buildingId: string; count: number }[]> => {
        console.log('🔍 Buscando contagem de pendentes por prédio...');

        const { data, error } = await supabase
            .from('tickets')
            .select('building_id')
            .or('is_registered.is.null,is_registered.eq.false');

        if (error) {
            console.error('Error fetching pending counts:', error);
            return [];
        }

        // Agrupar por building_id e contar
        const counts: { [key: string]: number } = {};
        (data || []).forEach(ticket => {
            const buildingId = ticket.building_id;
            counts[buildingId] = (counts[buildingId] || 0) + 1;
        });

        const result = Object.entries(counts).map(([buildingId, count]) => ({
            buildingId,
            count
        }));

        console.log(`✅ Contagem retornada para ${result.length} prédios:`, result);
        return result;
    },

    // Buscar tickets por prédio específico (para admin)
    getTicketsByBuilding: async (buildingId: string, onlyPending: boolean = false): Promise<Ticket[]> => {
        console.log(`🔍 Buscando tickets - Prédio: ${buildingId}, Apenas pendentes: ${onlyPending}`);

        let query = supabase
            .from('tickets')
            .select('*')
            .eq('building_id', buildingId)
            .order('id', { ascending: false });

        if (onlyPending) {
            query = query.or('is_registered.is.null,is_registered.eq.false');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching building tickets:', error);
            return [];
        }

        console.log(`✅ Retornados ${data?.length || 0} tickets do prédio ${buildingId}`);
        return (data || []).map(mapTicket);
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
        console.log('🗑️ Iniciando exclusão do ticket:', ticketId);

        const { data, error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', ticketId)
            .select();

        console.log('📊 Resposta do Supabase:', { data, error });

        if (error) {
            console.error('❌ Error deleting ticket:', error);
            console.error('Detalhes do erro:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw new Error(`Erro ao excluir chamado: ${error.message}`);
        }

        if (!data || data.length === 0) {
            console.warn('⚠️ Nenhum registro foi deletado. Ticket não encontrado ou sem permissão.');
            throw new Error('Chamado não encontrado ou você não tem permissão para excluí-lo.');
        }

        console.log('✅ Ticket deletado com sucesso:', data);
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
        constructorReturn?: string;
        responsible?: string;
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
            constructor_return: ticketData.constructorReturn || null,
            responsible: ticketData.responsible || null,
            // Chamados importados sempre são marcados como registrados (não aparecem em "Pendentes")
            is_registered: true,
        };

        const { error } = await supabase
            .from('tickets')
            .insert(insertData);

        if (error) throw error;
    }
};
