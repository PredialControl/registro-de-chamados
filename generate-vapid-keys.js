const webpush = require('web-push');

console.log('\n='.repeat(80));
console.log('GERANDO CHAVES VAPID PARA NOTIFICAÇÕES PUSH');
console.log('='.repeat(80));

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n📋 ADICIONE ESTAS VARIÁVEIS AO SEU ARQUIVO .env.local:\n');
console.log('='.repeat(80));
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('='.repeat(80));

console.log('\n⚠️  IMPORTANTE:');
console.log('   - A chave PÚBLICA (NEXT_PUBLIC_*) é enviada ao navegador');
console.log('   - A chave PRIVADA é usada APENAS no servidor');
console.log('   - NÃO compartilhe a chave privada publicamente');
console.log('   - Adicione .env.local ao .gitignore se ainda não estiver\n');
console.log('='.repeat(80) + '\n');
