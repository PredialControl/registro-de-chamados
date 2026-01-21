const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setAllToConstrutora() {
  console.log('🔄 Atualizando todos os chamados para Construtora...\n');

  // Primeiro, vamos contar quantos chamados existem
  const { count: totalCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total de chamados no sistema: ${totalCount}`);

  // Atualizar todos os chamados
  const { data, error } = await supabase
    .from('tickets')
    .update({ responsible: 'Construtora' })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Atualiza todos os registros

  if (error) {
    console.error('❌ Erro ao atualizar chamados:', error);
    process.exit(1);
  }

  // Verificar quantos foram atualizados
  const { count: construtora } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('responsible', 'Construtora');

  console.log('\n✅ RESULTADO:');
  console.log(`   Total de chamados: ${totalCount}`);
  console.log(`   Definidos como Construtora: ${construtora}`);

  // Mostrar distribuição por prédio
  const { data: buildings } = await supabase
    .from('tickets')
    .select('building_id, responsible')
    .eq('responsible', 'Construtora');

  if (buildings && buildings.length > 0) {
    const buildingCount = {};
    buildings.forEach(ticket => {
      buildingCount[ticket.building_id] = (buildingCount[ticket.building_id] || 0) + 1;
    });

    console.log('\n📈 Por prédio:');
    Object.entries(buildingCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([building, count]) => {
        console.log(`   ${building}: ${count} chamados`);
      });
  }

  console.log('\n✅ Atualização concluída com sucesso!');
}

setAllToConstrutora().catch(console.error);
