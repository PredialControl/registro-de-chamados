const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTicketsByBuilding() {
  const buildingId = process.argv[2];

  if (!buildingId) {
    console.error('❌ Informe o ID do prédio!');
    console.log('Uso: node delete-tickets-by-building.js <building-id>');
    console.log('Exemplo: node delete-tickets-by-building.js grand-living-t1');
    process.exit(1);
  }

  console.log(`⚠️  ATENÇÃO: Isso vai deletar TODOS os chamados do prédio: ${buildingId}`);
  console.log('Aguardando 3 segundos...');

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log(`🗑️  Deletando chamados do prédio ${buildingId}...`);

  const { data, error } = await supabase
    .from('tickets')
    .delete()
    .eq('building_id', buildingId)
    .select();

  if (error) {
    console.error('❌ Erro ao deletar:', error);
    process.exit(1);
  }

  console.log(`✅ ${data?.length || 0} chamados deletados com sucesso!`);
}

deleteTicketsByBuilding().catch(console.error);
