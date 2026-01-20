const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDreamPanamby() {
  console.log('🔍 Verificando chamados do Dream Panamby no banco de dados...\n');

  const { data, error } = await supabase
    .from('tickets')
    .select('status')
    .eq('building_id', 'dream-panamby');

  if (error) {
    console.error('❌ Erro ao buscar chamados:', error);
    process.exit(1);
  }

  console.log(`📊 Total de chamados do Dream Panamby: ${data.length}\n`);

  // Contar por status
  const statusCount = {};
  data.forEach(ticket => {
    statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
  });

  console.log('📋 CONTAGEM POR STATUS (no banco de dados):');
  console.log('='.repeat(80));

  const statusLabels = {
    'itens_apontados': 'Itens Apontados',
    'em_andamento': 'Em andamento',
    'improcedente': 'Improcedente',
    'aguardando_vistoria': 'Aguardando vistoria',
    'concluido': 'Concluído',
    'f_indevido': 'F. Indevido'
  };

  Object.entries(statusCount).forEach(([status, count]) => {
    const label = statusLabels[status] || status;
    console.log(`   ${label} (${status}): ${count}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Isso é o que está no banco de dados agora.');
  console.log('   Se o app mostrar diferente, tente dar F5 (refresh) na página.\n');
}

checkDreamPanamby().catch(console.error);
