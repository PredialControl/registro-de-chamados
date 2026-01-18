-- Script para configurar políticas RLS (Row Level Security) no Supabase
-- Execute este script no SQL Editor do Supabase

-- Habilitar RLS na tabela tickets (se ainda não estiver)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura de tickets" ON public.tickets;
DROP POLICY IF EXISTS "Permitir inserção de tickets" ON public.tickets;
DROP POLICY IF EXISTS "Permitir atualização de tickets" ON public.tickets;
DROP POLICY IF EXISTS "Permitir exclusão de tickets" ON public.tickets;

-- Política para LEITURA (SELECT)
-- Permite que qualquer usuário autenticado ou anônimo leia tickets
CREATE POLICY "Permitir leitura de tickets"
ON public.tickets
FOR SELECT
TO anon, authenticated
USING (true);

-- Política para INSERÇÃO (INSERT)
-- Permite que qualquer usuário autenticado ou anônimo crie tickets
CREATE POLICY "Permitir inserção de tickets"
ON public.tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para ATUALIZAÇÃO (UPDATE)
-- Permite que qualquer usuário autenticado ou anônimo atualize tickets
CREATE POLICY "Permitir atualização de tickets"
ON public.tickets
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Política para EXCLUSÃO (DELETE)
-- Permite que qualquer usuário autenticado ou anônimo delete tickets
CREATE POLICY "Permitir exclusão de tickets"
ON public.tickets
FOR DELETE
TO anon, authenticated
USING (true);

-- Fazer o mesmo para a tabela buildings
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de buildings" ON public.buildings;
DROP POLICY IF EXISTS "Permitir inserção de buildings" ON public.buildings;
DROP POLICY IF EXISTS "Permitir atualização de buildings" ON public.buildings;
DROP POLICY IF EXISTS "Permitir exclusão de buildings" ON public.buildings;

CREATE POLICY "Permitir leitura de buildings"
ON public.buildings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir inserção de buildings"
ON public.buildings FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização de buildings"
ON public.buildings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir exclusão de buildings"
ON public.buildings FOR DELETE TO anon, authenticated USING (true);

-- Fazer o mesmo para a tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserção de profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualização de profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir exclusão de profiles" ON public.profiles;

CREATE POLICY "Permitir leitura de profiles"
ON public.profiles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir inserção de profiles"
ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização de profiles"
ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir exclusão de profiles"
ON public.profiles FOR DELETE TO anon, authenticated USING (true);

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tickets', 'buildings', 'profiles')
ORDER BY tablename, policyname;
