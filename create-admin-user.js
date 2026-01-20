const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '***' : 'undefined');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Script para criar usuário administrador com autenticação Supabase
 *
 * Este script:
 * 1. Cria um usuário no Supabase Auth
 * 2. Cria um perfil correspondente na tabela profiles
 */

async function createAdminUser() {
  // Configurações do usuário
  const email = 'admin@exemplo.com'; // ⚠️ ALTERE ESTE EMAIL
  const password = 'senha123456'; // ⚠️ ALTERE ESTA SENHA
  const name = 'Administrador';
  const role = 'admin';

  console.log('🔐 Criando usuário administrador...\n');
  console.log('Email:', email);
  console.log('Nome:', name);
  console.log('Role:', role);
  console.log('');

  try {
    // 1. Criar usuário no Supabase Auth
    console.log('📝 Passo 1: Criando usuário no Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError.message);

      // Se o usuário já existe no Auth, tentar criar apenas o perfil
      if (authError.message.includes('already registered')) {
        console.log('⚠️ Usuário já existe no Auth, tentando criar perfil...');

        // Buscar o ID do usuário
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
          console.error('❌ Erro ao listar usuários:', listError.message);
          return;
        }

        const existingUser = users.find(u => u.email === email);

        if (!existingUser) {
          console.error('❌ Usuário não encontrado após verificação');
          return;
        }

        authData.user = existingUser;
      } else {
        return;
      }
    } else {
      console.log('✅ Usuário criado no Supabase Auth!');
      console.log('   User ID:', authData.user?.id);
    }

    // 2. Criar perfil na tabela profiles
    console.log('\n📝 Passo 2: Criando perfil na tabela profiles...');

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        name: name,
        role: role,
        allowed_buildings: [] // Admin tem acesso a todos os prédios
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError.message);

      if (profileError.message.includes('duplicate') || profileError.code === '23505') {
        console.log('⚠️ Perfil já existe, tentando atualizar...');

        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({
            name: name,
            role: role,
            allowed_buildings: []
          })
          .eq('email', email)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Erro ao atualizar perfil:', updateError.message);
          return;
        }

        console.log('✅ Perfil atualizado com sucesso!');
        console.log('   ID:', updateData.id);
        console.log('   Nome:', updateData.name);
        console.log('   Email:', updateData.email);
        console.log('   Role:', updateData.role);
      } else {
        return;
      }
    } else {
      console.log('✅ Perfil criado com sucesso!');
      console.log('   ID:', profileData.id);
      console.log('   Nome:', profileData.name);
      console.log('   Email:', profileData.email);
      console.log('   Role:', profileData.role);
    }

    console.log('\n✅ Usuário administrador criado/atualizado com sucesso!');
    console.log('\n🔑 Credenciais de acesso:');
    console.log('   Email:', email);
    console.log('   Senha:', password);
    console.log('\n⚠️ IMPORTANTE: Altere a senha após o primeiro login!');

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar
createAdminUser().catch(console.error);
