/**
 * Script para testar quantos tickets existem no banco de dados
 *
 * Execute com: node test-count-tickets.js
 */

const { createClient } = require('@supabase/supabase-js');

// Suas credenciais do Supabase (mesmas do .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'SUA_URL_AQUI';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'SUA_KEY_AQUI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTicketCount() {
  console.log('🔍 Testando quantos tickets existem no banco...\n');

  // Teste 1: Contar usando COUNT
  console.log('📊 Teste 1: Usando COUNT...');
  const { count, error: countError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Erro ao contar:', countError);
  } else {
    console.log(`✅ Total de tickets (COUNT): ${count}\n`);
  }

  // Teste 2: Buscar em lotes e contar
  console.log('📊 Teste 2: Buscando em lotes...');
  let allTickets = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;
  let iteration = 0;

  while (hasMore) {
    iteration++;
    console.log(`   Lote ${iteration}: buscando registros ${from} a ${from + batchSize - 1}...`);

    const { data, error } = await supabase
      .from('tickets')
      .select('id')
      .order('id', { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('❌ Erro:', error);
      break;
    }

    if (data && data.length > 0) {
      console.log(`   ✅ Recebidos ${data.length} registros`);
      allTickets = [...allTickets, ...data];
      from += batchSize;
      hasMore = data.length === batchSize;
    } else {
      console.log(`   ⚠️ Nenhum registro retornado`);
      hasMore = false;
    }
  }

  console.log(`\n✅ Total carregado em lotes: ${allTickets.length}`);
  console.log(`📊 Iterações necessárias: ${iteration}`);

  // Teste 3: Verificar se há limite no Supabase
  console.log('\n📊 Teste 3: Tentando buscar SEM range...');
  const { data: allData, error: allError } = await supabase
    .from('tickets')
    .select('id')
    .order('id', { ascending: false });

  if (allError) {
    console.error('❌ Erro:', allError);
  } else {
    console.log(`✅ Retornados sem range: ${allData?.length || 0} tickets`);
  }
}

testTicketCount();
