// scripts/test-whatsapp-api.ts
import { sendPaymentReminder } from '../lib/whatsapp-service';

// Test avec un client fictif
async function testAPI() {
  console.log('🔧 Test de connexion à l\'API AiSensy...');
  console.log('⚠️ Le message ne sera pas réellement envoyé car le template n\'est pas encore approuvé');
  console.log('✅ Mais on vérifie que l\'API Key est valide\n');

  const testClient = {
    phone: '+21644150151', // Remplacez par VOTRE numéro
    name: 'TEST',
    totalDebt: 2000,
    paidAmount: 1300
  };

  const result = await sendPaymentReminder(testClient);
  
  if (result.success) {
    console.log('✅ Connexion API OK !');
    console.log('📝 Dès que le template sera approuvé, les messages partiront');
  } else {
    console.log('❌ Erreur de connexion:', result.error);
    console.log('💡 Vérifiez votre API Key dans .env.local');
  }
}

testAPI();