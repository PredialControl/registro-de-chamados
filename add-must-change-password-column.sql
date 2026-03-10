-- Adicionar coluna must_change_password na tabela profiles
-- Esta coluna indica se o usuário deve trocar a senha no próximo login

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN profiles.must_change_password IS 'Flag que indica se o usuário deve trocar a senha obrigatoriamente no próximo acesso';

-- Exemplo: Marcar um usuário para trocar a senha
-- UPDATE profiles SET must_change_password = true WHERE email = 'usuario@exemplo.com';
