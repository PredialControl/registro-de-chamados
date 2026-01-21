const XLSX = require('xlsx');
const path = require('path');

const excelFileName = 'Chamados Maceió 88 (3).xlsx';

console.log(`📂 Lendo planilha: ${excelFileName}...`);

const workbook = XLSX.readFile(path.join(__dirname, 'para ler', excelFileName));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`📊 Total de linhas: ${data.length}\n`);

if (data.length > 0) {
  console.log('📋 Colunas disponíveis:');
  console.log(Object.keys(data[0]));
  console.log('\n📝 Primeira linha de exemplo:');
  console.log(JSON.stringify(data[0], null, 2));
  console.log('\n📝 Segunda linha de exemplo:');
  console.log(JSON.stringify(data[1], null, 2));
}
