export type UserRole = 'admin' | 'building_admin' | 'user';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    allowedBuildings: string[]; // Building IDs
    turma?: string;
}

export interface Building {
    id: string;
    name: string;
    address: string;
}

export interface ReprogrammingEntry {
    date: string; // Data da reprogramação
    reason: string; // Motivo da reprogramação
    updatedAt: string; // Data em que foi atualizado
}

export interface Ticket {
    id: string;
    buildingId: string;
    userId: string;
    location: string;
    description: string;
    photoUrls: string[];
    status: 'itens_apontados' | 'em_andamento' | 'improcedente' | 'aguardando_vistoria' | 'concluido' | 'f_indevido';
    createdAt: string;
    deadline?: string;
    reprogrammingDate?: string;
    reprogrammingHistory?: ReprogrammingEntry[];
    constructorReturn?: string;
    externalTicketId?: string;
    isRegistered?: boolean;
    responsible?: 'Condomínio' | 'Construtora';
}

export const MOCK_BUILDINGS: Building[] = [
    { id: 'onze22', name: 'Onze22', address: 'Rua Agissê, 247 - Jardim das Bandeiras, São Paulo - SP, 05439-010' },
    { id: 'brook-you', name: 'Brook You', address: 'R. Cacilda Becker, 35 - Jardim das Acacias, São Paulo - SP, 04704-060' },
    { id: 'jacaranda', name: 'Jacarandá', address: 'Rua Edith Junqueira de Azevedo Marques, 195 - Parque Munhoz, São Paulo - SP, 05782-390' },
    { id: 'grand-living-t1', name: 'Grand Living Torre 1', address: 'R. Caçador de Esmeraldas, 245 - Vila São José, São Paulo - SP, 04274-050' },
    { id: 'samoa', name: 'Samoa', address: 'Av. Dr. Altino Arantes, 1132 - Vila Clementino, São Paulo - SP, 04042-030' },
    { id: 'living-firenze', name: 'Living Firenze', address: 'R. Cantagalo, 2167 - Tatuapé, São Paulo - SP, 03319-002' },
    { id: 'maceio-88', name: 'Maceió 88', address: 'R. Maceió, 88 - Consolação, São Paulo - SP, 01302-010' },
    { id: 'griffe', name: 'Griffe', address: 'R. Machado de Assis, 879 - Bela Vista, Osasco - SP, 16480-011' },
    { id: 'cyrela-foryou', name: 'Cyrela for You Perdizes', address: 'R. Dr. Homem de Melo, 380 - Perdizes, São Paulo - SP, 05007-001' },
    { id: 'living-heredita', name: 'Living Hereditá', address: 'R. Marquês de Olinda, 125 - Vila Dom Pedro I, São Paulo - SP, 04277-000' },
    { id: 'capote-210', name: 'Capote 210', address: 'R. Capote Valente, 208 - Pinheiros, São Paulo - SP, 05402-000' },
    { id: 'living-faria-lima', name: 'Living Faria lima', address: 'Rua Valério de Carvalho, 63 - Pinheiros, São Paulo - SP, 05422-040' },
    { id: 'duq-centra', name: 'Duq Centra Hauses', address: 'R. Duque de Caxias, 617 - Centro, Barueri - SP, 06401-010' },
    { id: 'helbor-patteo', name: 'Helbor Patteo', address: 'Av. Pref. Hirant Sanazar, 862 - Bela Vista, Osasco - SP, 06030-095' },
    { id: 'helbor-duo', name: 'Helbor Duo', address: 'Av. Brigadeiro Luís Antônio, 3484 - Jardim Paulista, São Paulo - SP, 01402-00' },
    { id: 'grand-living-t2', name: 'Grand Living Torre 2', address: 'R. Caçador de Esmeraldas, 245 - Vila São José, São Paulo - SP, 04274-050' },
    { id: 'dream-panamby', name: 'Dream Panamby', address: 'Av. Alberto Augusto Alves, 270 - Vila Andrade' },
];

export const MOCK_USERS: User[] = [
    {
        id: 'admin-1',
        name: 'Administrador',
        email: 'admin@sistema.com',
        role: 'admin',
        allowedBuildings: [
            'onze22', 'brook-you', 'jacaranda', 'grand-living-t1', 'samoa',
            'living-firenze', 'maceio-88', 'griffe', 'cyrela-foryou',
            'living-heredita', 'capote-210', 'living-faria-lima', 'duq-centra',
            'helbor-patteo', 'helbor-duo', 'grand-living-t2', 'dream-panamby'
        ],
        turma: 'ADMIN'
    }
];
