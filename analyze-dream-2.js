const XLSX = require('xlsx');
const path = require('path');

// Ler o arquivo Excel
const workbook = XLSX.readFile('C:\\Users\\Ricardo Oliveira\\Downloads\\Chamados  Living Dream Panamby 2.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('\n📊 ANÁLISE DO DREAM PANAMBY 2\n');
console.log('Total de linhas:', data.length);
console.log('\n='.repeat(80));

// Contar por status
const statusCount = {};
let semStatus = 0;
let semDescricao = 0;

data.forEach((row, index) => {
  const situacao = row['Situação'] || row.Situação || row.Situacao || row.Status || '';
  const descricao = row['Pendência:'] || row.Descrição || row.Descricao || '';

  if (!descricao || descricao.trim() === '') {
    semDescricao++;
    return;
  }

  if (!situacao || situacao.trim() === '') {
    semStatus++;
  } else {
    const normalized = situacao.toLowerCase().trim();
    statusCount[normalized] = (statusCount[normalized] || 0) + 1;
  }
});

console.log('\n📋 CONTAGEM POR STATUS (na planilha Excel):');
console.log('='.repeat(80));
Object.entries(statusCount).sort().forEach(([status, count]) => {
  console.log(`   ${status}: ${count}`);
});

if (semStatus > 0) {
  console.log(`   (sem status/vazio): ${semStatus}`);
}

console.log('\n='.repeat(80));
console.log(`Total válido (com descrição): ${data.length - semDescricao}`);
console.log(`Sem descrição (pulados): ${semDescricao}`);

// Mostrar primeiras 5 linhas com "itens apontados"
console.log('\n📋 PRIMEIRAS LINHAS COM "ITENS APONTADOS":');
console.log('='.repeat(80));
let count = 0;
data.forEach((row, index) => {
  const situacao = (row['Situação'] || row.Situação || row.Situacao || row.Status || '').toLowerCase().trim();
  if (situacao.includes('itens') || situacao.includes('apontados')) {
    count++;
    if (count <= 5) {
      console.log(`\nLinha ${index + 2}:`);
      console.log(`   Situação: "${row['Situação'] || row.Situação || row.Situacao}"`);
      console.log(`   Descrição: ${(row['Pendência:'] || row.Descrição || '').substring(0, 50)}...`);
    }
  }
});
console.log(`\nTotal com "itens apontados": ${count}\n`);
