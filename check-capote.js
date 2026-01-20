const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCapote() {
  console.log('🔍 Verificando Capote 210...\n');

  const { data, error } = await supabase
    .from('tickets')
    .select('status')
    .eq('building_id', 'capote-210');

  if (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }

  console.log(`📊 Total de chamados do Capote 210: ${data.length}\n`);

  const statusCount = {};
  data.forEach(ticket => {
    statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
  });

  console.log('📋 CONTAGEM POR STATUS:');
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
    console.log(`   ${label}: ${count}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

checkCapote().catch(console.error);
