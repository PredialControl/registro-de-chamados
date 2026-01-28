# 🔧 Solução para Status Amarelo no Supabase

## 📋 Problema Identificado

Quando você entra em um contrato (prédio) específico, o sistema está carregando **TODOS os chamados daquele prédio** de uma vez, o que causa:

1. **Múltiplas queries ao Supabase** em lotes de 200 tickets
2. **Alto consumo de recursos** do banco de dados
3. **Status amarelo no Supabase** indicando uso excessivo
4. **Lentidão ao dar Ctrl+R** pois cancela e reinicia todas as queries

## ✅ Soluções Implementadas

### 1. **Limite Inicial de Carregamento**
- Agora carrega apenas **500 primeiros tickets** ao selecionar um prédio
- Muito mais rápido e eficiente
- Reduz drasticamente o número de queries

**Antes:**
```typescript
// Carregava TODOS os tickets (poderia ser 5000+)
getTicketsByBuilding(buildingId, false)
```

**Depois:**
```typescript
// Carrega apenas 500 inicialmente
getTicketsByBuilding(buildingId, false, 500)
```

### 2. **Query Otimizada**
- Query única ao invés de múltiplas em lotes
- Usa `limit` direto no banco de dados
- Muito mais performático

### 3. **Índices no Banco de Dados** (IMPORTANTE!)

Execute o arquivo `optimize-database-indexes.sql` no Supabase:

1. Acesse: **Supabase Dashboard** → **SQL Editor**
2. Clique em: **New Query**
3. Cole o conteúdo do arquivo `optimize-database-indexes.sql`
4. Clique em: **Run**

Os índices vão melhorar **DRASTICAMENTE** a performance:
- ✅ Índice por `building_id` (query mais comum)
- ✅ Índice composto `building_id + id` (ordenação)
- ✅ Índice por `status`
- ✅ Índice por `is_registered` (pendentes)
- ✅ E outros...

## 📊 Resultados Esperados

### Antes:
- ❌ Status amarelo no Supabase
- ❌ Carregamento lento (5-10 segundos)
- ❌ Múltiplas queries (10-20+)
- ❌ Lentidão ao dar Ctrl+R

### Depois (com índices):
- ✅ Status verde no Supabase
- ✅ Carregamento rápido (1-2 segundos)
- ✅ Query única
- ✅ Ctrl+R fluido

## 🎯 Como Testar

1. **Execute os índices SQL** (passo mais importante!)
2. **Reinicie a aplicação** (Ctrl+C e `npm run dev`)
3. **Entre em um contrato** e observe:
   - Velocidade de carregamento
   - Console do navegador (F12)
   - Dashboard do Supabase

## 📈 Melhorias Futuras (Opcional)

Se ainda precisar de mais otimização:

### A. Paginação "Carregar Mais"
```typescript
// Já implementado no data.ts:
getTicketsByBuildingPaginated(buildingId, offset, limit)
```

### B. Cache Local
- Salvar tickets carregados no localStorage
- Recarregar apenas quando necessário

### C. Filtros no Backend
- Filtrar por status no Supabase ao invés do frontend
- Reduz ainda mais a quantidade de dados

## ⚠️ IMPORTANTE

**Execute o SQL dos índices AGORA!** Sem os índices, a melhoria será apenas parcial. Com os índices, a diferença é **ENORME**.

## 🔍 Monitoramento

Para monitorar a saúde do banco:

1. **Supabase Dashboard** → **Database** → **Query Performance**
2. Observe:
   - Tempo de execução das queries
   - Queries mais lentas
   - Uso de índices

## 📝 Logs Úteis

No console do navegador (F12), você verá:

```
🔄 Carregando tickets do prédio: xyz
✅ Prédio xyz: 500 chamados carregados (total: 2340) em 0.85s
ℹ️ Existem mais 1840 chamados. Use paginação para carregar mais.
```

Isso é normal e esperado!

## 🆘 Precisa de Mais Ajuda?

Se ainda tiver status amarelo após executar os índices:

1. Verifique se os índices foram criados com sucesso
2. Execute `ANALYZE tickets;` no SQL Editor do Supabase
3. Aguarde 5-10 minutos para o Supabase estabilizar
4. Verifique o plano de consulta com `EXPLAIN ANALYZE`
