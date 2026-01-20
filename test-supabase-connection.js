const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testando conexão com Supabase...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('1️⃣ Testando conexão básica...');

    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Erro na conexão:', error.message);
      console.error('Detalhes:', error);

      if (error.message.includes('fetch') || error.message.includes('timeout')) {
        console.log('\n⚠️ O projeto Supabase pode estar PAUSADO ou OFFLINE.');
        console.log('');
        console.log('Para reativar:');
        console.log('1. Acesse https://supabase.com/dashboard');
        console.log('2. Selecione seu projeto');
        console.log('3. Se estiver pausado, clique em "Resume" ou "Restore"');
        console.log('');
        console.log('Projetos gratuitos pausam após 7 dias de inatividade.');
      }

      return;
    }

    console.log('✅ Conexão estabelecida com sucesso!');

    console.log('\n2️⃣ Verificando tabela profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError.message);
      return;
    }

    console.log(`✅ Encontrados ${profiles.length} usuário(s):`);
    profiles.forEach(p => {
      console.log(`   - ${p.name} (${p.email}) - Role: ${p.role}`);
    });

    console.log('\n3️⃣ Verificando Supabase Auth...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Erro ao verificar sessão:', sessionError.message);
      return;
    }

    console.log('✅ Auth funcionando! Sessão atual:', session ? 'Autenticado' : 'Não autenticado');

    console.log('\n✅ Todos os testes passaram! O Supabase está funcionando corretamente.');

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);

    if (error.message.includes('fetch')) {
      console.log('\n⚠️ Erro de rede. Verifique:');
      console.log('1. Sua conexão com a internet');
      console.log('2. Se o projeto Supabase está ativo (não pausado)');
      console.log('3. Se a URL do Supabase está correta no .env.local');
    }
  }
}

testConnection();
