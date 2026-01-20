const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kwfobfhtkjakynjummeq.supabase.co';
const supabaseKey = 'sb_publishable_LHDOnC3bFUTPnLUUxJ3-Ag_1rzp39RD';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzePerformance() {
  console.log('🔍 Analisando performance do sistema...\n');

  // 1. Contar total de tickets
  console.log('1️⃣  Contando tickets...');
  const startCount = Date.now();
  const { count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true });
  const countTime = Date.now() - startCount;

  console.log(`   ✅ Total: ${count} tickets`);
  console.log(`   ⏱️  Tempo: ${countTime}ms\n`);

  // 2. Buscar primeira página (como admin)
  console.log('2️⃣  Buscando primeira página (1000 tickets)...');
  const startPage1 = Date.now();
  const { data: page1, error: error1 } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 999);
  const page1Time = Date.now() - startPage1;

  console.log(`   ✅ Recebidos: ${page1?.length || 0} tickets`);
  console.log(`   ⏱️  Tempo: ${page1Time}ms\n`);

  // 3. Verificar tamanho dos dados
  if (page1 && page1.length > 0) {
    const sampleTicket = page1[0];
    const ticketSize = JSON.stringify(sampleTicket).length;
    const totalDataSize = (ticketSize * (page1?.length || 0) / 1024).toFixed(2);

    console.log('3️⃣  Análise de dados:\n');
    console.log(`   Tamanho de 1 ticket: ~${ticketSize} bytes`);
    console.log(`   Tamanho total da página: ~${totalDataSize} KB`);
    console.log(`   Campos por ticket: ${Object.keys(sampleTicket).length}`);
    console.log(`   Campos: ${Object.keys(sampleTicket).join(', ')}\n`);
  }

  // 4. Buscar apenas campos essenciais
  console.log('4️⃣  Testando query otimizada (apenas campos essenciais)...');
  const startOptimized = Date.now();
  const { data: optimized, error: error2 } = await supabase
    .from('tickets')
    .select('id, building_id, title, status, priority, created_at, responsible')
    .order('created_at', { ascending: false })
    .range(0, 999);
  const optimizedTime = Date.now() - startOptimized;

  console.log(`   ✅ Recebidos: ${optimized?.length || 0} tickets`);
  console.log(`   ⏱️  Tempo: ${optimizedTime}ms`);
  console.log(`   🚀 Melhoria: ${((1 - optimizedTime/page1Time) * 100).toFixed(1)}% mais rápido\n`);

  // 5. Verificar status dos tickets
  console.log('5️⃣  Distribuição de status:\n');
  const statusCount = {};
  if (page1) {
    page1.forEach(ticket => {
      statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
    });
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} tickets`);
    });
  }

  // 6. Recomendações
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 ANÁLISE E RECOMENDAÇÕES:\n');

  if (count > 5000) {
    console.log('⚠️  PROBLEMA: Muitos tickets no banco (' + count + ')');
    console.log('   Recomendações:');
    console.log('   1. Implementar paginação virtual (infinite scroll)');
    console.log('   2. Carregar apenas tickets recentes por padrão');
    console.log('   3. Adicionar filtros de data (ex: últimos 30 dias)');
    console.log('   4. Arquivar tickets antigos concluídos\n');
  }

  if (page1Time > 2000) {
    console.log('⚠️  PROBLEMA: Query muito lenta (' + page1Time + 'ms)');
    console.log('   Recomendações:');
    console.log('   1. Usar query otimizada com apenas campos necessários');
    console.log('   2. Adicionar índices no banco (created_at, status)');
    console.log('   3. Implementar cache no lado do cliente\n');
  }

  console.log('💡 Sugestão imediata:');
  console.log('   - Carregar apenas últimos 100-200 tickets');
  console.log('   - Adicionar botão "Carregar mais" ou scroll infinito');
  console.log('   - Selecionar apenas campos necessários na query');

  console.log('\n' + '='.repeat(60));
}

analyzePerformance().catch(console.error);
