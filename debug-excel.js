const XLSX = require('xlsx');
const path = require('path');

// Ler o arquivo Excel
const workbook = XLSX.readFile(path.join(__dirname, 'para ler', 'Chamados  Living Dream Panamby 1.xlsx'));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('\n📊 COMPARAÇÃO EXCEL vs APP\n');
console.log('Total de linhas:', data.length);
console.log('\n='.repeat(80));

// Mostrar primeiras 5 linhas
data.slice(0, 5).forEach((row, index) => {
  console.log(`\n📋 LINHA ${index + 2}:`);
  console.log('   Chamado:', row['Chamado '] || row.Chamado);
  console.log('   Pendência:', (row['Pendência:'] || row.Descrição || '').substring(0, 50) + '...');
  console.log('   Situação:', row['Situação'] || row.Situacao);

  // Datas RAW (como o Excel envia)
  console.log('\n   📅 ABERTURA:');
  console.log('      RAW:', row.Abertura, '(tipo:', typeof row.Abertura + ')');
  if (typeof row.Abertura === 'number') {
    const EXCEL_EPOCH_OFFSET = 25569;
    const MS_PER_DAY = 86400 * 1000;
    const unixTimestamp = (row.Abertura - EXCEL_EPOCH_OFFSET) * MS_PER_DAY;
    const date = new Date(unixTimestamp);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const adjustedDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    console.log('      Convertido:', `${day}/${month + 1}/${year}`);
    console.log('      ISO:', adjustedDate.toISOString());
  }

  console.log('\n   📅 PRAZO:');
  console.log('      RAW:', row.Prazo, '(tipo:', typeof row.Prazo + ')');
  console.log('      É undefined?', row.Prazo === undefined);
  console.log('      É null?', row.Prazo === null);
  console.log('      É string vazia?', row.Prazo === '');

  if (row.Prazo && typeof row.Prazo === 'number') {
    const EXCEL_EPOCH_OFFSET = 25569;
    const MS_PER_DAY = 86400 * 1000;
    const unixTimestamp = (row.Prazo - EXCEL_EPOCH_OFFSET) * MS_PER_DAY;
    const date = new Date(unixTimestamp);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const adjustedDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    console.log('      Convertido:', `${day}/${month + 1}/${year}`);
    console.log('      ISO:', adjustedDate.toISOString());
  } else {
    console.log('      ❌ VAZIO - deveria ficar vazio no app');
  }

  console.log('\n' + '='.repeat(80));
});

console.log('\n✅ Agora compare esses valores com o que aparece no app!');
console.log('   Se os prazos vazios estão aparecendo com data no app, o problema é no Supabase.\n');
