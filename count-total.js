const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countTotal() {
  console.log('🔍 Contando tickets totais no banco...\n');

  // Count total sem filtro
  const { count: totalCount, error: totalError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Erro no count total:', totalError);
  } else {
    console.log(`📊 Count total (SEM filtro): ${totalCount}`);
  }

  // Select com limit maior
  const { data: manyTickets, error: manyError } = await supabase
    .from('tickets')
    .select('building_id')
    .limit(2000);

  if (manyError) {
    console.error('❌ Erro no select:', manyError);
  } else {
    console.log(`📊 Select com limit 2000: ${manyTickets.length} registros retornados`);

    // Agrupar por building_id
    const buildingCount = {};
    manyTickets.forEach(ticket => {
      const id = ticket.building_id;
      buildingCount[id] = (buildingCount[id] || 0) + 1;
    });

    console.log('\n📋 CONTAGEM POR PRÉDIO:');
    console.log('='.repeat(80));
    Object.entries(buildingCount).sort().forEach(([id, count]) => {
      console.log(`   "${id}": ${count} chamados`);
    });

    const total = Object.values(buildingCount).reduce((a, b) => a + b, 0);
    console.log('\n' + '='.repeat(80));
    console.log(`TOTAL: ${total} chamados\n`);
  }
}

countTotal().catch(console.error);
