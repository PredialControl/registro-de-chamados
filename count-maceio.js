const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countMaceioTickets() {
  console.log('🔍 Buscando chamados do Maceió 88...\n');

  const { data, error, count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: false })
    .eq('building_id', 'maceio-88');

  if (error) {
    console.error('❌ Erro ao buscar chamados:', error);
    process.exit(1);
  }

  console.log('📊 RESULTADO:');
  console.log(`   Total de chamados: ${count || 0}`);

  if (data && data.length > 0) {
    const statusCount = {};
    data.forEach(ticket => {
      statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
    });

    console.log('\n📈 Por status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  }
}

countMaceioTickets().catch(console.error);
