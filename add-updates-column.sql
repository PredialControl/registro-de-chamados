-- Adicionar coluna 'updates' (Historico de atualizacoes) na tabela tickets
-- Esta coluna armazena o historico de pareceres da Construtora, Condominio e Engenharia

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS updates JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tickets.updates IS 'Historico de atualizacoes/pareceres do chamado (Construtora, Condominio, Engenharia)';

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tickets' AND column_name = 'updates';
