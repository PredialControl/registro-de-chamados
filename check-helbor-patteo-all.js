const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkHelborPatteo() {
  console.log('🔍 Verificando chamados Helbor Patteo...\n');

  // Buscar TODOS os chamados do Helbor Patteo
  const { data, error, count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('building_id', 'helbor-patteo')
    .order('id', { ascending: false });

  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }

  console.log('📊 Total de chamados Helbor Patteo:', count);
  console.log('📋 Retornados pela query:', data.length);
  console.log('');

  // Mostrar os 5 mais recentes
  console.log('5 mais recentes:');
  data.slice(0, 5).forEach((t, i) => {
    console.log(`${i+1}. ID: ${t.id.substring(0, 8)}`);
    console.log(`   Local: ${t.location}`);
    console.log(`   Status: ${t.status}`);
    console.log(`   Registrado: ${t.is_registered}`);
    console.log(`   Criado: ${t.created_at || 'SEM DATA'}`);
    console.log('');
  });

  // Verificar pendentes
  const pendentes = data.filter(t => !t.is_registered);
  console.log('🔴 Pendentes (não registrados):', pendentes.length);

  if (pendentes.length > 0) {
    console.log('\nPrimeiros 3 pendentes:');
    pendentes.slice(0, 3).forEach((t, i) => {
      console.log(`${i+1}. ${t.location} - ${t.status}`);
    });
  }
}

checkHelborPatteo();
