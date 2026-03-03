-- Adicionar coluna engineering_opinion (Parecer da Engenharia) na tabela tickets
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS engineering_opinion TEXT;

-- Comentário descritivo da coluna
COMMENT ON COLUMN tickets.engineering_opinion IS 'Parecer/opinião da engenharia sobre o chamado';
