-- Desativar a troca de senha obrigatória para todos os usuários
-- Voltar ao sistema anterior com senha fixa 123456

-- Desativar flag must_change_password para todos os usuários
UPDATE profiles
SET must_change_password = false
WHERE must_change_password = true;

-- Verificar resultado
SELECT
    id,
    name,
    email,
    role,
    must_change_password
FROM profiles
ORDER BY name;
