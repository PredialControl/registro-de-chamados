-- Script para criar usuário tipo 'conselho'
-- Execute este script no Supabase SQL Editor

-- OPÇÃO 1: Criar novo usuário conselho
INSERT INTO profiles (
    id,
    name,
    email,
    role,
    allowed_buildings,
    must_change_password
)
VALUES (
    gen_random_uuid(),  -- Gera um UUID aleatório
    'Conselho do Prédio',
    'conselho@predio.com',  -- ALTERE para o email desejado
    'conselho',
    ARRAY['onze22'],  -- ALTERE para os prédios que pode visualizar
    false  -- true = força trocar senha no primeiro login
);

-- OPÇÃO 2: Transformar usuário existente em 'conselho'
-- UPDATE profiles
-- SET role = 'conselho'
-- WHERE email = 'usuario@exemplo.com';

-- Verificar usuários tipo conselho
SELECT
    name,
    email,
    role,
    allowed_buildings,
    must_change_password
FROM profiles
WHERE role = 'conselho';

-- IMPORTANTE: A senha padrão continua sendo 123456
-- O usuário vai conseguir fazer login com:
-- Email: conselho@predio.com
-- Senha: 123456
