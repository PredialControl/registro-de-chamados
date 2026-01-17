-- Corrigir chamados importados que estão marcados como não registrados
-- Chamados importados (que têm created_at definido pelo usuário, não pelo sistema)
-- devem estar sempre marcados como is_registered = true

UPDATE tickets
SET is_registered = true
WHERE is_registered = false OR is_registered IS NULL;

-- Verificar quantos foram atualizados
SELECT COUNT(*) as "Chamados corrigidos"
FROM tickets
WHERE is_registered = true;
