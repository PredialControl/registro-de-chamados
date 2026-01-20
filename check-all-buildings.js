const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllBuildings() {
  console.log('🔍 Verificando todos os chamados por prédio...\n');

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('building_id, status')
    .limit(5000);

  if (error) {
    console.error('❌ Erro ao buscar chamados:', error);
    process.exit(1);
  }

  console.log(`📊 Total geral de chamados: ${tickets.length}\n`);

  // Agrupar por prédio
  const buildingStats = {};
  tickets.forEach(ticket => {
    if (!buildingStats[ticket.building_id]) {
      buildingStats[ticket.building_id] = {};
    }
    buildingStats[ticket.building_id][ticket.status] =
      (buildingStats[ticket.building_id][ticket.status] || 0) + 1;
  });

  const statusLabels = {
    'itens_apontados': 'Itens Apontados',
    'em_andamento': 'Em andamento',
    'improcedente': 'Improcedente',
    'aguardando_vistoria': 'Aguardando vistoria',
    'concluido': 'Concluído',
    'f_indevido': 'F. Indevido'
  };

  // Contagem total por status
  const totalByStatus = {};
  tickets.forEach(ticket => {
    totalByStatus[ticket.status] = (totalByStatus[ticket.status] || 0) + 1;
  });

  console.log('📋 RESUMO GERAL (TODOS OS PRÉDIOS):');
  console.log('='.repeat(80));
  Object.entries(totalByStatus).forEach(([status, count]) => {
    const label = statusLabels[status] || status;
    console.log(`   ${label}: ${count}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n📍 DETALHAMENTO POR PRÉDIO:');
  console.log('='.repeat(80));

  Object.entries(buildingStats).sort().forEach(([building, stats]) => {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    console.log(`\n🏢 ${building.toUpperCase()} (${total} chamados):`);
    Object.entries(stats).forEach(([status, count]) => {
      const label = statusLabels[status] || status;
      console.log(`   ${label}: ${count}`);
    });
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 DICA: Se você está vendo números diferentes no app,');
  console.log('   verifique se está filtrando por prédio ou vendo TODOS juntos.\n');
}

checkAllBuildings().catch(console.error);
