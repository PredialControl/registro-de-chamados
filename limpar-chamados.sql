-- ============================================
-- SCRIPT PARA LIMPAR TODOS OS CHAMADOS
-- ============================================
-- ATENÇÃO: Isso vai deletar TODOS os chamados!
-- Esta ação é IRREVERSÍVEL!
-- ============================================

-- Ver quantos chamados existem antes de deletar
SELECT COUNT(*) as total_chamados FROM tickets;

-- DESCOMENTE a linha abaixo para DELETAR TODOS OS CHAMADOS
-- DELETE FROM tickets;

-- Verificar se está vazio
-- SELECT COUNT(*) as total_chamados_apos_delete FROM tickets;

-- ============================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá em "SQL Editor" no menu lateral
-- 4. Cole este script
-- 5. Execute a primeira query (SELECT COUNT) para ver quantos chamados tem
-- 6. Descomente a linha "DELETE FROM tickets;"
-- 7. Execute novamente para deletar todos
-- 8. Execute a última query para confirmar que está vazio
-- ============================================
