-- SCRIPT PARA VERIFICAR E CORRIGIR TABELA PROFILES
-- Execute este script no Supabase SQL Editor

-- 1. VERIFICAR estrutura da tabela profiles
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. ADICIONAR coluna must_change_password se não existir
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 3. VERIFICAR se a coluna ID tem DEFAULT (pode estar conflitando)
-- Se você vir algo como gen_random_uuid(), isso pode estar causando o problema

-- 4. OPÇÃO A: Se o ID tiver DEFAULT, remover para permitir inserção manual
-- ALTER TABLE profiles
-- ALTER COLUMN id DROP DEFAULT;

-- 5. VERIFICAR políticas RLS (Row Level Security)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 6. CRIAR política para permitir INSERT (se não existir)
-- Isso permite que usuários autenticados criem profiles
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

CREATE POLICY "Enable insert for authenticated users"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. TESTAR inserção manual (TESTE)
-- Descomente e execute para testar se funciona:
/*
INSERT INTO profiles (
    id,
    name,
    email,
    role,
    allowed_buildings,
    must_change_password,
    turma
) VALUES (
    gen_random_uuid(),
    'Teste Conselho',
    'teste.conselho@example.com',
    'conselho',
    ARRAY['onze22'],
    false,
    null
) RETURNING *;
*/

-- 8. Se o teste acima funcionar, DELETE ele:
-- DELETE FROM profiles WHERE email = 'teste.conselho@example.com';
