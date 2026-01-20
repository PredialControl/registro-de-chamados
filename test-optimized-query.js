const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kwfobfhtkjakynjummeq.supabase.co';
const supabaseKey = 'sb_publishable_LHDOnC3bFUTPnLUUxJ3-Ag_1rzp39RD';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOptimizedQuery() {
  console.log('🚀 Testando query otimizada...\n');

  // Query antiga (todos os tickets)
  console.log('1️⃣  Query ANTIGA (todos os 1334 tickets):');
  const start1 = Date.now();

  let allTickets = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('   ❌ Erro:', error);
      break;
    }

    if (data && data.length > 0) {
      allTickets = [...allTickets, ...data];
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  const time1 = Date.now() - start1;
  console.log(`   ⏱️  Tempo: ${time1}ms`);
  console.log(`   📊 Tickets: ${allTickets.length}\n`);

  // Query nova (apenas últimos 200)
  console.log('2️⃣  Query NOVA (últimos 200 tickets):');
  const start2 = Date.now();

  const { data: optimizedData, error: error2 } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const time2 = Date.now() - start2;
  console.log(`   ⏱️  Tempo: ${time2}ms`);
  console.log(`   📊 Tickets: ${optimizedData?.length || 0}\n`);

  // Comparação
  console.log('=' .repeat(60));
  console.log('\n📈 COMPARAÇÃO:\n');
  const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
  console.log(`   Redução de tempo: ${time1}ms → ${time2}ms`);
  console.log(`   Melhoria: ${improvement}% mais rápido 🚀`);
  console.log(`   Economia: ${((allTickets.length - 200) / allTickets.length * 100).toFixed(1)}% menos dados`);

  console.log('\n✅ RESULTADO:');
  console.log('   - Carregamento muito mais rápido');
  console.log('   - Usuário vê os tickets mais recentes imediatamente');
  console.log('   - Menos uso de banda e memória');

  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('   - Adicionar botão "Carregar mais" para buscar tickets antigos');
  console.log('   - Implementar filtros por status, prédio, data');
  console.log('   - Adicionar busca/pesquisa de tickets');

  console.log('\n' + '='.repeat(60));
}

testOptimizedQuery().catch(console.error);
