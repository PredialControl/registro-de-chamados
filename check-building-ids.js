const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuildingIds() {
  console.log('🔍 Verificando todos os building_ids únicos no banco...\n');

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('building_id')
    .limit(5000);

  if (error) {
    console.error('❌ Erro ao buscar chamados:', error);
    process.exit(1);
  }

  // Agrupar por building_id (exato, com case sensitive)
  const buildingCount = {};
  tickets.forEach(ticket => {
    const id = ticket.building_id;
    buildingCount[id] = (buildingCount[id] || 0) + 1;
  });

  console.log('📋 BUILDING_IDS ENCONTRADOS (case sensitive):');
  console.log('='.repeat(80));
  Object.entries(buildingCount).sort().forEach(([id, count]) => {
    console.log(`   "${id}": ${count} chamados`);
  });

  console.log('\n' + '='.repeat(80));
  console.log(`Total geral: ${tickets.length} chamados\n`);

  // Verificar se tem variações do Dream Panamby
  const dreamVariations = Object.keys(buildingCount).filter(id =>
    id.toLowerCase().includes('dream') || id.toLowerCase().includes('panamby')
  );

  if (dreamVariations.length > 0) {
    console.log('🔍 VARIAÇÕES DO DREAM PANAMBY ENCONTRADAS:');
    console.log('='.repeat(80));
    dreamVariations.forEach(id => {
      console.log(`   "${id}": ${buildingCount[id]} chamados`);
    });
    console.log('\n');
  }
}

checkBuildingIds().catch(console.error);
