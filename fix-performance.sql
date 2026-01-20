-- SQL para executar no Supabase para corrigir performance

-- 1. Criar índice no created_at (acelera ordenação)
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC NULLS LAST);

-- 2. Criar índice no building_id (acelera filtros)
CREATE INDEX IF NOT EXISTS idx_tickets_building_id ON tickets(building_id);

-- 3. Criar índice no status (acelera filtros)
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- 4. Verificar quantos tickets têm created_at NULL
SELECT COUNT(*) as total_null_dates
FROM tickets
WHERE created_at IS NULL;

-- 5. Ver distribuição por status
SELECT status, COUNT(*) as total
FROM tickets
GROUP BY status
ORDER BY total DESC;
