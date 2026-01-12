const XLSX = require('xlsx');

const workbook = XLSX.readFile('./para ler/Pasta 7.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

console.log('📊 Planilha:', sheetName);
console.log('');

// Ler primeira linha (cabeçalhos)
const jsonData = XLSX.utils.sheet_to_json(worksheet);

if (jsonData.length > 0) {
  console.log('📋 Colunas encontradas:');
  Object.keys(jsonData[0]).forEach((col, i) => {
    console.log(`  ${i + 1}. "${col}"`);
  });

  console.log('');
  console.log('📝 Primeira linha de dados (exemplo):');
  console.log(JSON.stringify(jsonData[0], null, 2));

  console.log('');
  console.log(`✅ Total de linhas: ${jsonData.length}`);
} else {
  console.log('❌ Planilha vazia!');
}
