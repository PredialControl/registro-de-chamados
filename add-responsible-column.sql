-- Adicionar coluna 'responsible' à tabela tickets
-- Execute este SQL no Supabase Dashboard -> SQL Editor

ALTER TABLE tickets
ADD COLUMN responsible TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN tickets.responsible IS 'Responsável pelo chamado: Condomínio ou Construtora';
