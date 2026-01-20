# Autenticação do Sistema

## Senha Padrão

**Todos os usuários usam a mesma senha: `123456`**

O sistema valida apenas se:
1. O email existe na tabela `profiles`
2. A senha digitada é `123456`

## Como fazer login

1. Acesse https://registro-de-chamados.vercel.app/login
2. Digite o email do usuário (deve estar cadastrado em `profiles`)
3. Digite a senha: `123456`
4. Clique em "Entrar"

## Criar novo usuário

Os usuários são criados diretamente na tabela `profiles` do Supabase.

### Via SQL (Supabase Dashboard):

```sql
INSERT INTO profiles (id, email, name, role, allowed_buildings)
VALUES (
  gen_random_uuid(),           -- Gera ID único
  'usuario@email.com',         -- Email do usuário
  'Nome do Usuário',           -- Nome completo
  'admin',                     -- 'admin' ou 'user'
  ARRAY[]::text[]              -- Array vazio para admin, ou IDs dos prédios
);
```

**Exemplos:**

Admin (acesso a todos os prédios):
```sql
INSERT INTO profiles (id, email, name, role, allowed_buildings)
VALUES (
  gen_random_uuid(),
  'admin@exemplo.com',
  'Administrador',
  'admin',
  ARRAY[]::text[]
);
```

Usuário com acesso a prédios específicos:
```sql
INSERT INTO profiles (id, email, name, role, allowed_buildings)
VALUES (
  gen_random_uuid(),
  'usuario@exemplo.com',
  'João Silva',
  'user',
  ARRAY['helbor-duo', 'helbor-patteo']::text[]
);
```

## Estrutura de Roles

- **`admin`**: Acesso total a todos os prédios e funcionalidades administrativas
  - `allowed_buildings` deve ser um array vazio `[]`

- **`user`**: Acesso limitado aos prédios especificados
  - `allowed_buildings` deve conter os IDs dos prédios permitidos

## Listar usuários existentes

```sql
SELECT id, name, email, role, allowed_buildings
FROM profiles
ORDER BY name;
```

## Atualizar dados de um usuário

```sql
UPDATE profiles
SET
  name = 'Novo Nome',
  role = 'admin',
  allowed_buildings = ARRAY[]::text[]
WHERE email = 'usuario@email.com';
```

## Deletar usuário

```sql
DELETE FROM profiles
WHERE email = 'usuario@email.com';
```

## Troubleshooting

### "E-mail ou senha inválidos"

Possíveis causas:
1. **Senha incorreta**: A senha deve ser exatamente `123456`
2. **Email não existe**: Verifique se o usuário está cadastrado em `profiles`
3. **Supabase offline**: O projeto pode estar pausado

Para verificar se o email existe:
```sql
SELECT * FROM profiles WHERE email = 'usuario@email.com';
```

### "Erro ao tentar entrar"

- Verifique se o Supabase está online (não pausado)
- Confirme as variáveis de ambiente em `.env.local`
- Verifique o console do navegador para mais detalhes

### Supabase pausado

Projetos gratuitos pausam após 7 dias de inatividade:
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em "Resume" ou "Restore"

## Segurança

⚠️ **ATENÇÃO:**
- Esta é uma implementação simples para ambiente controlado
- A senha `123456` é conhecida por todos os usuários
- Não use em produção com dados sensíveis
- Considere implementar autenticação mais robusta para produção
