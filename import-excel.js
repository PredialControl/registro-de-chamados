const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeamento de status
const STATUS_MAP = {
  'itens apontados': 'itens_apontados',
  'em andamento': 'em_andamento',
  'improcedente': 'improcedente',
  'aguardando vistoria': 'aguardando_vistoria',
  'concluído': 'concluido',
  'concluido': 'concluido',
  'f. indevido': 'f_indevido',
  'f indevido': 'f_indevido'
};

const normalizeStatus = (status) => {
  const normalized = status?.toLowerCase().trim();
  return STATUS_MAP[normalized] || 'aguardando_vistoria';
};

const parseExcelDate = (excelDate) => {
  if (excelDate === null || excelDate === undefined || excelDate === '') {
    return null;
  }

  if (typeof excelDate === 'string') {
    const trimmed = excelDate.trim().toLowerCase();
    if (!trimmed || trimmed === '' || trimmed === 'sem prazo' || trimmed.includes('sem prazo')) {
      return null;
    }
    const date = new Date(excelDate.trim());
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof excelDate === 'number') {
    if (isNaN(excelDate) || excelDate <= 0) {
      return null;
    }

    const EXCEL_EPOCH_OFFSET = 25569;
    const MS_PER_DAY = 86400 * 1000;
    const unixTimestamp = (excelDate - EXCEL_EPOCH_OFFSET) * MS_PER_DAY;
    const date = new Date(unixTimestamp);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const adjustedDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    return adjustedDate.toISOString();
  }

  return null;
};

const normalizeResponsible = (responsible) => {
  if (!responsible) return null;
  const normalized = responsible.toLowerCase().trim();
  if (normalized.includes('condom')) return 'Condomínio';
  if (normalized.includes('constru')) return 'Construtora';
  return null;
};

async function importExcel() {
  const excelFileName = process.argv[2];
  const buildingId = process.argv[3];

  if (!excelFileName || !buildingId) {
    console.error('❌ Parâmetros faltando!');
    console.log('Uso: node import-excel.js <arquivo.xlsx> <building-id>');
    console.log('Exemplo: node import-excel.js "Grand Living T2.xlsx" grand-living-t2');
    console.log('\nIDs de prédios disponíveis:');
    console.log('  - onze22');
    console.log('  - brook-you');
    console.log('  - jacaranda');
    console.log('  - grand-living-t1');
    console.log('  - grand-living-t2');
    console.log('  - samoa');
    console.log('  - living-firenze');
    console.log('  - maceio-88');
    console.log('  - griffe');
    console.log('  - cyrela-foryou');
    console.log('  - living-heredita');
    console.log('  - capote-210');
    console.log('  - living-faria-lima');
    console.log('  - duq-centra');
    console.log('  - helbor-patteo');
    console.log('  - helbor-duo');
    console.log('  - dream-panamby');
    process.exit(1);
  }

  console.log(`📂 Lendo planilha: ${excelFileName}...`);

  // Ler planilha
  const workbook = XLSX.readFile(path.join(__dirname, 'para ler', excelFileName));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📊 Total de linhas: ${data.length}`);

  // Buscar o admin user
  console.log('👤 Buscando usuário admin...');
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('❌ Erro ao buscar usuário admin:', userError);
    process.exit(1);
  }

  const adminUser = users[0];
  console.log(`✅ Admin encontrado: ${adminUser.name} (${adminUser.id})`);

  console.log(`🏢 Importando para o prédio: ${buildingId}`);
  console.log('⏳ Iniciando importação...\n');

  let imported = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const lineNumber = i + 2; // Excel começa na linha 2

    try {
      const descricao = row['Pendência:'] || row.Descrição || row.Descricao || '';

      if (!descricao || descricao.trim() === '') {
        console.log(`⏭️  Linha ${lineNumber}: Sem descrição, pulando...`);
        continue;
      }

      const numeroChamado = row['Chamado '] || row.Chamado || row['ID Chamado'] || row['Número'];
      const local = row.Local || 'Não especificado';
      const abertura = parseExcelDate(row.Abertura || row.Data);
      const prazo = parseExcelDate(row.Prazo);
      const retorno = row.Retorno || row['Retorno Construtora'] || '';
      const responsavel = normalizeResponsible(row.Responsável || row.Responsavel || '');
      const status = normalizeStatus(row['Situação'] || row.Situação || row.Situacao || row.Status || '');

      const ticketData = {
        building_id: buildingId,
        user_id: adminUser.id,
        location: local,
        description: descricao,
        photo_urls: [],
        status: status,
        created_at: abertura,
        deadline: prazo,
        external_ticket_id: numeroChamado ? String(numeroChamado) : null,
        constructor_return: retorno || null,
        responsible: responsavel,
        is_registered: true,
      };

      const { error } = await supabase
        .from('tickets')
        .insert(ticketData);

      if (error) {
        throw error;
      }

      imported++;
      process.stdout.write(`\r✅ Importados: ${imported} | ❌ Falhas: ${failed} | Linha atual: ${lineNumber}/${data.length}`);

    } catch (error) {
      failed++;
      errors.push({ linha: lineNumber, erro: error.message });
      process.stdout.write(`\r✅ Importados: ${imported} | ❌ Falhas: ${failed} | Linha atual: ${lineNumber}/${data.length}`);
    }
  }

  console.log('\n\n📊 RESULTADO FINAL:');
  console.log(`✅ Importados com sucesso: ${imported}`);
  console.log(`❌ Falhas: ${failed}`);

  if (errors.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:');
    errors.slice(0, 10).forEach(e => {
      console.log(`   Linha ${e.linha}: ${e.erro}`);
    });
    if (errors.length > 10) {
      console.log(`   ... e mais ${errors.length - 10} erros`);
    }
  }
}

importExcel().catch(console.error);
