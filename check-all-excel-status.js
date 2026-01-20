const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const paraLerDir = path.join(__dirname, 'para ler');

// Listar todos os arquivos Excel
const files = fs.readdirSync(paraLerDir).filter(f => f.endsWith('.xlsx'));

console.log('🔍 Verificando status "Itens Apontados" em todas as planilhas...\n');
console.log('='.repeat(80));

const results = [];

files.forEach(fileName => {
  try {
    const workbook = XLSX.readFile(path.join(paraLerDir, fileName));
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const statusCount = {};
    let itensApontadosCount = 0;

    data.forEach(row => {
      const situacao = (row['Situação'] || row.Situação || row.Situacao || row.Status || '').toLowerCase().trim();
      const descricao = row['Pendência:'] || row.Descrição || row.Descricao || '';

      if (!descricao || descricao.trim() === '') {
        return;
      }

      if (situacao) {
        statusCount[situacao] = (statusCount[situacao] || 0) + 1;

        if (situacao.includes('itens') && situacao.includes('apontados')) {
          itensApontadosCount++;
        }
      }
    });

    if (itensApontadosCount > 0) {
      results.push({
        fileName,
        count: itensApontadosCount,
        allStatus: statusCount
      });
    }

  } catch (error) {
    console.log(`❌ Erro ao ler ${fileName}: ${error.message}`);
  }
});

console.log(`\n📋 Planilhas com "Itens Apontados":\n`);

if (results.length === 0) {
  console.log('❌ NENHUMA planilha tem status "Itens Apontados"!\n');
  console.log('Isso significa que:');
  console.log('  1. Todas as planilhas foram importadas corretamente, OU');
  console.log('  2. Nenhuma planilha original tinha esse status\n');
} else {
  results.forEach(result => {
    console.log(`\n📄 ${result.fileName}`);
    console.log(`   ✅ ${result.count} tickets com "Itens Apontados"`);
    console.log(`   Todos os status:`);
    Object.entries(result.allStatus).forEach(([status, count]) => {
      console.log(`      - ${status}: ${count}`);
    });
  });
}

console.log('\n' + '='.repeat(80) + '\n');
