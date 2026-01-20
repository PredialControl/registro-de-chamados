const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kwfobfhtkjakynjummeq.supabase.co';
const supabaseKey = 'sb_publishable_LHDOnC3bFUTPnLUUxJ3-Ag_1rzp39RD';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminUsers() {
  console.log('🔍 Verificando usuários administradores...\n');

  // Buscar todos os usuários com role admin
  const { data: adminUsers, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin');

  if (error) {
    console.error('❌ Erro ao buscar admins:', error);
    return;
  }

  if (!adminUsers || adminUsers.length === 0) {
    console.log('⚠️  NENHUM usuário com role = "admin" encontrado!');
    console.log('\nBuscando todos os usuários para verificar...\n');

    const { data: allUsers, error: allError } = await supabase
      .from('profiles')
      .select('*');

    if (!allError && allUsers) {
      console.log('📋 Usuários encontrados:');
      allUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email})`);
        console.log(`    Role: "${user.role}" (tipo: ${typeof user.role})`);
        console.log(`    Prédios permitidos: ${JSON.stringify(user.allowed_buildings)}`);
        console.log(`    Total de prédios: ${user.allowed_buildings?.length || 0}\n`);
      });
    }
    return;
  }

  console.log(`✅ ${adminUsers.length} administrador(es) encontrado(s):\n`);

  adminUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: "${user.role}"`);
    console.log(`   Prédios permitidos: ${JSON.stringify(user.allowed_buildings)}`);
    console.log(`   Total de prédios: ${user.allowed_buildings?.length || 0}`);

    // Verificar problemas potenciais
    if (!user.allowed_buildings || user.allowed_buildings.length === 0) {
      console.log('   ⚠️  PROBLEMA: allowed_buildings está vazio ou null!');
    }
    console.log('');
  });

  // Verificar quantos chamados existem
  const { count, error: countError } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n📊 Total de chamados no sistema: ${count}`);
  }
}

checkAdminUsers().catch(console.error);
