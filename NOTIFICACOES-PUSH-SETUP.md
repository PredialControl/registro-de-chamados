# Sistema de Notificações Push - Guia de Configuração

Este guia explica como configurar e usar o sistema de notificações push no app de Chamados.

## 📋 Pré-requisitos

- Node.js instalado
- Conta Supabase configurada
- App rodando em HTTPS (necessário para push notifications)

## 🔧 Passo 1: Instalar Dependências

A dependência `web-push` já foi instalada. Se precisar reinstalar:

```bash
npm install web-push
```

## 🔑 Passo 2: Gerar Chaves VAPID

Execute o script para gerar suas chaves VAPID:

```bash
node generate-vapid-keys.js
```

Isso irá gerar duas chaves:
- **NEXT_PUBLIC_VAPID_PUBLIC_KEY**: Chave pública (vai para o navegador)
- **VAPID_PRIVATE_KEY**: Chave privada (APENAS servidor, nunca exponha)

## 📝 Passo 3: Adicionar Chaves ao .env.local

Copie as chaves geradas e adicione ao arquivo `.env.local`:

```env
# VAPID Keys para Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica_aqui
VAPID_PRIVATE_KEY=sua_chave_privada_aqui
```

**IMPORTANTE**:
- Nunca comite o arquivo `.env.local` no git
- Certifique-se que `.env.local` está no `.gitignore`

## 🗄️ Passo 4: Criar Tabela no Supabase

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Copie e execute o conteúdo do arquivo `supabase-push-subscriptions.sql`

Isso criará:
- Tabela `push_subscriptions`
- Índices para performance
- Políticas de RLS (Row Level Security)
- Trigger para atualizar `updated_at`

## 🚀 Passo 5: Adicionar Botão de Notificações

O componente `NotificationButton` já foi criado. Para usá-lo, adicione-o em algum lugar visível do app (ex: header, navbar):

```tsx
import NotificationButton from '@/components/NotificationButton';

// No seu componente:
<NotificationButton />
```

Sugestão: Adicione no header ao lado do tema (dark/light mode).

## 🎯 Passo 6: Testar

### 6.1. Ativar Notificações

1. Abra o app no navegador
2. Clique no botão de notificações (ícone de sino)
3. Clique em "Ativar notificações"
4. Aceite a permissão quando o navegador solicitar

### 6.2. Testar Mudança de Status

1. Edite um chamado
2. Mude o status
3. Você deve receber uma notificação push

### 6.3. Testar Comentário

1. Edite um chamado
2. Adicione um comentário em "Retorno da Construtora"
3. Você deve receber uma notificação push

## 📱 Compatibilidade

### ✅ Suportado:
- Chrome/Edge (Desktop e Android)
- Firefox (Desktop e Android)
- Safari 16.4+ (macOS, iOS 16.4+)
- Opera

### ❌ Não Suportado:
- iOS Safari < 16.4
- Navegadores antigos sem Service Worker

## 🔍 Verificar se Funcionou

### Console do Navegador:

```javascript
// Verificar se Service Worker está registrado
navigator.serviceWorker.getRegistration().then(reg => console.log(reg));

// Verificar permissão de notificações
console.log(Notification.permission); // Deve ser "granted"

// Verificar subscription
navigator.serviceWorker.ready.then(reg =>
  reg.pushManager.getSubscription().then(sub => console.log(sub))
);
```

### Logs do Servidor:

Ao mudar status/adicionar comentário, você deve ver nos logs:

```
Sending notification to X subscribers
Notification sent to: https://...
```

### Supabase:

Verifique a tabela `push_subscriptions`. Deve ter pelo menos 1 registro com:
- `endpoint`: URL do push service
- `keys`: Objeto com `p256dh` e `auth`

## 🛠️ Troubleshooting

### Não Recebo Notificações

1. **Verificar permissão**:
   - Chrome: chrome://settings/content/notifications
   - Certifique-se que o site tem permissão

2. **Verificar VAPID keys**:
   - No console do servidor, deve aparecer: "VAPID keys configured"
   - Se aparecer "VAPID keys not configured", verifique o .env.local

3. **Verificar Service Worker**:
   - DevTools > Application > Service Workers
   - Deve aparecer "sw.js" como ativo

4. **Verificar subscriptions no Supabase**:
   - Se não há registros, significa que o subscribe não funcionou
   - Verifique console do navegador para erros

### Erro: "Push subscription has expired"

Isso é normal. O endpoint atualiza automaticamente quando:
- Usuário limpa cache
- Subscription expira (após ~90 dias sem uso)

O código já trata isso removendo subscriptions inválidas (status 410).

### HTTPS Necessário

Push notifications APENAS funcionam em:
- `https://` (produção)
- `localhost` (desenvolvimento)

Se estiver usando um domínio local customizado, configure HTTPS.

## 📊 Monitoramento

### Ver Subscriptions Ativas:

No Supabase SQL Editor:

```sql
SELECT
  COUNT(*) as total_subscriptions,
  DATE_TRUNC('day', created_at) as day
FROM push_subscriptions
GROUP BY day
ORDER BY day DESC;
```

### Limpar Subscriptions Antigas:

```sql
DELETE FROM push_subscriptions
WHERE updated_at < NOW() - INTERVAL '90 days';
```

## 🎨 Personalização

### Mudar Título/Corpo da Notificação:

Edite `lib/notificationService.ts`:

```typescript
const payload: NotificationPayload = {
  title: 'Seu Título Customizado',
  body: 'Sua mensagem customizada',
  // ...
};
```

### Adicionar Mais Eventos:

No `lib/notificationService.ts`, adicione novos métodos:

```typescript
async sendNewTicketNotification(ticketId: string) {
  // Implementação...
}
```

E chame no local apropriado (ex: ao criar ticket).

## 🔐 Segurança

- **RLS**: Tabela já tem Row Level Security ativado
- **VAPID Private Key**: NUNCA exponha, mantenha APENAS no servidor
- **Subscriptions**: Podem ser deletadas por qualquer usuário (ajuste políticas RLS se necessário)

## 📚 Recursos

- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [VAPID Keys Spec](https://tools.ietf.org/html/rfc8292)
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

## ✅ Checklist Final

- [ ] Executei `node generate-vapid-keys.js`
- [ ] Adicionei chaves ao `.env.local`
- [ ] Executei SQL no Supabase
- [ ] Adicionei `<NotificationButton />` no app
- [ ] Testei ativar notificações no navegador
- [ ] Testei mudança de status (recebi notificação)
- [ ] Testei comentário (recebi notificação)
- [ ] App está em HTTPS (ou localhost)

---

**Dúvidas?** Verifique os logs do console (navegador e servidor) para mensagens de erro detalhadas.
