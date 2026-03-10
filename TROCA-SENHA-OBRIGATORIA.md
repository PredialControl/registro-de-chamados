# Sistema de Troca de Senha Obrigatória

## Como Funciona

O sistema agora possui uma funcionalidade que **força usuários a trocarem a senha** no primeiro acesso ou quando você determinar.

### Comportamento

1. Quando um usuário com `must_change_password = true` faz login:
   - Um **modal não pode ser fechado** aparece
   - O usuário **não consegue acessar nenhuma funcionalidade** até trocar a senha
   - O modal exige:
     - Nova senha (mínimo 6 caracteres)
     - Confirmação da senha
     - Validação visual em tempo real

2. Após trocar a senha:
   - A senha é atualizada no Supabase Auth
   - A flag `must_change_password` é setada para `false`
   - O usuário pode usar o sistema normalmente

## Configuração Inicial

### 1. Adicionar a coluna no banco de dados

Execute o SQL no **Supabase Dashboard** > **SQL Editor**:

\`\`\`sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
\`\`\`

Ou use o arquivo: `add-must-change-password-column.sql`

### 2. Marcar usuários para trocar senha

**Forçar um usuário específico:**
\`\`\`sql
UPDATE profiles
SET must_change_password = true
WHERE email = 'usuario@exemplo.com';
\`\`\`

**Forçar TODOS os usuários (exceto admins):**
\`\`\`sql
UPDATE profiles
SET must_change_password = true
WHERE role != 'admin';
\`\`\`

**Ao criar um novo usuário:**
\`\`\`sql
INSERT INTO profiles (id, name, email, role, allowed_buildings, must_change_password)
VALUES (
  'uuid-aqui',
  'João Silva',
  'joao@exemplo.com',
  'user',
  ARRAY['predio-1', 'predio-2'],
  true  -- <-- Forçar troca de senha
);
\`\`\`

## Casos de Uso

### Novo funcionário
Quando criar um usuário novo, setar `must_change_password = true`:
- O usuário recebe email com senha temporária (ex: `123456`)
- No primeiro login, é obrigado a criar uma senha própria

### Reset de senha por admin
Se precisar resetar a senha de um usuário:
1. Setar `must_change_password = true`
2. Informar ao usuário para fazer login com a senha padrão
3. Sistema força troca imediata

### Política de segurança
Forçar todos a trocarem senha periodicamente:
\`\`\`sql
UPDATE profiles
SET must_change_password = true
WHERE updated_at < NOW() - INTERVAL '90 days';
\`\`\`

## Validações de Senha

O sistema valida:
- ✅ Mínimo 6 caracteres
- ✅ Senhas coincidem
- ✅ Feedback visual em tempo real
- ✅ Botões de mostrar/esconder senha

## Arquivos Modificados

- `lib/mockData.ts` - Tipo `User` com `mustChangePassword`
- `lib/data.ts` - Funções `updatePassword()` e suporte a `must_change_password`
- `components/ChangePasswordModal.tsx` - Modal de troca de senha
- `components/ChangePasswordWrapper.tsx` - Wrapper que detecta se deve mostrar modal
- `app/layout.tsx` - Integração global do modal

## Testando

1. Criar um usuário de teste:
\`\`\`sql
UPDATE profiles
SET must_change_password = true
WHERE email = 'seu-email@teste.com';
\`\`\`

2. Fazer logout e login novamente
3. O modal deve aparecer automaticamente
4. Trocar a senha
5. Verificar que `must_change_password` foi setado para `false`

## Observações

- Modal **não pode ser fechado** - usuário é obrigado a trocar
- Senha é atualizada diretamente no **Supabase Auth**
- Flag `must_change_password` persiste no banco até ser alterada
- Sistema funciona mesmo offline (modal bloqueia até voltar online)
