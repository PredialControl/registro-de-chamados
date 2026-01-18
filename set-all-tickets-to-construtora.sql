-- Script para definir todos os chamados existentes como responsabilidade da Construtora
-- Execute este script no SQL Editor do Supabase

-- Atualizar todos os tickets que não têm responsável definido
UPDATE public.tickets
SET responsible = 'Construtora'
WHERE responsible IS NULL;

-- Verificar quantos foram atualizados
SELECT COUNT(*) as total_sem_responsavel
FROM public.tickets
WHERE responsible IS NULL;

-- Verificar distribuição de responsáveis
SELECT
    responsible,
    COUNT(*) as quantidade
FROM public.tickets
GROUP BY responsible
ORDER BY quantidade DESC;

-- Listar alguns exemplos de tickets atualizados
SELECT
    id,
    external_ticket_id,
    location,
    responsible,
    status,
    created_at
FROM public.tickets
ORDER BY created_at DESC
LIMIT 10;
