-- ============================================
-- OTIMIZAÇÃO DE ÍNDICES PARA O SUPABASE
-- ============================================
-- Este script adiciona índices para melhorar a performance das queries
-- e evitar status amarelo no Supabase

-- IMPORTANTE: Execute este SQL no SQL Editor do Supabase
-- Dashboard -> SQL Editor -> New Query -> Cole e Execute

-- ============================================
-- 1. ÍNDICE POR BUILDING_ID (query mais comum)
-- ============================================
-- Melhora drasticamente queries filtradas por prédio
CREATE INDEX IF NOT EXISTS idx_tickets_building_id
ON tickets(building_id);

-- ============================================
-- 2. ÍNDICE COMPOSTO: BUILDING_ID + ID (ordenação)
-- ============================================
-- Melhora queries que filtram por prédio E ordenam por ID
CREATE INDEX IF NOT EXISTS idx_tickets_building_id_id
ON tickets(building_id, id DESC);

-- ============================================
-- 3. ÍNDICE POR STATUS
-- ============================================
-- Melhora queries filtradas por status
CREATE INDEX IF NOT EXISTS idx_tickets_status
ON tickets(status);

-- ============================================
-- 4. ÍNDICE COMPOSTO: BUILDING_ID + STATUS
-- ============================================
-- Melhora queries filtradas por prédio E status
CREATE INDEX IF NOT EXISTS idx_tickets_building_id_status
ON tickets(building_id, status);

-- ============================================
-- 5. ÍNDICE POR IS_REGISTERED (pendentes)
-- ============================================
-- Melhora queries que buscam tickets pendentes
CREATE INDEX IF NOT EXISTS idx_tickets_is_registered
ON tickets(is_registered);

-- ============================================
-- 6. ÍNDICE COMPOSTO: BUILDING_ID + IS_REGISTERED
-- ============================================
-- Melhora queries de tickets pendentes por prédio
CREATE INDEX IF NOT EXISTS idx_tickets_building_id_is_registered
ON tickets(building_id, is_registered);

-- ============================================
-- 7. ÍNDICE POR USER_ID
-- ============================================
-- Melhora queries filtradas por usuário
CREATE INDEX IF NOT EXISTS idx_tickets_user_id
ON tickets(user_id);

-- ============================================
-- 8. ÍNDICE POR CREATED_AT (ordenação por data)
-- ============================================
-- Melhora queries ordenadas por data de criação
CREATE INDEX IF NOT EXISTS idx_tickets_created_at
ON tickets(created_at DESC);

-- ============================================
-- VERIFICAR ÍNDICES CRIADOS
-- ============================================
-- Execute esta query para verificar se os índices foram criados:
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'tickets'
ORDER BY indexname;

-- ============================================
-- ANÁLISE DE PERFORMANCE
-- ============================================
-- Após criar os índices, execute estas queries para verificar:

-- Ver plano de execução de uma query comum
EXPLAIN ANALYZE
SELECT * FROM tickets
WHERE building_id = 'seu-building-id-aqui'
ORDER BY id DESC
LIMIT 500;

-- Ver estatísticas da tabela
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE tablename = 'tickets';
