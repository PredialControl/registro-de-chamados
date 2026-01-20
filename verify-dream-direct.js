const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDream() {
  console.log('🔍 Verificação direta do Dream Panamby...\n');

  // Query 1: Count direto
  const { count, error: countError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('building_id', 'dream-panamby');

  if (countError) {
    console.error('❌ Erro no count:', countError);
  } else {
    console.log(`📊 Count direto (head=true): ${count}`);
  }

  // Query 2: Select all
  const { data, error: selectError } = await supabase
    .from('tickets')
    .select('id, building_id, status')
    .eq('building_id', 'dream-panamby');

  if (selectError) {
    console.error('❌ Erro no select:', selectError);
  } else {
    console.log(`📊 Select all: ${data.length} registros`);

    if (data.length > 0) {
      console.log('\n📋 Primeiros 5 registros:');
      data.slice(0, 5).forEach((ticket, i) => {
        console.log(`   ${i + 1}. ID: ${ticket.id.substring(0, 8)}... | Building: "${ticket.building_id}" | Status: ${ticket.status}`);
      });
    }
  }

  // Query 3: Count por building_id (todos)
  const { data: allTickets, error: allError } = await supabase
    .from('tickets')
    .select('building_id');

  if (allError) {
    console.error('❌ Erro ao buscar todos:', allError);
  } else {
    const dreamTickets = allTickets.filter(t => t.building_id === 'dream-panamby');
    console.log(`\n📊 Filtragem manual em ${allTickets.length} tickets: ${dreamTickets.length} são do Dream Panamby`);

    // Verificar variações
    const dreamVariations = allTickets.filter(t =>
      t.building_id && (
        t.building_id.toLowerCase().includes('dream') ||
        t.building_id.toLowerCase().includes('panamby')
      )
    );

    if (dreamVariations.length > 0) {
      console.log('\n🔍 Todas as variações de "dream" ou "panamby":');
      const uniqueIds = [...new Set(dreamVariations.map(t => t.building_id))];
      uniqueIds.forEach(id => {
        const count = dreamVariations.filter(t => t.building_id === id).length;
        console.log(`   "${id}": ${count} tickets`);
      });
    }
  }
}

verifyDream().catch(console.error);
