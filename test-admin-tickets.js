import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwfobfhtkjakynjummeq.supabase.co';
const supabaseKey = 'sb_publishable_LHDOnC3bFUTPnLUUxJ3-Ag_1rzp39RD';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminTickets() {
  console.log('🔍 Testando query de tickets para admin...\n');

  // Simular a query que está na função getTicketsForUser para admin
  let allTickets = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;
  let batchCount = 0;

  while (hasMore) {
    batchCount++;
    console.log(`📦 Buscando lote ${batchCount} (registros ${from} a ${from + batchSize - 1})...`);

    const { data, error, count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact' })
      .order('id', { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('❌ Erro ao buscar tickets:', error);
      break;
    }

    console.log(`   ✅ Recebidos: ${data?.length || 0} tickets`);
    if (count !== null) {
      console.log(`   📊 Total no banco: ${count} tickets`);
    }

    if (data && data.length > 0) {
      allTickets = [...allTickets, ...data];
      from += batchSize;
      hasMore = data.length === batchSize;

      if (!hasMore) {
        console.log(`   ℹ️  Último lote (${data.length} < ${batchSize})`);
      }
    } else {
      hasMore = false;
      console.log('   ℹ️  Nenhum ticket neste lote');
    }
  }

  console.log('\n📊 RESULTADO FINAL:');
  console.log(`   Total de lotes: ${batchCount}`);
  console.log(`   Total de tickets carregados: ${allTickets.length}`);

  // Contar por status
  const statusCount = {};
  allTickets.forEach(ticket => {
    statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
  });

  console.log('\n📈 Distribuição por status:');
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  // Verificar total real no banco
  const { count: totalCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  console.log(`\n🔢 Total REAL no banco: ${totalCount}`);
  console.log(`🔢 Total CARREGADO: ${allTickets.length}`);

  if (totalCount === allTickets.length) {
    console.log('✅ SUCESSO! Todos os tickets foram carregados.');
  } else {
    console.log(`❌ PROBLEMA! Faltam ${totalCount - allTickets.length} tickets.`);
  }
}

testAdminTickets().catch(console.error);
