const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkItensApontados() {
  console.log('🔍 Verificando tickets com status "itens_apontados"...\n');

  // Buscar todos os tickets com esse status
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('id, building_id, status, description')
    .eq('status', 'itens_apontados')
    .limit(100);

  if (error) {
    console.error('❌ Erro ao buscar chamados:', error);
    process.exit(1);
  }

  console.log(`📊 Total de tickets com status "itens_apontados": ${tickets.length}\n`);

  if (tickets.length > 0) {
    console.log('📋 TICKETS ENCONTRADOS:');
    console.log('='.repeat(80));

    // Agrupar por prédio
    const byBuilding = {};
    tickets.forEach(ticket => {
      if (!byBuilding[ticket.building_id]) {
        byBuilding[ticket.building_id] = [];
      }
      byBuilding[ticket.building_id].push(ticket);
    });

    Object.entries(byBuilding).forEach(([building, buildingTickets]) => {
      console.log(`\n🏢 ${building.toUpperCase()}: ${buildingTickets.length} tickets`);
      buildingTickets.slice(0, 3).forEach((ticket, i) => {
        console.log(`   ${i + 1}. ${ticket.description.substring(0, 60)}...`);
      });
      if (buildingTickets.length > 3) {
        console.log(`   ... e mais ${buildingTickets.length - 3} tickets`);
      }
    });
  } else {
    console.log('❌ NENHUM ticket com status "itens_apontados" foi encontrado no banco!');
    console.log('\n🔍 Buscando TODOS os status únicos no banco...\n');

    const { data: allTickets, error: allError } = await supabase
      .from('tickets')
      .select('status')
      .limit(5000);

    if (!allError && allTickets) {
      const statusCount = {};
      allTickets.forEach(ticket => {
        statusCount[ticket.status] = (statusCount[ticket.status] || 0) + 1;
      });

      console.log('📋 TODOS OS STATUS ENCONTRADOS:');
      console.log('='.repeat(80));
      Object.entries(statusCount).sort().forEach(([status, count]) => {
        console.log(`   ${status}: ${count} tickets`);
      });
    }
  }

  console.log('\n');
}

checkItensApontados().catch(console.error);
