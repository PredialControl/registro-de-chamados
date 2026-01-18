// Script para atualizar todos os chamados existentes definindo responsável como "Construtora"
// Execute: node set-all-responsible-construtora.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não encontradas!');
    console.log('Certifique-se de ter o arquivo .env.local configurado.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setAllToConstrutora() {
    console.log('🔄 Iniciando atualização de responsáveis...\n');

    try {
        // 1. Verificar quantos tickets não têm responsável definido
        const { data: ticketsWithoutResponsible, error: countError } = await supabase
            .from('tickets')
            .select('id, external_ticket_id, location')
            .is('responsible', null);

        if (countError) {
            console.error('❌ Erro ao contar tickets:', countError);
            return;
        }

        console.log(`📊 Total de chamados sem responsável: ${ticketsWithoutResponsible?.length || 0}\n`);

        if (!ticketsWithoutResponsible || ticketsWithoutResponsible.length === 0) {
            console.log('✅ Todos os chamados já têm responsável definido!');

            // Mostrar distribuição
            const { data: distribution } = await supabase
                .from('tickets')
                .select('responsible');

            const counts = {};
            distribution?.forEach(t => {
                const resp = t.responsible || 'NULL';
                counts[resp] = (counts[resp] || 0) + 1;
            });

            console.log('\n📊 Distribuição atual:');
            Object.entries(counts).forEach(([responsible, count]) => {
                console.log(`   ${responsible}: ${count} chamados`);
            });
            return;
        }

        // 2. Mostrar alguns exemplos
        console.log('📋 Exemplos de chamados que serão atualizados:');
        ticketsWithoutResponsible.slice(0, 5).forEach((ticket, i) => {
            console.log(`   ${i + 1}. ${ticket.external_ticket_id || ticket.id.substring(0, 8)} - ${ticket.location}`);
        });

        // 3. Confirmar com usuário
        console.log('\n⚠️  ATENÇÃO: Isso irá atualizar TODOS os chamados sem responsável para "Construtora"');
        console.log('   Você pode alterar manualmente depois os que precisarem ser "Condomínio"\n');

        // Aguardar 3 segundos para dar tempo de cancelar
        console.log('Iniciando em 3 segundos... (Ctrl+C para cancelar)');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 4. Atualizar
        console.log('\n🔄 Atualizando...');
        const { data: updated, error: updateError } = await supabase
            .from('tickets')
            .update({ responsible: 'Construtora' })
            .is('responsible', null)
            .select('id, external_ticket_id');

        if (updateError) {
            console.error('❌ Erro ao atualizar:', updateError);
            return;
        }

        console.log(`\n✅ Sucesso! ${updated?.length || 0} chamados atualizados para "Construtora"\n`);

        // 5. Mostrar distribuição final
        const { data: finalDistribution } = await supabase
            .from('tickets')
            .select('responsible');

        const finalCounts = {};
        finalDistribution?.forEach(t => {
            const resp = t.responsible || 'NULL';
            finalCounts[resp] = (finalCounts[resp] || 0) + 1;
        });

        console.log('📊 Distribuição final:');
        Object.entries(finalCounts).forEach(([responsible, count]) => {
            console.log(`   ${responsible}: ${count} chamados`);
        });

        console.log('\n✅ Atualização concluída com sucesso!');
        console.log('💡 Você pode agora editar manualmente os chamados que precisam ser "Condomínio"');

    } catch (error) {
        console.error('❌ Erro inesperado:', error);
    }
}

// Executar
setAllToConstrutora();
