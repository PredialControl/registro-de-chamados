const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
  console.log('🧪 Testando query dos chamados (como o app faz)...\n');

  const start = Date.now();

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const elapsed = Date.now() - start;

  if (error) {
    console.error('❌ ERRO:', error.message);
    console.error('Detalhes:', error);
    return;
  }

  console.log(`✅ Query executada em ${elapsed}ms`);
  console.log(`📊 Retornou ${data.length} chamados`);
  console.log('');
  console.log('Primeiros 3:');
  data.slice(0, 3).forEach((t, i) => {
    console.log(`${i+1}. ${t.building_id} - ${t.status} - ${t.created_at || 'SEM DATA'}`);
  });
}

testQuery();
