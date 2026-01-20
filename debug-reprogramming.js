const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugReprogramming() {
  console.log('🔍 Verificando histórico de reprogramações...\n');

  const { data, error } = await supabase
    .from('tickets')
    .select('id, external_ticket_id, reprogramming_date, reprogramming_history')
    .not('reprogramming_history', 'is', null)
    .limit(5);

  if (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('ℹ️  Nenhum ticket com histórico de reprogramação encontrado.');
    return;
  }

  console.log(`📊 Encontrados ${data.length} tickets com histórico:\n`);
  console.log('='.repeat(80));

  data.forEach((ticket, index) => {
    console.log(`\n${index + 1}. Ticket: ${ticket.external_ticket_id || ticket.id.substring(0, 8)}`);
    console.log(`   Data atual de reprogramação: ${ticket.reprogramming_date || 'N/A'}`);
    console.log(`   Histórico (raw):`, JSON.stringify(ticket.reprogramming_history, null, 2));

    if (Array.isArray(ticket.reprogramming_history)) {
      console.log(`   Histórico formatado:`);
      ticket.reprogramming_history.forEach((entry, i) => {
        if (typeof entry === 'object') {
          console.log(`     ${i + 1}. Data: ${entry.date || 'N/A'}`);
          console.log(`        Motivo: ${entry.reason || 'N/A'}`);
          console.log(`        Atualizado em: ${entry.updatedAt || 'N/A'}`);
        } else {
          console.log(`     ${i + 1}. Valor: ${entry}`);
        }
      });
    }
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

debugReprogramming().catch(console.error);
