-- SQL para criar a tabela de Push Subscriptions no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT UNIQUE NOT NULL,
    keys JSONB NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice no endpoint para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
ON public.push_subscriptions(endpoint);

-- Criar índice na data de criação
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at
ON public.push_subscriptions(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir inserção de qualquer usuário
-- (ajuste conforme suas necessidades de segurança)
CREATE POLICY "Permitir inserção de subscriptions"
ON public.push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Criar política para permitir leitura de qualquer usuário
CREATE POLICY "Permitir leitura de subscriptions"
ON public.push_subscriptions
FOR SELECT
TO anon, authenticated
USING (true);

-- Criar política para permitir atualização
CREATE POLICY "Permitir atualização de subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Criar política para permitir deleção
CREATE POLICY "Permitir deleção de subscriptions"
ON public.push_subscriptions
FOR DELETE
TO anon, authenticated
USING (true);

-- Criar função para auto-atualizar updated_at
CREATE OR REPLACE FUNCTION update_push_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para auto-atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_push_subscription_updated_at
ON public.push_subscriptions;

CREATE TRIGGER trigger_update_push_subscription_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_push_subscription_updated_at();

-- Verificar se a tabela foi criada corretamente
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'push_subscriptions'
ORDER BY ordinal_position;
