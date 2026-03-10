-- SOLUÇÃO: Adicionar 'conselho' aos valores permitidos na constraint
-- Execute este SQL no Supabase SQL Editor

-- 1. REMOVER a constraint antiga
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. CRIAR nova constraint com 'conselho' incluído
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'building_admin', 'user', 'conselho'));

-- 3. VERIFICAR se funcionou
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_role_check';

-- 4. TESTAR atualização de um usuário existente para conselho (OPCIONAL)
-- UPDATE profiles
-- SET role = 'conselho'
-- WHERE email = 'algum.usuario@exemplo.com';
