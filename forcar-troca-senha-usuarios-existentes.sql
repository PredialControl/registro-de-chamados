-- Script para forçar troca de senha em usuários existentes
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna se não existir
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 2. OPÇÃO A: Forçar TODOS os usuários (exceto admins) a trocarem senha
UPDATE profiles
SET must_change_password = true
WHERE role != 'admin';

-- 3. OPÇÃO B: Forçar apenas usuários específicos
-- UPDATE profiles
-- SET must_change_password = true
-- WHERE email IN ('usuario1@exemplo.com', 'usuario2@exemplo.com');

-- 4. OPÇÃO C: Forçar usuários de um prédio específico
-- UPDATE profiles
-- SET must_change_password = true
-- WHERE 'predio-id' = ANY(allowed_buildings);

-- 5. Verificar quem precisa trocar senha
SELECT
    name,
    email,
    role,
    must_change_password
FROM profiles
WHERE must_change_password = true
ORDER BY name;

-- 6. Se quiser DESFAZER e permitir que um usuário não precise trocar:
-- UPDATE profiles
-- SET must_change_password = false
-- WHERE email = 'usuario@exemplo.com';
