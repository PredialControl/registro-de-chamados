const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testando lógica de login...\n');

// Simular a função de login
async function testLogin(email, password) {
    console.log(`\n📧 Testando login com:`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}`);
    console.log('');

    // Validar senha padrão
    if (password !== '123456') {
        console.error('❌ Senha incorreta');
        console.log('   Esperado: "123456"');
        console.log(`   Recebido: "${password}"`);
        console.log(`   Length: ${password.length}`);
        console.log(`   Bytes: [${Array.from(password).map(c => c.charCodeAt(0)).join(', ')}]`);
        return false;
    }

    console.log('✅ Senha válida (123456)');

    // Buscar usuário
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !data) {
        console.error('❌ Usuário não encontrado');
        if (error) console.error('   Erro:', error.message);
        return false;
    }

    console.log('✅ Usuário encontrado:', data.name);
    console.log('   Role:', data.role);
    console.log('');
    console.log('✅ LOGIN BEM-SUCEDIDO!');
    return true;
}

// Testes
(async () => {
    // Teste 1: Senha correta
    await testLogin('admin@exemplo.com', '123456');

    // Teste 2: Senha incorreta
    await testLogin('admin@exemplo.com', 'senha_errada');

    // Teste 3: Email não existe
    await testLogin('naoexiste@exemplo.com', '123456');
})();
